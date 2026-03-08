**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-11 --- Crypto Wallet --- Per-Provider Technical Integration Spec

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-11 --- Crypto Wallet Per-Provider Technical
                      Integration Spec

  **Version**         1.0

  **Applies to**      All 9 crypto providers: Ramp, Transak, Crypto.com,
                      Coinbase, MetaMask, Ledger, Trezor, Kraken, Binance

  **Connection        WalletConnect v2 relay (webhook) for 6 providers.
  detection**         Direct address for 3 (Ramp, Trezor, Kraken).

  **Session           Redis. WalletConnect sessions 5-min TTL. Provider
  management**        SDK sessions provider-managed.

  **Reconnection**    Provider-specific. WalletConnect: new session.
                      Direct: re-enter address.

  **Prerequisites**   PS-10, PS-01, PS-04
  -----------------------------------------------------------------------

# **1. Overview**

This document provides the per-provider technical integration
specification for all 9 supported crypto wallet providers. For each
provider it defines: the SDK or API used, authentication and connection
flow details, supported token and network list, how connection status is
detected (webhook vs polling), session lifecycle and expiry handling,
the re-connection flow when a session drops, and known limitations and
edge cases. PS-10 covers shared infrastructure (address validation,
WalletConnect session service, fawazahmed0 conversion). This document
covers what is unique to each provider.

  -------------------------------------------------------------------------------------
  **Provider**     **Integration   **SDK / API**       **Auth method** **Status
                   type**                                              detection**
  ---------------- --------------- ------------------- --------------- ----------------
  **Ramp Network** Widget embed +  Ramp Instant SDK    API key         Ramp webhook →
                   webhook                             (server-side)   payout-service

  **Transak**      Widget embed +  Transak SDK +       API key +       WalletConnect
                   WalletConnect   WalletConnect v2    WalletConnect   relay

  **Crypto.com**   WalletConnect   WalletConnect v2    WalletConnect   WalletConnect
                                                       session         relay

  **Coinbase**     WalletConnect   Coinbase Wallet     WalletConnect   WalletConnect
                                   SDK + WalletConnect session         relay
                                   v2                                  

  **MetaMask**     WalletConnect   WalletConnect v2    WalletConnect   WalletConnect
                                                       session         relay

  **Ledger**       WalletConnect   WalletConnect v2    WalletConnect   WalletConnect
                   via Ledger Live                     session         relay

  **Trezor**       Direct address  None (no SDK)       N/A             Frontend submit
                   entry only                                          only

  **Kraken**       Direct address  None (no SDK)       N/A             Frontend submit
                   entry only                                          only

  **Binance**      WalletConnect   Binance Web3        WalletConnect   WalletConnect
                                   Wallet +            session         relay
                                   WalletConnect v2                    
  -------------------------------------------------------------------------------------

# **2. Ramp Network**

## **2.1 Overview**

Ramp Network provides a hosted on-ramp/off-ramp widget. The contractor
selects Ramp, enters their wallet address manually (Ramp does not use
WalletConnect), and Marketeq uses the Ramp Instant SDK to verify the
address and initiate payouts. Authentication is server-side using a Ramp
API key --- the contractor does not log into a Ramp account.

## **2.2 Environment variables**

  ------------------------------------------------------------------------
  **Variable**              **Description**
  ------------------------- ----------------------------------------------
  **RAMP_API_KEY**          Server-side Ramp API key for payout initiation

  **RAMP_WEBHOOK_SECRET**   HMAC secret for verifying inbound Ramp
                            webhooks

  **RAMP_API_BASE**         https://api.ramp.network (live) /
                            https://api.demo.ramp.network (sandbox)
  ------------------------------------------------------------------------

## **2.3 Supported tokens and networks**

  ------------------------------------------------------------------------
  **Token**    **Network**           **Notes**
  ------------ --------------------- -------------------------------------
  **ETH**      Ethereum mainnet      Primary default

  **BTC**      Bitcoin               Native BTC address required --- not
                                     wrapped

  **USDC**     Ethereum (ERC-20)     Contractor must provide ERC-20
                                     compatible address
  ------------------------------------------------------------------------

## **2.4 Connection flow**

  -----------------------------------------------------------------------------
  **Step**   **Action**
  ---------- ------------------------------------------------------------------
  **1**      Contractor enters wallet address and selects network. No redirect
             or SDK embed for connection --- address entry only.

  **2**      Backend validates address format per PS-10 §7. Stores encrypted
             address.

  **3**      verificationStatus set to VERIFIED immediately --- Ramp does not
             perform address verification at connection time.

  **4**      At payout execution time, payout-service calls Ramp Payouts API
             with stored wallet address and USD amount. Ramp converts USD →
             crypto and transfers to address.
  -----------------------------------------------------------------------------

## **2.5 Status detection**

Ramp sends webhooks to POST /v1/webhooks/ramp for payout status events.
payout-service validates the HMAC signature using RAMP_WEBHOOK_SECRET
before processing.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Relevant Ramp webhook events                                       |
|                                                                       |
| // RELEASE_CREATED --- payout initiated by Ramp                       |
|                                                                       |
| // RELEASE_FINISHED --- crypto delivered to wallet                    |
|                                                                       |
| // RELEASE_FAILED --- payout failed at Ramp level                     |
|                                                                       |
| // Webhook signature validation                                       |
|                                                                       |
| validateRampWebhook(rawBody: Buffer, signature: string): boolean {    |
|                                                                       |
| const expected = crypto                                               |
|                                                                       |
| .createHmac(\"sha256\", process.env.RAMP_WEBHOOK_SECRET!)             |
|                                                                       |
| .update(rawBody)                                                      |
|                                                                       |
| .digest(\"hex\");                                                     |
|                                                                       |
| return crypto.timingSafeEqual(Buffer.from(signature),                 |
| Buffer.from(expected));                                               |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **2.6 Re-connection flow**

Ramp uses direct address entry --- there is no session to reconnect. If
the contractor\'s wallet address changes, they delete the existing
method and add a new one with the updated address.

## **2.7 Known limitations and edge cases**

  -----------------------------------------------------------------------
  **Limitation / Edge   **Handling**
  case**                
  --------------------- -------------------------------------------------
  **No WalletConnect    Address entry only. QR and paste URI connection
  support**             methods are not shown for Ramp in the UI.

  **No address          Ramp confirms address validity only at payout
  verification at       execution. If the address is wrong, the payout
  connection time**     fails at Ramp level --- ERR_RAMP_PAYOUT_FAILED.

  **BTC address must be Ramp does not accept BTC wrapped as ERC-20.
  native BTC**          Validate that bitcoin network is selected if
                        token=BTC.

  **Ramp fee variable** 0.49--2.9%. Final fee is determined by Ramp at
                        execution time, not at connection time. Display
                        to contractor as a range only.
  -----------------------------------------------------------------------

# **3. Transak**

## **3.1 Overview**

Transak supports both manual address entry and WalletConnect v2. The
Transak SDK is used for payout execution (server-side). Connection is
via WalletConnect v2 session or manual address entry. Transak supports
the widest token range of all 9 providers --- 100+ tokens across
multiple networks.

## **3.2 Environment variables**

  ---------------------------------------------------------------------------
  **Variable**                 **Description**
  ---------------------------- ----------------------------------------------
  **TRANSAK_API_KEY**          Server-side Transak API key

  **TRANSAK_API_SECRET**       Transak API secret for request signing

  **TRANSAK_WEBHOOK_SECRET**   HMAC secret for Transak webhook verification

  **TRANSAK_API_BASE**         https://api.transak.com (live) /
                               https://staging-global.transak.com (sandbox)
  ---------------------------------------------------------------------------

## **3.3 Supported tokens and networks**

  -----------------------------------------------------------------------
  **Network**        **Tokens (primary)**
  ------------------ ----------------------------------------------------
  **Ethereum**       ETH, USDC (ERC-20), DAI

  **Polygon**        MATIC, USDC (Polygon)

  **BNB Smart        BNB, USDT (BEP-20), BUSD
  Chain**            

  **Solana**         SOL, USDC (SPL)

  **Tron**           USDT (TRC-20)

  **100+             See Transak docs --- filtered to contractor-relevant
  additional**       tokens at UI layer
  -----------------------------------------------------------------------

## **3.4 WalletConnect chain IDs**

  -----------------------------------------------------------------------
  **Network**            **WalletConnect chainId**
  ---------------------- ------------------------------------------------
  **Ethereum**           eip155:1

  **Polygon**            eip155:137

  **BNB Smart Chain**    eip155:56

  **Solana**             solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ (Solana
                         mainnet)
  -----------------------------------------------------------------------

## **3.5 Status detection**

WalletConnect relay via \@walletconnect/sign-client. payout-service
subscribes to session_event and session_delete events. Transak also
sends order status webhooks for payout execution events.

## **3.6 Known limitations and edge cases**

  -----------------------------------------------------------------------
  **Limitation / Edge   **Handling**
  case**                
  --------------------- -------------------------------------------------
  **Solana not EVM ---  Use solana: namespace in WalletConnect session
  different             proposal, not eip155:. Address validation uses
  WalletConnect         Solana Base58 regex.
  namespace**           

  **100+ token list     Only show contractor-relevant tokens in the UI
  must be filtered**    dropdown. Do not expose the full Transak
                        catalogue.

  **Tron addresses      Validate with Tron-specific regex
  start with T**        (/\^T\[1-9A-HJ-NP-Za-km-z\]{33}\$/) --- distinct
                        from EVM.
  -----------------------------------------------------------------------

# **4. Crypto.com**

## **4.1 Overview**

Crypto.com uses WalletConnect v2 for connection and the Crypto.com Pay
Checkout API for payout execution. Manual address entry is also
supported. Crypto.com supports 100+ tokens but payout-service limits to
ETH, USDC, and BNB for the initial release.

## **4.2 Environment variables**

  ------------------------------------------------------------------------------
  **Variable**                    **Description**
  ------------------------------- ----------------------------------------------
  **CRYPTO_COM_API_KEY**          Crypto.com Pay API key

  **CRYPTO_COM_SECRET_KEY**       Crypto.com Pay secret key

  **CRYPTO_COM_WEBHOOK_SECRET**   For payout execution webhooks
  ------------------------------------------------------------------------------

## **4.3 Supported tokens (initial release)**

  ------------------------------------------------------------------------
  **Token**       **Network**           **WalletConnect chainId**
  --------------- --------------------- ----------------------------------
  **ETH**         Ethereum              eip155:1

  **USDC**        Ethereum (ERC-20)     eip155:1

  **BNB**         BNB Smart Chain       eip155:56
  ------------------------------------------------------------------------

## **4.4 Known limitations and edge cases**

  -----------------------------------------------------------------------
  **Limitation / Edge   **Handling**
  case**                
  --------------------- -------------------------------------------------
  **Crypto.com app must If WalletConnect session times out with no
  be installed for      approval: session expires after 5 min. Frontend
  WalletConnect to      shows \"Try Again\". Offer manual address entry
  work**                as fallback.

  **Crypto.com enforces Payout execution may be rejected by Crypto.com
  KYC on large payouts  for unverified accounts.
  (\>\$10,000 USD       ERR_CRYPTO_COM_KYC_REQUIRED returned. Contractor
  equivalent)**         directed to verify with Crypto.com.
  -----------------------------------------------------------------------

# **5. Coinbase**

## **5.1 Overview**

Coinbase Wallet uses WalletConnect v2 via the Coinbase Wallet SDK.
Manual address entry is also supported. Payout execution uses the
Coinbase Commerce API. Note: Coinbase Wallet (self-custody) and Coinbase
Exchange (custodial) are separate products --- payout-service integrates
with Coinbase Wallet only.

## **5.2 Environment variables**

  ------------------------------------------------------------------------------
  **Variable**                    **Description**
  ------------------------------- ----------------------------------------------
  **COINBASE_COMMERCE_API_KEY**   Coinbase Commerce API key for payout execution

  **COINBASE_WEBHOOK_SECRET**     For Coinbase Commerce charge/payment webhooks
  ------------------------------------------------------------------------------

## **5.3 Supported tokens**

  ------------------------------------------------------------------------
  **Token**       **Network**           **WalletConnect chainId**
  --------------- --------------------- ----------------------------------
  **ETH**         Ethereum              eip155:1

  **USDC**        Ethereum (ERC-20)     eip155:1

  **BTC**         Bitcoin               Not applicable --- Bitcoin address
                                        only

  **USDC**        Polygon               eip155:137

  **SOL**         Solana                solana mainnet
  ------------------------------------------------------------------------

## **5.4 Known limitations and edge cases**

  -----------------------------------------------------------------------
  **Limitation / Edge   **Handling**
  case**                
  --------------------- -------------------------------------------------
  **Coinbase Exchange   If contractor enters a Coinbase Exchange deposit
  accounts cannot       address (starts with same format as wallet), it
  receive WalletConnect will still pass EVM regex validation. Address
  connections**         validity is only confirmed at payout execution.

  **BTC payouts go      For BTC selection: use manual address entry flow.
  through Bitcoin       WalletConnect only used for EVM and Solana.
  network directly ---  
  not via               
  WalletConnect**       

  **Coinbase Wallet     Desktop Coinbase Wallet extension also works via
  mobile app required   paste URI.
  for WalletConnect QR  
  flow**                
  -----------------------------------------------------------------------

# **6. MetaMask**

## **6.1 Overview**

MetaMask is EVM-only. It connects via WalletConnect v2 and supports
manual address entry. MetaMask does not have a server-side API --- it is
purely a wallet. Payout execution to a MetaMask address uses the
standard EVM transfer via payout-service\'s treasury wallet, not a
MetaMask-specific API.

## **6.2 Environment variables**

No MetaMask-specific environment variables. MetaMask uses the shared
WALLETCONNECT_PROJECT_ID from PS-10.

## **6.3 Supported tokens and networks**

  -----------------------------------------------------------------------------
  **Network**    **Tokens**         **WalletConnect   **Notes**
                                    chainId**         
  -------------- ------------------ ----------------- -------------------------
  **Ethereum**   ETH, USDC, DAI,    eip155:1          Primary
                 any ERC-20                           

  **Polygon**    MATIC, USDC        eip155:137        Contractor must have
                                                      Polygon network added in
                                                      MetaMask

  **BNB Smart    BNB, USDT          eip155:56         Contractor must have BSC
  Chain**                                             network added in MetaMask
  -----------------------------------------------------------------------------

## **6.4 WalletConnect session handling**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // MetaMask WalletConnect v2 session proposal                         |
|                                                                       |
| // Use eip155 namespace for all EVM networks                          |
|                                                                       |
| const sessionProposal = {                                             |
|                                                                       |
| requiredNamespaces: {                                                 |
|                                                                       |
| eip155: {                                                             |
|                                                                       |
| methods: \[\"eth_sendTransaction\", \"personal_sign\"\],              |
|                                                                       |
| chains: \[\"eip155:1\"\], // Ethereum mainnet required                |
|                                                                       |
| events: \[\"accountsChanged\", \"chainChanged\"\],                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| },                                                                    |
|                                                                       |
| optionalNamespaces: {                                                 |
|                                                                       |
| eip155: {                                                             |
|                                                                       |
| chains: \[\"eip155:137\", \"eip155:56\"\], // Polygon, BSC optional   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| };                                                                    |
+=======================================================================+

## **6.5 Known limitations and edge cases**

  -----------------------------------------------------------------------
  **Limitation / Edge   **Handling**
  case**                
  --------------------- -------------------------------------------------
  **MetaMask does not   BTC, SOL, TRX addresses cannot be used with
  support non-EVM       MetaMask provider. UI restricts network selector
  networks**            to EVM options when MetaMask is selected.

  **Contractor may have WalletConnect returns the currently active
  multiple accounts in  account. Contractor should be prompted to confirm
  MetaMask**            the displayed address before saving.

  **MetaMask mobile vs  Mobile: QR code scan. Extension: paste URI or
  extension behave      auto-detect. Both work via same WalletConnect v2
  differently**         session.

  **Chain switching     If contractor switches chain in MetaMask after
  after connection**    connection, chainChanged event fires.
                        payout-service ignores this --- network is locked
                        at method creation time.
  -----------------------------------------------------------------------

# **7. Ledger**

## **7.1 Overview**

Ledger is a hardware wallet. Connection is via WalletConnect v2 through
the Ledger Live desktop or mobile app. Manual address entry is also
supported (contractor copies address from Ledger device or Ledger Live).
Payout execution sends to the stored address directly --- no Ledger API
is called at execution time.

## **7.2 Environment variables**

No Ledger-specific environment variables. Uses shared
WALLETCONNECT_PROJECT_ID.

## **7.3 Supported tokens**

  ------------------------------------------------------------------------
  **Token**    **Network**        **Notes**
  ------------ ------------------ ----------------------------------------
  **ETH**      Ethereum           Standard EVM address

  **BTC**      Bitcoin            Native SegWit (bc1) preferred. Legacy
                                  (1/3 prefix) also accepted.

  **USDC**     Ethereum (ERC-20)  Same Ethereum address as ETH
  ------------------------------------------------------------------------

## **7.4 Known limitations and edge cases**

  -----------------------------------------------------------------------
  **Limitation / Edge   **Handling**
  case**                
  --------------------- -------------------------------------------------
  **Ledger Live must be If session times out with no response: 5-min TTL
  open and unlocked for expires → status=expired → \"Try Again\". Offer
  WalletConnect**       manual address entry as primary fallback guidance
                        for Ledger users.

  **Ledger requires     Contractor must press buttons on the Ledger
  physical button       device to approve the connection. This can take
  confirmation for      longer than the WalletConnect default pairing
  WalletConnect         window --- the 5-min TTL covers this.
  approval**            

  **BTC account         Ledger may expose multiple BTC accounts (Native
  derivation paths      SegWit, Legacy, Taproot). Contractor should
  vary**                select the specific address they want to use.
                        payout-service validates and stores whichever
                        address is provided.

  **WalletConnect v2    Older Ledger Live versions use WalletConnect v1
  requires Ledger Live  which is deprecated. If connection fails: advise
  ≥ 2.73**              contractor to update Ledger Live. Offer manual
                        address entry fallback.
  -----------------------------------------------------------------------

# **8. Trezor**

## **8.1 Overview**

Trezor is a hardware wallet that does not support WalletConnect. The
only connection method is manual wallet address entry. The contractor
copies their address from Trezor Suite or the Trezor device display and
pastes it into the Marketeq UI. No Trezor SDK or API is used at
connection time or payout execution time.

## **8.2 Environment variables**

None. Trezor requires no server-side integration. Address entry only.

## **8.3 Supported tokens**

  ------------------------------------------------------------------------
  **Token**    **Network**        **Notes**
  ------------ ------------------ ----------------------------------------
  **BTC**      Bitcoin            Native SegWit (bc1), Legacy (1/3), and
                                  Taproot (bc1p) all accepted

  **ETH**      Ethereum           EIP-55 checksum normalized

  **LTC**      Litecoin           L/M prefix or ltc1 Bech32
  ------------------------------------------------------------------------

## **8.4 UI behaviour**

When Trezor is selected as provider: the WalletConnect QR and paste URI
options are hidden. Only the manual address entry input is shown. A
tooltip explains: \"Trezor does not support WalletConnect. Copy your
address from Trezor Suite or your device screen and paste it here.\"

## **8.5 Known limitations and edge cases**

  -----------------------------------------------------------------------
  **Limitation / Edge   **Handling**
  case**                
  --------------------- -------------------------------------------------
  **No programmatic     Address is stored as entered (after format
  address               validation). Correctness only confirmed at payout
  verification**        execution. Incorrect address = irrecoverable fund
                        loss. UI must prompt contractor to triple-check
                        the address before saving.

  **Trezor Taproot      Taproot addresses pass Bech32 regex but are
  (bc1p) addresses**    distinct from SegWit (bc1q). Both accepted ---
                        payout execution must use a provider that
                        supports Taproot outputs.

  **No reconnection     If contractor loses access to wallet, they delete
  flow --- address      the method and add a new address. No session to
  entry is stateless**  expire or reconnect.
  -----------------------------------------------------------------------

# **9. Kraken**

## **9.1 Overview**

Kraken is a centralized exchange. Connection is via manual deposit
address entry only --- the contractor copies their Kraken deposit
address for BTC or ETH from the Kraken exchange UI and pastes it into
Marketeq. No Kraken API or SDK is used. WalletConnect is not supported.

## **9.2 Environment variables**

None. Kraken requires no server-side integration.

## **9.3 Supported tokens**

  ------------------------------------------------------------------------
  **Token**    **Network**        **Notes**
  ------------ ------------------ ----------------------------------------
  **BTC**      Bitcoin            Kraken provides a unique BTC deposit
                                  address per account

  **ETH**      Ethereum           Kraken provides a unique ETH deposit
                                  address per account
  ------------------------------------------------------------------------

## **9.4 Known limitations and edge cases**

  -----------------------------------------------------------------------
  **Limitation / Edge   **Handling**
  case**                
  --------------------- -------------------------------------------------
  **Kraken rotates      Contractor must update their Marketeq deposit
  deposit addresses     method if Kraken assigns them a new deposit
  periodically**        address. Stale address may still work (Kraken
                        keeps old addresses active) but contractor should
                        be advised to verify.

  **Kraken deposit      Funds arrive in Kraken account, not a personal
  addresses are         wallet. Contractor accepts this by choosing
  custodial --- not     Kraken.
  self-custody**        

  **No WalletConnect**  QR and paste URI options hidden for Kraken.
                        Manual address entry only.

  **Kraken requires     BTC and ETH do not require memos. If Kraken
  memo/tag for some     support for other networks is added later, memo
  assets**              handling must be implemented. Not required for
                        v1.
  -----------------------------------------------------------------------

# **10. Binance**

## **10.1 Overview**

Binance Web3 Wallet supports WalletConnect v2. Manual address entry is
also supported. Binance supports BTC, ETH, and USDT. Note: Binance Pay
(centralized) and Binance Web3 Wallet (self-custody) are different
products. payout-service connects to Binance Web3 Wallet via
WalletConnect. Payouts are sent to the contractor\'s Binance Web3 Wallet
address --- not their Binance exchange account.

## **10.2 Environment variables**

No Binance-specific environment variables beyond the shared
WALLETCONNECT_PROJECT_ID.

## **10.3 Supported tokens**

  ---------------------------------------------------------------------------
  **Token**   **Network**     **WalletConnect       **Notes**
                              chainId**             
  ----------- --------------- --------------------- -------------------------
  **BTC**     Bitcoin         N/A --- manual        Bitcoin not supported via
                              address entry only    WalletConnect on Binance
                              for BTC               Web3

  **ETH**     Ethereum        eip155:1              WalletConnect and manual
                                                    both supported

  **USDT**    BNB Smart Chain eip155:56             WalletConnect and manual
              (BEP-20)                              both supported
  ---------------------------------------------------------------------------

## **10.4 Known limitations and edge cases**

  -----------------------------------------------------------------------
  **Limitation / Edge   **Handling**
  case**                
  --------------------- -------------------------------------------------
  **Binance Pay vs      These are different. Binance Pay is a payment
  Binance Web3 Wallet** processing service --- not what payout-service
                        uses. Binance Web3 Wallet is self-custody. UI
                        should clarify: \"Connect your Binance Web3
                        Wallet --- not your Binance exchange account.\"

  **USDT on BSC vs USDT These are different contracts on different
  on Ethereum           networks. Contractor must select BNB Smart Chain
  (ERC-20)**            for BEP-20 USDT. payout-service stores the
                        network --- payouts use the stored network.

  **0--0.1% fee range   The fee shown is Binance\'s P2P transfer margin
  is for P2P margin**   --- not a fixed fee. Actual fee at execution may
                        be 0% for internal Binance transfers. Display as
                        range.
  -----------------------------------------------------------------------

# **11. WalletConnect Session Lifecycle --- All 6 Providers**

Applies to Transak, Crypto.com, Coinbase, MetaMask, Ledger, and Binance
--- the six providers that support WalletConnect v2.

  --------------------------------------------------------------------------------------
  **State**          **Trigger**                 **Redis key state**   **Frontend
                                                                       action**
  ------------------ --------------------------- --------------------- -----------------
  **pending**        POST /walletconnect-session wcsession:{id} =      Show QR + 5-min
                     called. QR rendered.        {status:pending,      countdown. Poll
                                                 expiresAt}            every 3s.

  **connected**      WalletConnect relay         wcsession:{id} =      Stop poll. Show
                     delivers                    {status:connected,    success screen.
                     session_proposal_response   depositMethodId}      
                     with approved=true.                               

  **expired**        5-min TTL elapses with no   Key deleted by Redis  Stop poll. Show
                     contractor approval.        TTL.                  \"QR expired\"
                                                                       state. Show \"Try
                                                                       Again\" button.

  **rejected**       Contractor denies           wcsession:{id} =      Stop poll. Show
                     connection in wallet app.   {status:rejected}     \"Connection
                                                                       rejected\" state.
                                                                       Offer retry.

  **disconnected**   Contractor disconnects      N/A ---               No UI action at
                     wallet from within wallet   post-connection.      connection time.
                     app after connection.       deposit_methods row   At payout: token
                                                 unaffected.           refresh handles
                                                                       this via REAUTH
                                                                       flow if
                                                                       applicable.
  --------------------------------------------------------------------------------------

## **11.1 Re-connection flow**

  -----------------------------------------------------------------------
  **Scenario**          **Re-connection method**
  --------------------- -------------------------------------------------
  **Session expired     Frontend shows \"Try Again\" --- POST
  before contractor     /walletconnect-session creates new session with
  approved (5-min       fresh QR.
  TTL)**                

  **Contractor          Existing deposit_methods row remains active. No
  disconnected wallet   automatic detection at connection layer. If
  from wallet app**     payout fails due to disconnection: payout-service
                        marks method with reauthRequired=true (same as
                        PS-09 OAuth re-auth pattern). Contractor
                        reconnects from deposit method management screen.

  **Contractor deleted  Same as disconnected --- payout failure triggers
  wallet app**          reauthRequired. Contractor re-adds method with
                        new wallet address.

  **For Trezor, Kraken, No session to reconnect. Contractor deletes
  Ramp (no              method and adds a new one if address changes.
  WalletConnect)**      
  -----------------------------------------------------------------------

# **12. Error Code Reference --- Provider-Specific**

  -------------------------------------------------------------------------------------------
  **Error code**                          **HTTP     **Provider**   **When thrown**
                                          status**                  
  --------------------------------------- ---------- -------------- -------------------------
  **ERR_RAMP_PAYOUT_FAILED**              502        Ramp           Ramp API rejected payout
                                                                    execution. Includes Ramp
                                                                    error code in metadata.

  **ERR_TRANSAK_PAYOUT_FAILED**           502        Transak        Transak order creation
                                                                    failed.

  **ERR_CRYPTO_COM_KYC_REQUIRED**         422        Crypto.com     Payout amount exceeds
                                                                    Crypto.com KYC threshold
                                                                    for unverified account.

  **ERR_WALLETCONNECT_REJECTED**          409        All WC         Contractor denied the
                                                     providers      WalletConnect session
                                                                    proposal in their wallet
                                                                    app.

  **ERR_WALLETCONNECT_SESSION_EXPIRED**   410        All WC         5-min TTL elapsed with no
                                                     providers      contractor response.

  **ERR_PROVIDER_UNSUPPORTED_NETWORK**    422        All            Contractor attempted to
                                                                    use a network not
                                                                    supported by the selected
                                                                    provider.

  **ERR_LEDGER_LIVE_VERSION**             502        Ledger         WalletConnect handshake
                                                                    failed --- likely old
                                                                    Ledger Live version.
                                                                    Message: \"Please update
                                                                    Ledger Live to version
                                                                    2.73 or higher.\"
  -------------------------------------------------------------------------------------------

# **13. References**

  --------------------------------------------------------------------------------
  **Document /           **Relevant to**
  Resource**             
  ---------------------- ---------------------------------------------------------
  **PS-10 --- Crypto     Shared infrastructure: address validation, WalletConnect
  Wallet Connection**    session service, fawazahmed0 conversion, encryption

  **PS-09 ---            REAUTH_REQUIRED pattern reused for crypto wallet
  Third-Party OAuth      disconnection
  Methods**              

  **PS-04 --- Deposit    verificationStatus, reauthRequired, 5-method limit
  Method Management**    

  **WalletConnect v2     https://docs.walletconnect.com/api/sign/dapp-usage
  Sign Client**          

  **Ramp Network Payouts https://docs.ramp.network/api-reference
  API**                  

  **Transak API docs**   https://docs.transak.com

  **Coinbase Commerce    https://docs.cloud.coinbase.com/commerce/docs
  API**                  

  **Ledger Live          https://www.ledger.com/academy/ledger-and-walletconnect
  WalletConnect**        
  --------------------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-11 \| v1.0
