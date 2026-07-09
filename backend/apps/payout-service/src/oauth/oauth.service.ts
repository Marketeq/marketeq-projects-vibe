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

interface TokenResult { accessToken: string; refreshToken: string; expiresAt: Date; }
interface ProfileResult { email: string; accountIdentifier: string; displayName: string; }

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  private readonly redis: Redis;
  private readonly encryptionKey: Buffer;
  private readonly stateTtl: number;

  private readonly providerConfig: Record<string, {
    authUrl: string; tokenUrl: string; profileUrl: string;
    clientId: string; clientSecret: string; redirectUri: string; scopes: string;
  }>;

  constructor(
    @InjectRepository(DepositMethod)
    private readonly methodRepo: Repository<DepositMethod>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly publisher: PayoutPublisher,
  ) {
    const redisUrl = this.config.get('REDIS_URL', 'redis://localhost:6379');
    this.redis = new Redis(redisUrl);
    this.stateTtl = parseInt(this.config.get('OAUTH_STATE_TTL_SECONDS', '600'), 10);

    const keyHex = this.config.get('OAUTH_TOKEN_ENCRYPTION_KEY', '');
    this.encryptionKey = keyHex.length === 64 ? Buffer.from(keyHex, 'hex') : crypto.randomBytes(32);

    const mode = this.config.get('PAYPAL_MODE', 'sandbox');
    const ppBase = mode === 'live' ? 'https://www.paypal.com' : 'https://www.sandbox.paypal.com';
    const ppApi = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

    this.providerConfig = {
      PAYPAL: {
        authUrl: `${ppBase}/signin/authorize`,
        tokenUrl: `${ppApi}/v1/oauth2/token`,
        profileUrl: `${ppApi}/v1/identity/oauth2/userinfo?schema=paypalv1.1`,
        clientId: this.config.get('PAYPAL_CLIENT_ID', ''),
        clientSecret: this.config.get('PAYPAL_CLIENT_SECRET', ''),
        redirectUri: this.config.get('PAYPAL_REDIRECT_URI', ''),
        scopes: this.config.get('PAYPAL_SCOPES', 'openid email'),
      },
      WISE: {
        authUrl: 'https://api.transferwise.com/oauth/authorize',
        tokenUrl: 'https://api.transferwise.com/oauth/token',
        profileUrl: 'https://api.transferwise.com/v2/me',
        clientId: this.config.get('WISE_CLIENT_ID', ''),
        clientSecret: this.config.get('WISE_CLIENT_SECRET', ''),
        redirectUri: this.config.get('WISE_REDIRECT_URI', ''),
        scopes: 'transfers:read transfers:write balances:read',
      },
      PAYONEER: {
        authUrl: 'https://api.payoneer.com/v2/oauth2/authorize',
        tokenUrl: 'https://api.payoneer.com/v2/oauth2/token',
        profileUrl: 'https://api.payoneer.com/v4/accounts/current',
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

  // ─── Initiate OAuth (create method + store state) ─────────────
  async initiateOAuth(contractorId: string, methodType: MethodType): Promise<{ depositMethodId: string; redirectUrl: string; provider: string }> {
    const activeCount = await this.methodRepo.count({ where: { contractorId, isActive: true } });
    if (activeCount >= 5) throw new PayoutError('Maximum 5 active deposit methods allowed.',
      HttpStatus.UNPROCESSABLE_ENTITY, 'ERR_DEPOSIT_METHOD_LIMIT_REACHED');

    const nonce = crypto.randomUUID();
    await this.redis.set(`state:${nonce}`,
      JSON.stringify({ contractorId, methodType }),
      'EX', this.stateTtl);

    const method = await this.methodRepo.save({
      contractorId, methodType,
      verificationStatus: VerificationStatus.PENDING,
      isActive: true, isDefault: false,
      displayLabel: `${methodType} (pending authorization)`,
    });

    const redirectUrl = this.buildAuthUrl(methodType, nonce);

    await this.auditService.log({
      contractorId, actorType: 'contractor', actorId: contractorId,
      action: 'method.added', metadata: { methodId: method.id, methodType, oauthInitiated: true },
    });

    return { depositMethodId: method.id, redirectUrl, provider: methodType };
  }

  // ─── Handle OAuth Callback ────────────────────────────────────
  async handleCallback(provider: string, code: string, state: string): Promise<{ methodId: string; success: boolean }> {
    // 1. Validate state — check Redis first, then DB
    let contractorId: string, methodType: string, existingMethodId: string | undefined;
    const raw = await this.redis.get(`state:${state}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      contractorId = parsed.contractorId;
      methodType = parsed.methodType;
      existingMethodId = parsed.methodId;
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

    // 2. Exchange code for tokens (stubbed for dev — real impl calls provider)
    const tokens = await this.exchangeCode(provider, code);

    // 3. Fetch profile (stubbed for dev)
    const profile = await this.fetchProfile(provider, tokens.accessToken);

    // 4. Encrypt tokens
    const encAccess = this.encrypt(tokens.accessToken);
    const encRefresh = this.encrypt(tokens.refreshToken);

    // 5. Find method — either existing (reauth) or pending new
    const method = existingMethodId
      ? await this.methodRepo.findOne({ where: { id: existingMethodId, contractorId } })
      : await this.methodRepo.findOne({
          where: { contractorId, methodType: methodType as MethodType, verificationStatus: VerificationStatus.PENDING },
          order: { createdAt: 'DESC' },
        });

    if (!method) throw new PayoutError('No pending method found.',
      HttpStatus.NOT_FOUND, 'ERR_DEPOSIT_METHOD_NOT_FOUND');

    // 6. Update method
    await this.methodRepo.update(method.id, {
      oauthAccessToken: encAccess,
      oauthRefreshToken: encRefresh,
      oauthTokenExpiresAt: tokens.expiresAt,
      accountEmail: profile.email,
      accountIdentifier: profile.accountIdentifier,
      verificationStatus: VerificationStatus.VERIFIED,
      displayLabel: `${provider} (${profile.email})`,
      reauthRequired: false,
    } as any);

    await this.auditService.log({
      contractorId, actorType: 'contractor', actorId: contractorId,
      action: existingMethodId ? 'method.reauthorized' : 'method.verified',
      metadata: { methodId: method.id, provider, email: profile.email },
    });

    return { methodId: method.id, success: true };
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
      JSON.stringify({ contractorId, methodType: method.methodType, methodId }),
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

  // ─── Stub: Exchange code for tokens ───────────────────────────
  private async exchangeCode(provider: string, code: string): Promise<TokenResult> {
    // In production: POST to provider's token endpoint
    this.logger.warn(`[DEV] Token exchange stubbed for ${provider}`);
    return {
      accessToken: `mock_access_${provider}_${Date.now()}`,
      refreshToken: `mock_refresh_${provider}_${Date.now()}`,
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
    };
  }

  // ─── Stub: Fetch profile ──────────────────────────────────────
  private async fetchProfile(provider: string, accessToken: string): Promise<ProfileResult> {
    this.logger.warn(`[DEV] Profile fetch stubbed for ${provider}`);
    return {
      email: `contractor@${provider.toLowerCase()}.example.com`,
      accountIdentifier: `mock_${provider}_${Date.now()}`,
      displayName: 'Test Contractor',
    };
  }

  // ─── Stub: Refresh token ──────────────────────────────────────
  private async refreshToken(methodType: string, refreshToken: string): Promise<TokenResult> {
    this.logger.warn(`[DEV] Token refresh stubbed for ${methodType}`);
    return {
      accessToken: `mock_refreshed_${methodType}_${Date.now()}`,
      refreshToken: null as any,
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
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
