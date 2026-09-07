import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository }    from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService }       from '@nestjs/config';
import * as crypto             from 'crypto';
import Redis                   from 'ioredis';
import { DepositMethod, MethodType, VerificationStatus } from '../entities/deposit-method.entity';
import { AuditService }       from '../audit/audit.service';
import { PayoutPublisher }    from '../publishers/payout.publisher';
import { PayoutError }        from '../common/errors/payout.error';
import { StripeProvider }     from '../providers/stripe.provider';

interface TokenResult { accessToken: string; refreshToken: string; expiresAt: Date; idToken?: string; }
interface ProfileResult { email: string; accountIdentifier: string; displayName: string; }
// PS-09 v2.0 §7: retrieved from the provider API after OAuth and registered
// as a Stripe external_account — this is what makes the Stripe ACH
// execution model (PS-32 §2) work without ever calling the provider's own
// Payouts API.
interface BankingDetailsResult { routingNumber: string; accountNumber: string; accountEmail: string; displayName: string; }

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  private readonly redis: Redis;
  private readonly encryptionKey: Buffer;
  private readonly stateTtl: number;

  private readonly providerConfig: Record<string, {
    apiBase: string; authUrl: string; tokenUrl: string; profileUrl: string;
    clientId: string; clientSecret: string; redirectUri: string; scopes: string;
  }>;

  constructor(
    @InjectRepository(DepositMethod)
    private readonly methodRepo: Repository<DepositMethod>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly publisher: PayoutPublisher,
    private readonly stripeProvider: StripeProvider,
  ) {
    const redisUrl = this.config.get('REDIS_URL', 'redis://localhost:6379');
    this.redis = new Redis(redisUrl);
    this.stateTtl = parseInt(this.config.get('OAUTH_STATE_TTL_SECONDS', '600'), 10);

    const keyHex = this.config.get('OAUTH_TOKEN_ENCRYPTION_KEY', '');
    this.encryptionKey = keyHex.length === 64 ? Buffer.from(keyHex, 'hex') : crypto.randomBytes(32);

    // PS-09 v2.0 §3/§12: base URL is env-driven so sandbox (local dev,
    // staging) and production point at different hosts without a code
    // change — previously hardcoded to production for Wise, which meant
    // sandbox credentials could never actually authorize.
    const wiseBase = this.config.get('WISE_API_BASE_URL', 'https://api.transferwise.com');
    const payoneerBase = this.config.get('PAYONEER_API_BASE_URL', 'https://api.payoneer.com');

    this.providerConfig = {
      WISE: {
        apiBase: wiseBase,
        authUrl: `${wiseBase}/oauth/authorize`,
        tokenUrl: `${wiseBase}/oauth/token`,
        profileUrl: `${wiseBase}/v2/me`,
        clientId: this.config.get('WISE_CLIENT_ID', ''),
        clientSecret: this.config.get('WISE_CLIENT_SECRET', ''),
        redirectUri: this.config.get('WISE_REDIRECT_URI', ''),
        scopes: 'transfers:read transfers:write balances:read',
      },
      PAYONEER: {
        apiBase: payoneerBase,
        authUrl: `${payoneerBase}/v2/oauth2/authorize`,
        tokenUrl: `${payoneerBase}/v2/oauth2/token`,
        profileUrl: `${payoneerBase}/v4/accounts/current`,
        clientId: this.config.get('PAYONEER_CLIENT_ID', ''),
        clientSecret: this.config.get('PAYONEER_CLIENT_SECRET', ''),
        redirectUri: this.config.get('PAYONEER_REDIRECT_URI', ''),
        scopes: 'read_transactions write_payments',
      },
    };
  }

  // ─── Build OAuth Authorization URL ────────────────────────────
  buildAuthUrl(methodType: string, nonce: string): string {
    const p = this.providerConfig[methodType];
    if (!p) throw new PayoutError('Unsupported OAuth provider.', HttpStatus.BAD_REQUEST, 'ERR_OAUTH_UNSUPPORTED');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: p.clientId,
      redirect_uri: p.redirectUri,
      scope: p.scopes,
      state: nonce,
    });
    return `${p.authUrl}?${params.toString()}`;
  }

  // Brand-cased provider names for user-facing labels. MethodType values are
  // uppercase enum keys ('WISE'), so interpolating them directly renders
  // "WISE (pending authorization)" on the deposit-method card. Mirrors the
  // same mapping in pause-status.service.ts.
  private static readonly PROVIDER_LABELS: Record<string, string> = {
    WISE: 'Wise',
    PAYONEER: 'Payoneer',
  };

  // ─── Initiate OAuth (create method + store state) ─────────────
  async initiateOAuth(contractorId: string, methodType: MethodType): Promise<{ depositMethodId: string; redirectUrl: string; provider: string; expiresAt: string }> {
    const activeCount = await this.methodRepo.count({ where: { contractorId, isActive: true } });
    if (activeCount >= 5) throw new PayoutError('Maximum 5 active deposit methods allowed.',
      HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_DEPOSIT_METHOD_LIMIT_REACHED');

    const method = await this.methodRepo.save({
      contractorId, methodType,
      verificationStatus: VerificationStatus.PENDING,
      isActive: true, isDefault: false,
      displayLabel: `${OAuthService.PROVIDER_LABELS[methodType] ?? methodType} (pending authorization)`,
    });

    const nonce = crypto.randomUUID();
    // Storing methodId here (not just contractorId/methodType) lets the
    // callback target this exact row deterministically — without it, two
    // pending attempts for the same contractor+provider (e.g. a retried
    // connect after a first attempt failed) are indistinguishable, and the
    // callback's "most recently created pending row" guess can attach a
    // completed OAuth grant to the wrong row, leaving the one just
    // authorized stuck pending forever.
    await this.redis.set(`state:${nonce}`,
      JSON.stringify({ contractorId, methodType, methodId: method.id }),
      'EX', this.stateTtl);

    const redirectUrl = this.buildAuthUrl(methodType, nonce);

    await this.auditService.log({
      contractorId, actorType: 'contractor', actorId: contractorId,
      action: 'method.added', metadata: { methodId: method.id, methodType, oauthInitiated: true },
    });

    return {
      depositMethodId: method.id, redirectUrl, provider: methodType,
      expiresAt: new Date(Date.now() + this.stateTtl * 1000).toISOString(),
    };
  }

  // ─── Handle OAuth Callback ────────────────────────────────────
  async handleCallback(provider: string, code: string, state: string): Promise<{ methodId: string; success: boolean }> {
    // 1. Validate state — check Redis first, then DB
    let contractorId: string, methodType: string, existingMethodId: string | undefined, isReauth = false;
    const raw = await this.redis.get(`state:${state}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      contractorId = parsed.contractorId;
      methodType = parsed.methodType;
      existingMethodId = parsed.methodId;
      isReauth = !!parsed.isReauth;
      await this.redis.del(`state:${state}`);
    } else {
      // Fallback: check deposit_method_verification table
      const verifyRow = await this.dataSource.query(
        `SELECT dmv.contractor_id, dm.method_type, dm.id as method_id
        FROM deposit_method_verification dmv
        JOIN deposit_methods dm ON dm.id = dmv.deposit_method_id
        WHERE dmv.oauth_state = $1 AND dmv.status = 'pending'
        LIMIT 1`, [state]);
      if (!verifyRow?.length) throw new PayoutError('Invalid or expired OAuth state.',
        HttpStatus.BAD_REQUEST, 'ERR_OAUTH_STATE_INVALID');
      contractorId = verifyRow[0].contractor_id;
      methodType = verifyRow[0].method_type;
      existingMethodId = verifyRow[0].method_id;
    }

    // Steps 2-3 can fail after initiateOAuth already created the pending
    // deposit_methods row (bad code, provider outage, identity-lookup
    // rejection). Without cleanup that row sits forever as an orphaned
    // "pending" entry — still counting against the 5-method cap and
    // blocking a legitimate retry — mirroring the same fix already applied
    // to the bank-verification path in methods.service.ts.
    try {
      // 2. Exchange code for tokens
      const tokens = await this.exchangeCode(provider, code);

      // 3. Fetch profile — prefer decoding an id_token if the provider's
      // grant returns one for an openid-scoped flow (no extra network call);
      // fall back to the userinfo call for providers/grants that don't
      // return one (WISE, PAYONEER).
      const profile = (tokens.idToken && this.decodeIdToken(tokens.idToken))
        || await this.fetchProfile(provider, tokens.accessToken);

      // 3b. PS-09 v2.0 §2/§7: retrieve the contractor's US routing + account
      // number from the provider API. This is the step that makes the
      // Stripe ACH execution model work — Marketeq never calls the
      // provider's own Payouts API to move money.
      const bankingDetails = await this.fetchBankingDetails(provider, tokens.accessToken);

      // 3c. PS-09 v2.0 §8: register the routing + account number as a
      // Stripe external_account on the contractor's Connect account. All
      // future payouts to this method go through Stripe, same as any other
      // ACH bank payout.
      const externalAccount = await this.stripeProvider.createExternalAccountFromRouting({
        contractorId, depositMethodId: existingMethodId!, routingNumber: bankingDetails.routingNumber,
        accountNumber: bankingDetails.accountNumber, accountHolderName: bankingDetails.displayName,
      });

      // 4. Encrypt tokens
      const encAccess = this.encrypt(tokens.accessToken);
      const encRefresh = this.encrypt(tokens.refreshToken);

      // 5. Find method — methodId is always present now (initiateOAuth
      // stores its own row's id, not just contractorId+methodType), so this
      // never has to guess among multiple pending rows for the same
      // contractor+provider.
      const method = existingMethodId
        ? await this.methodRepo.findOne({ where: { id: existingMethodId, contractorId } })
        : await this.methodRepo.findOne({
            where: { contractorId, methodType: methodType as MethodType, verificationStatus: VerificationStatus.PENDING },
            order: { createdAt: 'DESC' },
          });

      if (!method) throw new PayoutError('No pending method found.',
        HttpStatus.NOT_FOUND, 'ERR_DEPOSIT_METHOD_NOT_FOUND');

      // Same account already linked (e.g. a contractor re-connecting the
      // same provider email as an existing method, or a duplicate reauth) —
      // mirrors the ERR_DEPOSIT_METHOD_DUPLICATE check already used for
      // bank accounts in methods.service.ts, which the frontend already
      // maps to "This account is already linked."
      const existingWithEmail = await this.methodRepo.findOne({
        where: { contractorId, methodType: methodType as MethodType, accountEmail: profile.email, isActive: true },
      });
      if (existingWithEmail && existingWithEmail.id !== method.id) {
        throw new PayoutError('This account is already linked.',
          HttpStatus.CONFLICT, 'ERR_DEPOSIT_METHOD_DUPLICATE');
      }

      // 6. Update method — accountIdentifier is the last 4 digits of the
      // provider account number only (PS-09 §9: "Never store full account
      // number"); the full account number lives solely on the Stripe
      // external_account object created above.
      await this.methodRepo.update(method.id, {
        oauthAccessToken: encAccess,
        oauthRefreshToken: encRefresh,
        oauthTokenExpiresAt: tokens.expiresAt,
        accountEmail: profile.email,
        accountIdentifier: bankingDetails.accountNumber.slice(-4),
        routingNumber: bankingDetails.routingNumber,
        stripeExternalAccountId: externalAccount.externalAccountId,
        stripeConnectAccountId: externalAccount.connectAccountId,
        verificationStatus: VerificationStatus.VERIFIED,
        displayLabel: `${provider} (${profile.email})`,
        reauthRequired: false,
      } as any);

      await this.auditService.log({
        contractorId, actorType: 'contractor', actorId: contractorId,
        action: isReauth ? 'method.reauthorized' : 'method.verified',
        metadata: { methodId: method.id, provider, email: profile.email },
      });

      return { methodId: method.id, success: true };
    } catch (err) {
      // Only clean up on a fresh connect — a reauth failure must never
      // delete the contractor's existing, previously-working method.
      if (!isReauth && existingMethodId) {
        await this.methodRepo.delete({ id: existingMethodId, verificationStatus: VerificationStatus.PENDING } as any);
      }
      throw err;
    }
  }

  // ─── Reauthorize existing method ──────────────────────────────
  async reauthorize(contractorId: string, methodId: string): Promise<{ redirectUrl: string }> {
    const method = await this.methodRepo.findOne({
      where: { id: methodId, contractorId, isActive: true },
    });
    if (!method) throw new PayoutError('Method not found.',
      HttpStatus.NOT_FOUND, 'ERR_DEPOSIT_METHOD_NOT_FOUND');
    if (!(method as any).reauthRequired) throw new PayoutError(
      'Method does not require re-authorization.',
      HttpStatus.CONFLICT, 'ERR_REAUTH_NOT_REQUIRED');

    const nonce = crypto.randomUUID();
    await this.redis.set(`state:${nonce}`,
      JSON.stringify({ contractorId, methodType: method.methodType, methodId, isReauth: true }),
      'EX', this.stateTtl);

    return { redirectUrl: this.buildAuthUrl(method.methodType, nonce) };
  }

  // ─── Token refresh (called before payout execution) ───────────
  async ensureFreshToken(method: DepositMethod): Promise<string> {
    const now = new Date();
    const buffer = 5 * 60 * 1000;
    const expiresAt = (method as any).oauthTokenExpiresAt;

    if (expiresAt && expiresAt.getTime() - now.getTime() > buffer) {
      return this.decrypt((method as any).oauthAccessToken);
    }

    const refreshToken = this.decrypt((method as any).oauthRefreshToken);
    try {
      const refreshed = await this.refreshToken(method.methodType, refreshToken);
      await this.methodRepo.update(method.id, {
        oauthAccessToken: this.encrypt(refreshed.accessToken),
        oauthRefreshToken: refreshed.refreshToken
          ? this.encrypt(refreshed.refreshToken) : (method as any).oauthRefreshToken,
        oauthTokenExpiresAt: refreshed.expiresAt,
      } as any);
      return refreshed.accessToken;
    } catch {
      await this.applyReauthRequired(method);
      throw new PayoutError('Your connection needs to be re-authorized.',
        HttpStatus.UNAUTHORIZED, 'ERR_OAUTH_REAUTH_REQUIRED',
        { depositMethodId: method.id });
    }
  }

  // ─── Apply reauth required ────────────────────────────────────
  private async applyReauthRequired(method: DepositMethod): Promise<void> {
    await this.methodRepo.update(method.id, { reauthRequired: true } as any);
    await this.publisher.publishPayoutsPaused(method.contractorId, {
      reason: 'oauth_token_expired', depositMethodId: method.id, provider: method.methodType,
    });
    await this.auditService.log({
      contractorId: method.contractorId, actorType: 'service', actorId: 'payout-service',
      action: 'method.reauth_required',
      metadata: { depositMethodId: method.id, provider: method.methodType },
    });
  }

  // ─── Exchange authorization code for tokens ────────────────────
  // Real call to the provider's token endpoint — no provider ever returns a
  // successful response for a blank/placeholder client_id+secret, so this
  // fails cleanly (ERR_OAUTH_TOKEN_EXCHANGE_FAILED) for any provider whose
  // credentials aren't actually configured, rather than a silent fake success.
  private async exchangeCode(provider: string, code: string): Promise<TokenResult> {
    const p = this.providerConfig[provider];
    if (!p) throw new PayoutError('Unsupported OAuth provider.', HttpStatus.BAD_REQUEST, 'ERR_OAUTH_UNSUPPORTED');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: p.redirectUri,
    });
    const res = await fetch(p.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${p.clientId}:${p.clientSecret}`).toString('base64'),
      },
      body: body.toString(),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
      this.logger.error(`[${provider}] Token exchange failed: ${res.status} ${JSON.stringify(data)}`);
      throw new PayoutError('Unable to complete authorization with the provider.',
        HttpStatus.BAD_GATEWAY, 'ERR_OAUTH_TOKEN_EXCHANGE_FAILED');
    }
    this.logger.debug(`[${provider}] token exchange response keys: ${Object.keys(data).join(',')}`);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? '',
      expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
      idToken: data.id_token,
    };
  }

  // Decodes an id_token returned alongside the access token for any
  // `openid`-scoped grant, without a separate network call. Neither WISE nor
  // PAYONEER currently requests the openid scope, so this is a defensive
  // fallback only — kept in case a future OAuth provider's grant returns one
  // and its userinfo endpoint proves unreliable. The id_token is a JWT
  // delivered directly over the server-to-server TLS token exchange, so
  // decoding its payload without a second signature-verification round trip
  // is safe here.
  private decodeIdToken(idToken: string): ProfileResult | null {
    try {
      const payloadB64 = idToken.split('.')[1];
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      if (!payload.email) return null;
      return {
        email: payload.email,
        accountIdentifier: payload.payer_id ?? payload.sub ?? payload.email,
        displayName: payload.name ?? payload.email,
      };
    } catch {
      return null;
    }
  }

  // ─── Fetch the connected account's profile ─────────────────────
  private async fetchProfile(provider: string, accessToken: string): Promise<ProfileResult> {
    const p = this.providerConfig[provider];
    if (!p) throw new PayoutError('Unsupported OAuth provider.', HttpStatus.BAD_REQUEST, 'ERR_OAUTH_UNSUPPORTED');

    const res = await fetch(p.profileUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.logger.error(`[${provider}] Profile fetch failed: ${res.status} ${JSON.stringify(data)}`);
      throw new PayoutError('Unable to retrieve your account details from the provider.',
        HttpStatus.BAD_GATEWAY, 'ERR_OAUTH_PROFILE_FETCH_FAILED');
    }
    // Field names vary by provider — try the shapes each documents rather
    // than assuming one schema. Never fabricate a placeholder email if none
    // of these are present; a missing email is a real integration problem
    // that should surface as an error, not silently invented data.
    const email = data.email ?? data.emails?.[0]?.value ?? data.primaryEmail ?? null;
    if (!email) {
      this.logger.error(`[${provider}] Profile response had no recognizable email field: ${JSON.stringify(data)}`);
      throw new PayoutError('Unable to retrieve your account details from the provider.',
        HttpStatus.BAD_GATEWAY, 'ERR_OAUTH_PROFILE_FETCH_FAILED');
    }
    return {
      email,
      accountIdentifier: data.user_id ?? data.id ?? data.sub ?? email,
      displayName: data.name ?? email,
    };
  }

  // ─── PS-09 v2.0 §7: Fetch the contractor's US routing + account number
  // from the provider API ─────────────────────────────────────────
  // This is the step that makes the Stripe ACH execution model work.
  // Marketeq does NOT call wise.com/v3/transfers or payoneer.com/v4/payments
  // to send money — the OAuth token is used only to retrieve these details,
  // which are then registered as a Stripe external_account (§8). Only the
  // last 4 digits of accountNumber are ever persisted (handleCallback).
  async fetchBankingDetails(provider: string, accessToken: string): Promise<BankingDetailsResult> {
    if (provider === 'WISE') return this.fetchWiseBankingDetails(accessToken);
    if (provider === 'PAYONEER') return this.fetchPayoneerBankingDetails(accessToken);
    throw new PayoutError('Unsupported OAuth provider.', HttpStatus.BAD_REQUEST, 'ERR_OAUTH_UNSUPPORTED');
  }

  private async fetchWiseBankingDetails(accessToken: string): Promise<BankingDetailsResult> {
    const base = this.providerConfig.WISE.apiBase;

    // Step 1: the contractor's Wise personal profile ID + email.
    const profileRes = await fetch(`${base}/v2/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) {
      this.logger.error(`[WISE] Profile fetch failed: ${profileRes.status}`);
      throw new PayoutError('Failed to fetch Wise profile.',
        HttpStatus.BAD_GATEWAY, 'ERR_OAUTH_PROFILE_FETCH_FAILED');
    }
    const profile: any = await profileRes.json();

    // Step 2: the USD balance under this profile — Wise issues each account
    // holder a US routing number + account number here. These are the
    // details Stripe will ACH to.
    const accountRes = await fetch(`${base}/v1/borderless-accounts?profileId=${profile.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!accountRes.ok) {
      this.logger.error(`[WISE] Borderless account fetch failed: ${accountRes.status}`);
      throw new PayoutError('Failed to fetch Wise account details.',
        HttpStatus.BAD_GATEWAY, 'ERR_OAUTH_PROFILE_FETCH_FAILED');
    }
    const accounts: any[] = await accountRes.json();

    const usdAccount = accounts
      .flatMap((a: any) => a.balances ?? [])
      .find((b: any) => b.currency === 'USD' && b.bankDetails?.routingNumber);

    if (!usdAccount?.bankDetails?.routingNumber) {
      throw new PayoutError(
        'This Wise account does not have a US USD account with routing details. ' +
        'The contractor must add a USD balance in their Wise account first.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_WISE_NO_USD_ACCOUNT');
    }

    return {
      routingNumber: usdAccount.bankDetails.routingNumber,
      accountNumber: usdAccount.bankDetails.accountNumber,
      accountEmail: profile.email,
      displayName: `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || profile.email,
    };
  }

  private async fetchPayoneerBankingDetails(accessToken: string): Promise<BankingDetailsResult> {
    const base = this.providerConfig.PAYONEER.apiBase;

    // Step 1: the contractor's Payoneer account details.
    const accountRes = await fetch(`${base}/v4/accounts/current`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!accountRes.ok) {
      this.logger.error(`[PAYONEER] Account fetch failed: ${accountRes.status}`);
      throw new PayoutError('Failed to fetch Payoneer account details.',
        HttpStatus.BAD_GATEWAY, 'ERR_OAUTH_PROFILE_FETCH_FAILED');
    }
    const account: any = await accountRes.json();

    // Step 2: the US receiving account — Payoneer issues a US ACH routing
    // number + account number through its partner bank (Community Federal
    // Savings Bank or First Century Bank).
    const receivingRes = await fetch(`${base}/v4/accounts/current/payment-methods/bank-accounts`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!receivingRes.ok) {
      this.logger.error(`[PAYONEER] Receiving-account fetch failed: ${receivingRes.status}`);
      throw new PayoutError('Failed to fetch Payoneer receiving accounts.',
        HttpStatus.BAD_GATEWAY, 'ERR_OAUTH_PROFILE_FETCH_FAILED');
    }
    const receivingAccounts: any = await receivingRes.json();

    const usdAccount = (receivingAccounts?.items ?? []).find(
      (a: any) => a.currency === 'USD' && a.routingNumber,
    );

    if (!usdAccount?.routingNumber) {
      throw new PayoutError(
        'This Payoneer account does not have a US USD receiving account. ' +
        'The contractor must set up a USD receiving account in Payoneer first.',
        HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_PAYONEER_NO_USD_ACCOUNT');
    }

    return {
      routingNumber: usdAccount.routingNumber,
      accountNumber: usdAccount.accountNumber,
      accountEmail: account.email,
      displayName: `${account.firstName ?? ''} ${account.lastName ?? ''}`.trim() || account.email,
    };
  }

  // ─── Refresh an expired access token ───────────────────────────
  private async refreshToken(methodType: string, refreshToken: string): Promise<TokenResult> {
    const p = this.providerConfig[methodType];
    if (!p) throw new PayoutError('Unsupported OAuth provider.', HttpStatus.BAD_REQUEST, 'ERR_OAUTH_UNSUPPORTED');

    const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken });
    const res = await fetch(p.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${p.clientId}:${p.clientSecret}`).toString('base64'),
      },
      body: body.toString(),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
      this.logger.error(`[${methodType}] Token refresh failed: ${res.status} ${JSON.stringify(data)}`);
      throw new PayoutError('Unable to refresh authorization with the provider.',
        HttpStatus.BAD_GATEWAY, 'ERR_OAUTH_TOKEN_REFRESH_FAILED');
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
    };
  }

  // ─── Encryption ───────────────────────────────────────────────
  private encrypt(plaintext: string): string {
    if (!plaintext) return '';
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`;
  }

  private decrypt(stored: string): string {
    if (!stored || !stored.includes(':')) return stored;
    const [ivHex, tagHex, ctHex] = stored.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return decipher.update(Buffer.from(ctHex, 'hex'), undefined, 'utf8') + decipher.final('utf8');
  }
}
