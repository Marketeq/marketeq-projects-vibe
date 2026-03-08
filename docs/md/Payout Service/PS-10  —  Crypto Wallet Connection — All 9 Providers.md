**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-10 --- Crypto Wallet Connection --- All 9 Providers

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-10 --- Crypto Wallet Connection --- All 9
                      Providers

  **Version**         1.0

  **Applies to**      CRYPTO method type in deposit_methods

  **Providers**       Ramp Network, Transak, Crypto.com, Coinbase,
                      MetaMask, Ledger, Trezor, Kraken, Binance

  **Connection        Manual address entry, WalletConnect QR (5-min TTL),
  methods**           paste WalletConnect URI

  **Address           Per-network regex. Checksummed EVM addresses
  validation**        normalized to EIP-55.

  **Conversion        fawazahmed0/exchange-api (same instance as
  display**           earnings-service). Redis cache 15-min TTL.

  **Prerequisites**   PS-01, PS-04, ES-06
  -----------------------------------------------------------------------

# **1. Overview**

Crypto wallet connection links a contractor\'s self-custody wallet
address to their payout-service deposit method. Marketeq does not
custody crypto on behalf of contractors --- payouts are sent directly to
the wallet address on file. Three connection paths exist: manual address
entry (all providers), WalletConnect QR code (providers that support
WalletConnect v2), and paste WalletConnect URI (same providers as QR).
Provider selection determines which networks and tokens are supported,
and influences which connection methods are available.

+-----------------------------------------------------------------------+
| **Marketeq does not hold crypto**                                     |
|                                                                       |
| Crypto payouts are outbound transfers from Marketeq\'s treasury       |
| wallet to the contractor\'s address.                                  |
|                                                                       |
| Marketeq does not hold contractor earnings in crypto at any point.    |
|                                                                       |
| Earnings are always held in USD internally. At payout execution time, |
| the USD amount is                                                     |
|                                                                       |
| converted to crypto via the provider\'s on-ramp API and sent to the   |
| contractor\'s wallet.                                                 |
|                                                                       |
| The conversion rate used at execution is the live rate from the       |
| provider --- not the display                                          |
|                                                                       |
| rate from fawazahmed0. The fawazahmed0 rate is for display purposes   |
| only.                                                                 |
+=======================================================================+

# **2. Provider Matrix**

  -----------------------------------------------------------------------------------------------------
  **Provider**     **Supported   **Fee range**  **Manual    **WalletConnect   **Paste   **Notes**
                   tokens**                     address**   QR**              URI**     
  ---------------- ------------- -------------- ----------- ----------------- --------- ---------------
  **Ramp Network** BTC, ETH,     0.49--2.9% +   Yes         No                No        Ramp uses its
                   USDC          network fee                                            own widget ---
                                                                                        no
                                                                                        WalletConnect
                                                                                        support

  **Transak**      100+ tokens   0.5--1.5% +    Yes         Yes               Yes       WalletConnect
                                 network fee                                            v2

  **Crypto.com**   100+ tokens   0.5--1.5% +    Yes         Yes               Yes       WalletConnect
                                 network fee                                            v2

  **Coinbase**     BTC, ETH,     1.49% +        Yes         Yes               Yes       Coinbase Wallet
                   USDC          network fee                                            supports
                                                                                        WalletConnect
                                                                                        v2

  **MetaMask**     ETH + EVM     1.49% +        Yes         Yes               Yes       EVM networks
                   tokens        network fee                                            only.
                                                                                        WalletConnect
                                                                                        v2.

  **Ledger**       BTC, ETH,     1.49% +        Yes         Yes               Yes       Hardware wallet
                   USDC          network fee                                            ---
                                                                                        WalletConnect
                                                                                        v2 via Ledger
                                                                                        Live

  **Trezor**       BTC, ETH,     1.49% +        Yes         No                No        Trezor does not
                   USDC          network fee                                            support
                                                                                        WalletConnect

  **Kraken**       BTC, ETH      0.9% + network Yes         No                No        Kraken uses
                                 fee                                                    direct address
                                                                                        deposit only

  **Binance**      BTC, ETH,     0--0.1% + P2P  Yes         Yes               Yes       Binance Web3
                   USDT          margin                                                 Wallet supports
                                                                                        WalletConnect
                                                                                        v2
  -----------------------------------------------------------------------------------------------------

# **3. Environment Variables**

  -------------------------------------------------------------------------------------
  **Variable**                              **Description**
  ----------------------------------------- -------------------------------------------
  **WALLETCONNECT_PROJECT_ID**              WalletConnect Cloud project ID --- required
                                            for WalletConnect v2 sessions

  **WALLETCONNECT_SESSION_TTL_SECONDS**     QR code / session TTL. Default 300 (5
                                            minutes).

  **CRYPTO_ADDRESS_ENCRYPTION_KEY**         AES-256-GCM key for encrypting stored
                                            wallet addresses

  **CRYPTO_CONVERSION_CACHE_TTL_SECONDS**   Redis TTL for fawazahmed0 conversion rates.
                                            Default 900 (15 minutes).

  **FAWAZAHMED0_API_BASE**                  Self-hosted fawazahmed0 exchange API base
                                            URL (shared with earnings-service)
  -------------------------------------------------------------------------------------

# **4. Connection Method 1 --- Manual Address Entry**

## **4.1 Flow**

  ---------------------------------------------------------------------------------
  **Step**   **Actor**    **Action**
  ---------- ------------ ---------------------------------------------------------
  **1**      Contractor   Selects provider. Selects \"Enter your wallet address\".

  **2**      Contractor   Enters wallet address in input field. Accepts
                          authorization checkbox.

  **3**      Backend      POST /v1/deposit-methods with methodType=CRYPTO,
                          provider, walletAddress, network.

  **4**      Backend      Validates address format for stated network. Normalizes
                          EVM addresses to EIP-55 checksum.

  **5**      Backend      Stores method as verified immediately --- no on-chain
                          confirmation required.

  **6**      Backend      Fetches conversion rate from fawazahmed0 for the primary
                          token of the stated network.

  **7**      Frontend     Shows success with wallet address (masked) and live
                          conversion value.
  ---------------------------------------------------------------------------------

## **4.2 Request body**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| POST /v1/deposit-methods                                              |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"methodType\": \"CRYPTO\",                                           |
|                                                                       |
| \"cryptoProvider\": \"METAMASK\", // see provider enum below          |
|                                                                       |
| \"walletAddress\": \"0xAbCd\...1234\",                                |
|                                                                       |
| \"network\": \"ethereum\", // see network enum below                  |
|                                                                       |
| \"token\": \"ETH\" // primary token for display conversion            |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Response 201                                                       |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"depositMethodId\": \"uuid\",                                        |
|                                                                       |
| \"verificationStatus\": \"verified\",                                 |
|                                                                       |
| \"walletAddressLast6\": \"\...1234\",                                 |
|                                                                       |
| \"network\": \"ethereum\",                                            |
|                                                                       |
| \"token\": \"ETH\",                                                   |
|                                                                       |
| \"conversionDisplay\": \"1 ETH ≈ \$3,400\"                            |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **5. Connection Method 2 --- WalletConnect QR Code**

## **5.1 Flow**

  ------------------------------------------------------------------------------------
  **Step**   **Actor**       **Action**
  ---------- --------------- ---------------------------------------------------------
  **1**      Contractor      Selects provider that supports WalletConnect. Selects
                             \"Scan QR code from your wallet app\".

  **2**      Backend         POST /v1/deposit-methods/crypto/walletconnect-session ---
                             creates WalletConnect v2 session, returns QR URI and
                             sessionId.

  **3**      Frontend        Renders QR code from URI. Starts 5-minute countdown.

  **4**      Contractor      Opens wallet app. Navigates to deposit/receive. Scans QR
                             code. Approves connection request in wallet app.

  **5**      WalletConnect   Relays approval to backend via WebSocket or webhook.
             relay           

  **6**      Backend         Extracts wallet address from WalletConnect session
                             approval payload. Validates address. Stores method.

  **7**      Frontend        Polling GET
                             /v1/deposit-methods/crypto/walletconnect-session/:id
                             detects status=connected. Shows success.
  ------------------------------------------------------------------------------------

## **5.2 Session initiation**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // POST /v1/deposit-methods/crypto/walletconnect-session              |
|                                                                       |
| // Request                                                            |
|                                                                       |
| { \"cryptoProvider\": \"METAMASK\", \"network\": \"ethereum\" }       |
|                                                                       |
| // Response 201                                                       |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"sessionId\": \"wc_uuid\",                                           |
|                                                                       |
| \"wcUri\": \"wc:1234abcd\...@2?relay-protocol=irn&symKey=\...\",      |
|                                                                       |
| \"expiresAt\": \"2025-06-11T10:05:00Z\" // +5 minutes                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Frontend renders wcUri as QR code using                            |
| \@walletconnect/qrcode-modal or custom QR lib                         |
|                                                                       |
| // Frontend polls GET                                                 |
| /v1/deposit-methods/crypto/walletconnect-session/{sessionId}          |
|                                                                       |
| // Poll response --- pending                                          |
|                                                                       |
| { \"status\": \"pending\", \"expiresAt\": \"\...\" }                  |
|                                                                       |
| // Poll response --- connected                                        |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"status\": \"connected\",                                            |
|                                                                       |
| \"depositMethodId\": \"uuid\",                                        |
|                                                                       |
| \"walletAddressLast6\": \"\...9u5M\",                                 |
|                                                                       |
| \"conversionDisplay\": \"1 ETH ≈ \$3,400\"                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Poll response --- expired                                          |
|                                                                       |
| { \"status\": \"expired\" }                                           |
+=======================================================================+

## **5.3 Session service logic**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| async createWalletConnectSession(                                     |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| dto: { cryptoProvider: CryptoProvider; network: string },             |
|                                                                       |
| ): Promise\<{ sessionId: string; wcUri: string; expiresAt: Date }\> { |
|                                                                       |
| const ttl = parseInt(process.env.WALLETCONNECT_SESSION_TTL_SECONDS ?? |
| \'300\');                                                             |
|                                                                       |
| const expiresAt = new Date(Date.now() + ttl \* 1000);                 |
|                                                                       |
| const sessionId = crypto.randomUUID();                                |
|                                                                       |
| // Build WalletConnect v2 URI (project ID from env)                   |
|                                                                       |
| // In production this uses \@walletconnect/sign-client or Web3Modal   |
| server SDK                                                            |
|                                                                       |
| const wcUri = await this.walletConnectClient.createSession({          |
|                                                                       |
| projectId: process.env.WALLETCONNECT_PROJECT_ID!,                     |
|                                                                       |
| chains: \[this.chainIdForNetwork(dto.network)\],                      |
|                                                                       |
| methods: \[\'eth_sendTransaction\', \'personal_sign\'\],              |
|                                                                       |
| events: \[\'chainChanged\', \'accountsChanged\'\],                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Store session state in Redis                                       |
|                                                                       |
| await this.redis.set(                                                 |
|                                                                       |
| \`wcsession:\${sessionId}\`,                                          |
|                                                                       |
| JSON.stringify({ contractorId, \...dto, wcUri, status: \'pending\'    |
| }),                                                                   |
|                                                                       |
| \'EX\', ttl,                                                          |
|                                                                       |
| );                                                                    |
|                                                                       |
| return { sessionId, wcUri, expiresAt };                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Called by WalletConnect relay webhook when contractor approves     |
|                                                                       |
| async handleWalletConnectApproval(                                    |
|                                                                       |
| topic: string,                                                        |
|                                                                       |
| address: string,                                                      |
|                                                                       |
| chainId: string,                                                      |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| // Find session by WC topic                                           |
|                                                                       |
| const sessionId = await this.redis.get(\`wctopic:\${topic}\`);        |
|                                                                       |
| if (!sessionId) return; // expired or unknown --- silently discard    |
|                                                                       |
| const raw = await this.redis.get(\`wcsession:\${sessionId}\`);        |
|                                                                       |
| if (!raw) return;                                                     |
|                                                                       |
| const session = JSON.parse(raw);                                      |
|                                                                       |
| const network = this.networkForChainId(chainId);                      |
|                                                                       |
| this.validateAddress(address, network); // throws on invalid          |
|                                                                       |
| const method = await this.createCryptoMethod({                        |
|                                                                       |
| contractorId: session.contractorId,                                   |
|                                                                       |
| cryptoProvider: session.cryptoProvider,                               |
|                                                                       |
| walletAddress: address,                                               |
|                                                                       |
| network,                                                              |
|                                                                       |
| token: this.primaryTokenForNetwork(network),                          |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Update session state so frontend poll detects completion           |
|                                                                       |
| await this.redis.set(                                                 |
|                                                                       |
| \`wcsession:\${sessionId}\`,                                          |
|                                                                       |
| JSON.stringify({ \...session, status: \'connected\', depositMethodId: |
| method.id }),                                                         |
|                                                                       |
| \'EX\', 60, // keep for 60s so in-flight polls can read it            |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **WalletConnect QR TTL is 5 minutes**                                 |
|                                                                       |
| If the contractor does not scan the QR code within 5 minutes, the     |
| session expires.                                                      |
|                                                                       |
| The frontend shows the countdown timer. On expiry: session status →   |
| expired.                                                              |
|                                                                       |
| The contractor must click \"Try Again\" --- backend generates a new   |
| session and new QR URI.                                               |
|                                                                       |
| An expired QR must never be reused --- it will not be accepted by the |
| WalletConnect relay.                                                  |
+=======================================================================+

# **6. Connection Method 3 --- Paste WalletConnect URI**

Paste URI is functionally identical to QR code --- the same
WalletConnect session is created on the backend, and the wcUri is shown
as text instead of rendered as a QR code. The contractor copies the URI
from the UI and pastes it into their wallet app\'s \"Connect via
WalletConnect\" field. Session creation, approval handling, and polling
are identical to §5.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Same endpoint: POST                                                |
| /v1/deposit-methods/crypto/walletconnect-session                      |
|                                                                       |
| // Same response --- frontend uses wcUri as text instead of rendering |
| QR                                                                    |
|                                                                       |
| // No backend difference between QR and paste --- connection method   |
| is a frontend UX choice only                                          |
+=======================================================================+

# **7. Address Format Validation by Network**

  -------------------------------------------------------------------------------------------------------------------
  **Network**    **Token(s)**   **Address        **Validation regex**                             **Normalization**
                                format**                                                          
  -------------- -------------- ---------------- ------------------------------------------------ -------------------
  **ethereum**   ETH, USDC      0x + 40 hex      \`/\^0x\[0-9a-fA-F\]{40}\$/\`                    EIP-55 checksum
                 (ERC-20)       chars                                                             normalization via
                                                                                                  ethers.js
                                                                                                  getAddress()

  **bitcoin**    BTC            Base58           P2PKH: \`/\^\[13\]\[a-zA-Z1-9\]{25,34}\$/\`      Lowercase Bech32.
                                (P2PKH/P2SH) or  Bech32: \`/\^bc1\[ac-hj-np-z02-9\]{6,87}\$/\`    Base58 preserved
                                Bech32                                                            as-is.
                                (P2WPKH/P2WSH)                                                    

  **polygon**    ETH, USDC      Same as ethereum \`/\^0x\[0-9a-fA-F\]{40}\$/\`                    EIP-55 checksum
                                (EVM)                                                             

  **bsc**        BNB, USDT      Same as ethereum \`/\^0x\[0-9a-fA-F\]{40}\$/\`                    EIP-55 checksum
                 (BEP-20)       (EVM)                                                             

  **solana**     SOL, USDC      Base58, 32--44   \`/\^\[1-9A-HJ-NP-Za-km-z\]{32,44}\$/\`          No normalization
                 (SPL)          chars                                                             --- case-sensitive

  **tron**       USDT (TRC-20)  T + Base58, 34   \`/\^T\[1-9A-HJ-NP-Za-km-z\]{33}\$/\`            Preserved as-is
                                chars                                                             

  **litecoin**   LTC            L/M prefix       \`/\^\[LM3\]\[a-km-zA-HJ-NP-Z1-9\]{26,33}\$/\`   Lowercase Bech32
                                Base58 or ltc1   or \`/\^ltc1\[ac-hj-np-z02-9\]{6,87}\$/\`        
                                Bech32                                                            
  -------------------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/crypto/address-validator.service.ts                            |
|                                                                       |
| import { ethers } from \'ethers\';                                    |
|                                                                       |
| validateAddress(address: string, network: string): string {           |
|                                                                       |
| switch (network) {                                                    |
|                                                                       |
| case \'ethereum\':                                                    |
|                                                                       |
| case \'polygon\':                                                     |
|                                                                       |
| case \'bsc\': {                                                       |
|                                                                       |
| if (!/\^0x\[0-9a-fA-F\]{40}\$/.test(address))                         |
|                                                                       |
| throw new PayoutError(\`Invalid \${network} address format.\`,        |
|                                                                       |
| HttpStatus.UNPROCESSABLE_ENTITY, \'ERR_CRYPTO_ADDRESS_INVALID\',      |
|                                                                       |
| { network, address: address.slice(0, 10) + \'\...\' });               |
|                                                                       |
| // Normalize to EIP-55 checksum --- ethers.js handles this            |
|                                                                       |
| return ethers.utils.getAddress(address);                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| case \'bitcoin\': {                                                   |
|                                                                       |
| const p2pkh = /\^\[13\]\[a-zA-Z1-9\]{25,34}\$/;                       |
|                                                                       |
| const bech32 = /\^bc1\[ac-hj-np-z02-9\]{6,87}\$/;                     |
|                                                                       |
| if (!p2pkh.test(address) && !bech32.test(address))                    |
|                                                                       |
| throw new PayoutError(\'Invalid Bitcoin address format.\',            |
|                                                                       |
| HttpStatus.UNPROCESSABLE_ENTITY, \'ERR_CRYPTO_ADDRESS_INVALID\',      |
|                                                                       |
| { network, address: address.slice(0, 10) + \'\...\' });               |
|                                                                       |
| return bech32.test(address) ? address.toLowerCase() : address;        |
|                                                                       |
| }                                                                     |
|                                                                       |
| case \'solana\': {                                                    |
|                                                                       |
| if (!/\^\[1-9A-HJ-NP-Za-km-z\]{32,44}\$/.test(address))               |
|                                                                       |
| throw new PayoutError(\'Invalid Solana address format.\',             |
|                                                                       |
| HttpStatus.UNPROCESSABLE_ENTITY, \'ERR_CRYPTO_ADDRESS_INVALID\',      |
|                                                                       |
| { network, address: address.slice(0, 10) + \'\...\' });               |
|                                                                       |
| return address; // case-sensitive --- no normalization                |
|                                                                       |
| }                                                                     |
|                                                                       |
| default:                                                              |
|                                                                       |
| throw new PayoutError(\`Unsupported network: \${network}.\`,          |
|                                                                       |
| HttpStatus.UNPROCESSABLE_ENTITY, \'ERR_CRYPTO_NETWORK_UNSUPPORTED\'); |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Never store the raw address before validation**                     |
|                                                                       |
| Always run validateAddress() before persisting to deposit_methods.    |
|                                                                       |
| Storing an invalid or malformed address and using it at payout        |
| execution time causes                                                 |
|                                                                       |
| irrecoverable fund loss. Validate and normalize first --- store the   |
| normalized result.                                                    |
|                                                                       |
| The encrypted walletAddress column stores the normalized output of    |
| validateAddress(),                                                    |
|                                                                       |
| not the raw contractor input.                                         |
+=======================================================================+

# **8. Wallet Address Storage**

  --------------------------------------------------------------------------------------
  **Column**               **Type**      **Encrypted**   **Value stored**
  ------------------------ ------------- --------------- -------------------------------
  **walletAddress**        TEXT          Yes ---         Normalized wallet address.
                                         AES-256-GCM     Never raw input.

  **walletAddressLast6**   VARCHAR(6)    No              Last 6 chars of normalized
                                                         address. Used for display
                                                         label.

  **cryptoProvider**       ENUM          No              RAMP \| TRANSAK \| CRYPTO_COM
                                                         \| COINBASE \| METAMASK \|
                                                         LEDGER \| TREZOR \| KRAKEN \|
                                                         BINANCE

  **network**              VARCHAR(32)   No              ethereum \| bitcoin \| polygon
                                                         \| bsc \| solana \| tron \|
                                                         litecoin

  **token**                VARCHAR(16)   No              ETH \| BTC \| USDC \| USDT \|
                                                         BNB \| SOL \| LTC
  --------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // createCryptoMethod --- called by manual entry and WalletConnect    |
| approval handler                                                      |
|                                                                       |
| private async createCryptoMethod(dto: {                               |
|                                                                       |
| contractorId: string;                                                 |
|                                                                       |
| cryptoProvider: CryptoProvider;                                       |
|                                                                       |
| walletAddress: string;                                                |
|                                                                       |
| network: string;                                                      |
|                                                                       |
| token: string;                                                        |
|                                                                       |
| }): Promise\<DepositMethod\> {                                        |
|                                                                       |
| // 1. Validate and normalize address                                  |
|                                                                       |
| const normalized =                                                    |
| this.addressValidator.validateAddress(dto.walletAddress,              |
| dto.network);                                                         |
|                                                                       |
| const last6 = normalized.slice(-6);                                   |
|                                                                       |
| // 2. Enforce 5-method limit                                          |
|                                                                       |
| const count = await this.methodRepo.count({                           |
|                                                                       |
| where: { contractorId: dto.contractorId, isActive: true },            |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (count \>= 5) throw new PayoutError(\'Maximum 5 active deposit     |
| methods allowed.\',                                                   |
|                                                                       |
| HttpStatus.UNPROCESSABLE_ENTITY,                                      |
| \'ERR_DEPOSIT_METHOD_LIMIT_REACHED\');                                |
|                                                                       |
| // 3. Encrypt address                                                 |
|                                                                       |
| const encrypted = this.encrypt(normalized);                           |
|                                                                       |
| // 4. Fetch conversion display value                                  |
|                                                                       |
| const conversion = await                                              |
| this.conversionService.getDisplayRate(dto.token, \'USD\');            |
|                                                                       |
| // 5. Persist                                                         |
|                                                                       |
| return this.methodRepo.save({                                         |
|                                                                       |
| contractorId: dto.contractorId,                                       |
|                                                                       |
| methodType: MethodType.CRYPTO,                                        |
|                                                                       |
| cryptoProvider: dto.cryptoProvider,                                   |
|                                                                       |
| walletAddress: encrypted,                                             |
|                                                                       |
| walletAddressLast6: last6,                                            |
|                                                                       |
| network: dto.network,                                                 |
|                                                                       |
| token: dto.token,                                                     |
|                                                                       |
| verificationStatus: VerificationStatus.VERIFIED, // immediate --- no  |
| micro-deposits                                                        |
|                                                                       |
| isActive: true,                                                       |
|                                                                       |
| conversionDisplay: conversion.display, // \'1 ETH ≈ \$3,400\' ---     |
| snapshot at connection time                                           |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **9. Conversion Display Value**

The conversion display value (e.g. \"1 ETH ≈ \$3,400\") is shown on the
wallet success screen, in the deposit method list, and in notification
toasts. It is fetched from the self-hosted fawazahmed0/exchange-api ---
the same instance used by earnings-service for FX rates. It is for
display only and is never used for actual payout calculations.

+------------------------------------------------------------------------------------------+
| typescript                                                                               |
+------------------------------------------------------------------------------------------+
| // src/crypto/conversion.service.ts                                                      |
|                                                                                          |
| async getDisplayRate(token: string, fiat: string): Promise\<{ display: string; rate:     |
| number }\> {                                                                             |
|                                                                                          |
| const cacheKey = \`crypto:rate:\${token.toLowerCase()}:\${fiat.toLowerCase()}\`;         |
|                                                                                          |
| // Check Redis cache (15-minute TTL)                                                     |
|                                                                                          |
| const cached = await this.redis.get(cacheKey);                                           |
|                                                                                          |
| if (cached) {                                                                            |
|                                                                                          |
| const rate = parseFloat(cached);                                                         |
|                                                                                          |
| return { display: \`1 \${token} ≈ \$\${rate.toLocaleString(\'en-US\')}\`, rate };        |
|                                                                                          |
| }                                                                                        |
|                                                                                          |
| // Fetch from fawazahmed0 self-hosted instance                                           |
|                                                                                          |
| try {                                                                                    |
|                                                                                          |
| const url =                                                                              |
| \`\${process.env.FAWAZAHMED0_API_BASE}/latest/currencies/\${token.toLowerCase()}.json\`; |
|                                                                                          |
| const res = await fetch(url, { signal: AbortSignal.timeout(3000) });                     |
|                                                                                          |
| if (!res.ok) throw new Error(\`HTTP \${res.status}\`);                                   |
|                                                                                          |
| const data = await res.json();                                                           |
|                                                                                          |
| const rate = data.currencies?.\[token.toLowerCase()\]?.\[fiat.toLowerCase()\];           |
|                                                                                          |
| if (!rate) throw new Error(\`No rate found for \${token}/\${fiat}\`);                    |
|                                                                                          |
| // Cache for 15 minutes                                                                  |
|                                                                                          |
| await this.redis.set(cacheKey, String(rate), \'EX\',                                     |
|                                                                                          |
| parseInt(process.env.CRYPTO_CONVERSION_CACHE_TTL_SECONDS ?? \'900\'));                   |
|                                                                                          |
| return { display: \`1 \${token} ≈ \$\${Number(rate).toLocaleString(\'en-US\')}\`, rate   |
| };                                                                                       |
|                                                                                          |
| } catch {                                                                                |
|                                                                                          |
| // Fallback: return display-only stub --- never block wallet connection over a rate      |
| fetch failure                                                                            |
|                                                                                          |
| this.logger.warn(\`Conversion rate fetch failed for \${token}/\${fiat} --- using         |
| fallback display\`);                                                                     |
|                                                                                          |
| return { display: \`1 \${token} (rate unavailable)\`, rate: 0 };                         |
|                                                                                          |
| }                                                                                        |
|                                                                                          |
| }                                                                                        |
+==========================================================================================+

+-----------------------------------------------------------------------+
| **Conversion rate is display-only --- never used for payout math**    |
|                                                                       |
| fawazahmed0 provides indicative rates for UI display only.            |
|                                                                       |
| Actual payout conversion (USD → crypto) is handled by the provider    |
| (Ramp, Transak, etc.)                                                 |
|                                                                       |
| at execution time using their live rate. Marketeq does not perform    |
| the crypto conversion.                                                |
|                                                                       |
| The fawazahmed0 rate shown to the contractor is an estimate --- the   |
| final amount received                                                 |
|                                                                       |
| in crypto will depend on the provider\'s rate at the time of the      |
| transfer.                                                             |
+=======================================================================+

# **10. Provider → Network → Token Defaults**

  ------------------------------------------------------------------------------
  **Provider**     **Default     **Default     **WalletConnect   **Networks also
                   network**     token**       chainId**         supported**
  ---------------- ------------- ------------- ----------------- ---------------
  **Ramp Network** ethereum      ETH           eip155:1          bitcoin (BTC)

  **Transak**      ethereum      ETH           eip155:1          polygon, bsc,
                                                                 solana, tron

  **Crypto.com**   ethereum      ETH           eip155:1          bsc, solana

  **Coinbase**     ethereum      ETH           eip155:1          polygon, solana

  **MetaMask**     ethereum      ETH           eip155:1          polygon, bsc
                                                                 (EVM only)

  **Ledger**       ethereum      ETH           eip155:1          bitcoin,
                                                                 polygon

  **Trezor**       bitcoin       BTC           N/A (no           ethereum,
                                               WalletConnect)    litecoin

  **Kraken**       bitcoin       BTC           N/A (no           ethereum
                                               WalletConnect)    

  **Binance**      ethereum      ETH           eip155:1          bsc, bitcoin
  ------------------------------------------------------------------------------

# **11. Frontend Polling Contract (WalletConnect)**

  -------------------------------------------------------------------------------------
  **status        **expiresAt**   **depositMethodId**   **Frontend action**
  returned**                                            
  --------------- --------------- --------------------- -------------------------------
  **pending**     ISO timestamp   null                  Show QR + countdown. Continue
                                                        polling every 3 seconds.

  **connected**   ISO timestamp   uuid                  Stop polling. Show success
                                                        screen with walletAddressLast6
                                                        and conversionDisplay.

  **expired**     null            null                  Stop polling. Show \"QR code
                                                        expired\" state. Show \"Try
                                                        Again\" button.
  -------------------------------------------------------------------------------------

# **12. Error Code Reference**

  ---------------------------------------------------------------------------------------
  **Error code**                            **HTTP     **When thrown**
                                            status**   
  ----------------------------------------- ---------- ----------------------------------
  **ERR_DEPOSIT_METHOD_LIMIT_REACHED**      422        Contractor already has 5 active
                                                       methods

  **ERR_CRYPTO_ADDRESS_INVALID**            422        Address fails format validation
                                                       for stated network. network and
                                                       truncated address in metadata.

  **ERR_CRYPTO_NETWORK_UNSUPPORTED**        422        Network field contains a value not
                                                       in the supported list

  **ERR_CRYPTO_PROVIDER_UNSUPPORTED**       422        cryptoProvider field contains a
                                                       value not in the 9-provider enum

  **ERR_WALLETCONNECT_SESSION_NOT_FOUND**   404        Poll for session ID that does not
                                                       exist in Redis (expired or
                                                       invalid)

  **ERR_WALLETCONNECT_SESSION_EXPIRED**     410        Session was found but
                                                       status=expired

  **ERR_CRYPTO_ADDRESS_NETWORK_MISMATCH**   422        WalletConnect returned an address
                                                       on a different network/chainId
                                                       than requested
  ---------------------------------------------------------------------------------------

# **13. References**

  -----------------------------------------------------------------------------------------
  **Document / Resource**  **Relevant to**
  ------------------------ ----------------------------------------------------------------
  **PS-01 --- Database     deposit_methods columns: walletAddress (encrypted),
  Schema**                 walletAddressLast6, cryptoProvider, network, token,
                           conversionDisplay

  **PS-04 --- Deposit      verificationStatus, 5-method limit, default method management
  Method Management**      

  **ES-06 --- Currency     fawazahmed0 self-hosted instance, Redis FX cache pattern (same
  Conversion & Display**   approach used here for crypto rates)

  **WalletConnect v2       https://docs.walletconnect.com/api/sign/dapp-usage
  docs**                   

  **ethers.js EIP-55**     https://docs.ethers.org/v5/api/utils/address/#utils-getAddress

  **fawazahmed0 exchange   https://github.com/fawazahmed0/exchange-api
  API**                    
  -----------------------------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-10 \| v1.0
