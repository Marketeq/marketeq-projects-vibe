**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-12 --- Crypto Payout Settlement --- Technical Spec

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-12 --- Crypto Payout Settlement --- Technical
                      Spec

  **Version**         1.0

  **Applies to**      CRYPTO method type. All 9 providers. Fiat-to-crypto
                      settlement path only.

  **Money source**    Marketeq corporate Stripe balance (USD). Same
                      source as all other payout methods.

  **Conversion        Ramp Network and Transak act as fiat-to-crypto
  bridge**            on-ramp bridges. Direct chain transfer for ETH/BTC
                      via treasury wallet for supported networks.

  **Gas fees**        Paid by Marketeq treasury wallet. Deducted from
                      payout amount after conversion. Displayed to
                      contractor before confirmation.

  **Settlement        Varies by provider and network. 15 min (ETH
  timing**            instant) to 3 business days (BTC).

  **Prerequisites**   PS-02, PS-10, PS-11, PS-01
  -----------------------------------------------------------------------

# **1. Overview**

Crypto payouts originate from the same source as all other Marketeq
payouts --- the corporate Stripe balance in USD. Because Stripe does not
natively support crypto disbursements, a fiat-to-crypto bridge is
required. Marketeq uses Ramp Network and Transak as on-ramp providers to
convert USD to crypto and deliver it to the contractor\'s wallet
address. For Ethereum mainnet (ETH and ERC-20 tokens), Marketeq may also
use a self-managed treasury wallet for direct on-chain transfer,
avoiding third-party bridge fees on high-frequency payouts.

+-----------------------------------------------------------------------+
| **Marketeq never holds contractor earnings in crypto**                |
|                                                                       |
| All contractor earnings are held in USD in the Marketeq corporate     |
| Stripe balance.                                                       |
|                                                                       |
| Crypto conversion happens at payout execution time only.              |
|                                                                       |
| The contractor\'s deposit method stores a wallet address --- not a    |
| crypto balance.                                                       |
|                                                                       |
| Marketeq converts USD → crypto at execution and sends it to the       |
| address on file.                                                      |
|                                                                       |
| The conversion rate is live at execution time. The fawazahmed0        |
| display rate shown                                                    |
|                                                                       |
| during setup (PS-10 §9) is indicative only and is not used for        |
| settlement.                                                           |
+=======================================================================+

# **2. Money Flow --- End to End**

  -------------------------------------------------------------------------------------------------
  **Step**   **Actor**        **Action**                   **System state after**
  ---------- ---------------- ---------------------------- ----------------------------------------
  **1**      payout-service   Payout request reaches       payout_requests.status = processing
                              PROCESSING status. Method    
                              type is CRYPTO.              

  **2**      payout-service   Read contractor balance from All pre-flight checks pass.
                              earnings-service (HTTP,      
                              never cached). Verify KYC,   
                              minimum amount, method       
                              verification.                

  **3**      payout-service → Stripe transfer from         Marketeq operating balance debited.
             Stripe           contractor\'s earnings       Contractor earnings balance debited.
                              sub-ledger to Marketeq       
                              operating account (internal  
                              ledger move --- no wire).    

  **4**      payout-service → POST to Ramp or Transak      Bridge provider initiates fiat-to-crypto
             Bridge           Payouts API with: USD        conversion.
                              amount, destination wallet   
                              address, network, token.     

  **5**      Bridge provider  Bridge converts USD to       Crypto conversion in progress.
                              crypto at live rate. Pays    
                              gas fee from USD amount or   
                              adds to conversion spread.   

  **6**      Bridge → Chain   Bridge broadcasts signed     Transaction hash returned to
                              transaction to the target    payout-service. Stored in
                              blockchain network.          payout_requests.externalTransactionId.

  **7**      Chain            Transaction confirms.        payout_requests.status = completed.
                              Contractor wallet receives   earnings-service debited.
                              crypto.                      

  **8**      payout-service   Webhook from bridge confirms payout_audit_log entry. Notification
                              final settlement. Audit log  sent to contractor.
                              written.                     
  -------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Step 3 is a Stripe internal ledger move --- not a bank wire**       |
|                                                                       |
| Marketeq does not wire USD to Ramp or Transak directly from Stripe.   |
|                                                                       |
| The bridge is pre-funded by Marketeq from its operating account.      |
|                                                                       |
| Ramp and Transak act as settlement partners --- Marketeq maintains a  |
| USD credit balance                                                    |
|                                                                       |
| with each provider which is drawn down per payout and topped up       |
| periodically.                                                         |
|                                                                       |
| This avoids per-transaction ACH/wire latency on the USD side.         |
+=======================================================================+

# **3. Bridge Provider Selection Logic**

At payout execution time, payout-service selects the bridge provider
based on the contractor\'s chosen crypto provider, the target network,
and the token. Not all nine wallet providers use the same bridge --- the
bridge is a settlement infrastructure choice, not a contractor-facing
choice.

  ------------------------------------------------------------------------
  **Wallet provider     **Settlement bridge** **Reason**
  (contractor choice)**                       
  --------------------- --------------------- ----------------------------
  **Ramp Network**      Ramp Payouts API      Direct --- Ramp is both
                                              wallet provider and bridge

  **Transak**           Transak Payouts API   Direct --- Transak is both
                                              wallet provider and bridge

  **MetaMask            Marketeq treasury     EVM transfer --- no bridge
  (ETH/ERC-20)**        wallet (direct        needed for ETH/USDC
                        on-chain)             

  **MetaMask            Transak Payouts API   Transak used as bridge for
  (non-ETH)**                                 non-ETH EVM tokens

  **Coinbase            Marketeq treasury     EVM transfer direct
  (ETH/ERC-20)**        wallet (direct        
                        on-chain)             

  **Coinbase (BTC)**    Ramp Payouts API      Ramp handles BTC settlement

  **Crypto.com**        Transak Payouts API   Transak used as bridge

  **Ledger              Marketeq treasury     Direct EVM
  (ETH/ERC-20)**        wallet (direct        
                        on-chain)             

  **Ledger (BTC)**      Ramp Payouts API      Ramp handles BTC

  **Trezor              Marketeq treasury     Direct EVM
  (ETH/ERC-20)**        wallet (direct        
                        on-chain)             

  **Trezor (BTC)**      Ramp Payouts API      Ramp handles BTC

  **Kraken (ETH)**      Marketeq treasury     Direct EVM to Kraken deposit
                        wallet (direct        address
                        on-chain)             

  **Kraken (BTC)**      Ramp Payouts API      Ramp handles BTC

  **Binance (ETH/BSC)** Marketeq treasury     Direct EVM
                        wallet (direct        
                        on-chain)             

  **Binance (BTC)**     Ramp Payouts API      Ramp handles BTC
  ------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/execution/bridge-selector.service.ts                           |
|                                                                       |
| selectBridge(                                                         |
|                                                                       |
| walletProvider: CryptoProvider,                                       |
|                                                                       |
| network: string,                                                      |
|                                                                       |
| token: string,                                                        |
|                                                                       |
| ): BridgeType {                                                       |
|                                                                       |
| // Ramp and Transak are self-bridges                                  |
|                                                                       |
| if (walletProvider === CryptoProvider.RAMP) return BridgeType.RAMP;   |
|                                                                       |
| if (walletProvider === CryptoProvider.TRANSAK) return                 |
| BridgeType.TRANSAK;                                                   |
|                                                                       |
| // BTC always goes through Ramp regardless of wallet provider         |
|                                                                       |
| if (token === \"BTC\" \|\| network === \"bitcoin\") return            |
| BridgeType.RAMP;                                                      |
|                                                                       |
| // EVM networks --- use direct treasury wallet transfer               |
|                                                                       |
| const evmNetworks = \[\"ethereum\", \"polygon\", \"bsc\"\];           |
|                                                                       |
| if (evmNetworks.includes(network)) return BridgeType.TREASURY_DIRECT; |
|                                                                       |
| // Solana, Tron --- use Transak                                       |
|                                                                       |
| return BridgeType.TRANSAK;                                            |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **4. Gas Fee Handling**

## **4.1 Who pays gas**

Marketeq pays all gas fees. Gas is not an additional charge to the
contractor --- it is deducted from the gross payout amount before the
contractor receives crypto. The net crypto amount the contractor
receives is: (payout USD amount ÷ live rate) minus gas fee equivalent.
This is displayed to the contractor on the withdrawal review screen
before they confirm.

  -------------------------------------------------------------------------------------
  **Network**      **Gas mechanism**  **Estimated cost** **Paid by**     **Displayed to
                                                                         contractor**
  ---------------- ------------------ ------------------ --------------- --------------
  **Ethereum       EIP-1559 base      \$2--\$15 USD      Marketeq        Yes --- shown
  mainnet**        fee + priority     equivalent (varies treasury wallet as \"Network
                   tip. Estimated     with network                       fee:
                   before broadcast   congestion)                        \~\$X.XX\" on
                   via                                                   review screen
                   eth_estimateGas.                                      

  **Polygon**      EIP-1559. Very low \<\$0.01 USD       Marketeq        Yes --- shown
                   fees.              equivalent         treasury wallet but labeled
                                                                         \"minimal\"

  **BNB Smart      Legacy gas model.  \~\$0.05--\$0.20   Marketeq        Yes
  Chain**          Low fees.          USD equivalent     treasury wallet 

  **Bitcoin**      UTXO fee model.    \$1--\$5 USD       Marketeq        Yes
                   Estimated via      equivalent         treasury wallet 
                   fee-rate API       (varies)           (funded via     
                   (sat/vbyte).                          Ramp)           

  **Solana**       Flat fee per       \<\$0.01 USD       Marketeq        Yes ---
                   transaction.       equivalent         treasury wallet labeled
                                                         (funded via     \"minimal\"
                                                         Transak)        

  **Ramp/Transak   Bridge includes    Included in        Covered by      No ---
  bridge**         gas in their       conversion spread  bridge. Not     included in
                   spread or charges                     shown           conversion
                   separately.                           separately.     rate
  -------------------------------------------------------------------------------------

## **4.2 Gas estimation before broadcast (direct EVM path)**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/execution/gas-estimator.service.ts                             |
|                                                                       |
| // Called before every direct EVM transfer to calculate net amount    |
|                                                                       |
| async estimateGasUSD(                                                 |
|                                                                       |
| network: string,                                                      |
|                                                                       |
| toAddress: string,                                                    |
|                                                                       |
| token: string,                                                        |
|                                                                       |
| amountWei: bigint,                                                    |
|                                                                       |
| ): Promise\<{ gasUSD: number; gasWei: bigint }\> {                    |
|                                                                       |
| const provider = this.getProvider(network); // ethers.js              |
| JsonRpcProvider                                                       |
|                                                                       |
| // Estimate gas units                                                 |
|                                                                       |
| const gasUnits = await provider.estimateGas({                         |
|                                                                       |
| to: toAddress,                                                        |
|                                                                       |
| value: token === \"ETH\" ? amountWei : 0n,                            |
|                                                                       |
| data: token !== \"ETH\"                                               |
|                                                                       |
| ? this.buildERC20TransferData(toAddress, amountWei)                   |
|                                                                       |
| : \"0x\",                                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Get current base fee + priority tip                                |
|                                                                       |
| const feeData = await provider.getFeeData();                          |
|                                                                       |
| const maxFeeGwei = (feeData.maxFeePerGas ?? feeData.gasPrice)!;       |
|                                                                       |
| const gasCostWei = gasUnits \* maxFeeGwei;                            |
|                                                                       |
| // Convert gas cost to USD for display                                |
|                                                                       |
| const ethRate = await this.conversionService.getDisplayRate(\"ETH\",  |
| \"USD\");                                                             |
|                                                                       |
| const gasUSD = Number(gasCostWei) / 1e18 \* ethRate.rate;             |
|                                                                       |
| return { gasUSD: Math.ceil(gasUSD \* 100) / 100, gasWei: gasCostWei   |
| };                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **4.3 Gas spike protection**

  -----------------------------------------------------------------------
  **Scenario**           **Handling**
  ---------------------- ------------------------------------------------
  **Estimated gas \> 10% Payout paused. Queued for retry in 30 minutes
  of payout amount**     when gas may be lower. Contractor notified:
                         \"Your payout is queued pending lower network
                         fees.\"

  **Gas estimate fails   Payout execution retried with exponential
  (RPC error)**          backoff (PS-02 retry logic). After 3 failures:
                         payout_requests.status = failed.
                         ERR_GAS_ESTIMATION_FAILED.

  **Gas price rises      Transaction broadcast uses maxFeePerGas cap =
  between estimate and   estimate × 1.25. If actual gas exceeds cap,
  broadcast**            transaction not broadcast. Retry with fresh
                         estimate.
  -----------------------------------------------------------------------

# **5. Settlement Timing by Provider and Network**

  ---------------------------------------------------------------------------------
  **Network /        **Bridge    **Estimated       **Confirmations   **Notes**
  Provider**         used**      settlement time** required**        
  ------------------ ----------- ----------------- ----------------- --------------
  **Ethereum --- ETH Treasury    2--15 minutes     12 block          Fast on low
  (direct)**         wallet                        confirmations     congestion.
                                                   (\~2.4 min at     Slow during
                                                   12s/block)        high gas
                                                                     periods.

  **Ethereum ---     Treasury    2--15 minutes     12 block          Same as ETH
  USDC ERC-20        wallet                        confirmations     transfer
  (direct)**                                                         

  **Polygon ---      Treasury    30 seconds--2     128 block         Fastest EVM
  MATIC/USDC**       wallet      minutes           confirmations     settlement
                                                   (\~4 min at       
                                                   \~2s/block)       

  **BNB Smart Chain  Treasury    1--3 minutes      15 block          Fast and cheap
  --- BNB/USDT**     wallet                        confirmations     
                                                   (\~45s at         
                                                   \~3s/block)       

  **Bitcoin --- BTC  Ramp        30 minutes--3     3 confirmations   Most variable.
  (via Ramp)**                   business days     (\~30 min) to 6   Depends on
                                                   confirmations     mempool
                                                   (\~60 min)        congestion and
                                                                     fee rate.

  **Solana ---       Transak     5--30 minutes     1 confirmation    Near-instant
  SOL/USDC (via                                    (\~400ms) +       on-chain but
  Transak)**                                       Transak           Transak
                                                   processing        processing
                                                                     adds time

  **Ramp widget      Ramp        15 minutes--1     Ramp-managed      Ramp absorbs
  (ETH/BTC/USDC)**               business day                        settlement
                                                                     complexity

  **Transak (all     Transak     15 minutes--1     Transak-managed   Transak
  tokens)**                      business day                        absorbs
                                                                     settlement
                                                                     complexity
  ---------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Estimated arrival shown to contractor is conservative**             |
|                                                                       |
| The estimated arrival time shown on the withdrawal review screen and  |
| confirmation                                                          |
|                                                                       |
| notification uses the upper bound for the relevant network --- not    |
| the average.                                                          |
|                                                                       |
| Example: Ethereum shows \"2--15 minutes\". Bitcoin shows \"up to 3    |
| business days\".                                                      |
|                                                                       |
| This prevents contractor support escalations when settlement takes    |
| longer than expected.                                                 |
+=======================================================================+

# **6. Minimum Payout Amounts by Token**

Minimums exist because gas fees can exceed the payout amount on
low-value withdrawals, and bridge providers have their own minimum order
sizes. The effective minimum is max(Marketeq minimum, bridge minimum,
gas cost × 10 safety factor).

  ------------------------------------------------------------------------------------
  **Token**   **Network**   **Marketeq     **Bridge    **Gas × 10 safety **Effective
                            minimum        minimum**   factor            minimum**
                            (USD)**                    (approx.)**       
  ----------- ------------- -------------- ----------- ----------------- -------------
  **ETH**     Ethereum      \$20.00        Ramp: \$10  \~\$50--\$150 at  \$50 USD
                                           / Transak:  high gas          minimum
                                           \$10                          enforced.
                                                                         Warn
                                                                         contractor if
                                                                         gas \> 10% of
                                                                         amount.

  **BTC**     Bitcoin       \$20.00        Ramp: \$10  \~\$10--\$50      \$20 USD
                                                                         minimum. Ramp
                                                                         enforces its
                                                                         own floor.

  **USDC**    Ethereum      \$20.00        Transak:    \~\$5--\$15       \$20 USD
              (ERC-20)                     \$10        (ERC-20 transfer) minimum

  **USDC**    Polygon       \$5.00         Transak:    \<\$0.01          \$5 USD
                                           \$5                           minimum

  **USDT**    BNB Smart     \$5.00         Transak:    \~\$0.20          \$5 USD
              Chain                        \$5                           minimum

  **BNB**     BNB Smart     \$5.00         Transak:    \~\$0.20          \$5 USD
              Chain                        \$5                           minimum

  **MATIC**   Polygon       \$5.00         Transak:    \<\$0.01          \$5 USD
                                           \$5                           minimum

  **SOL**     Solana        \$5.00         Transak:    \<\$0.01          \$5 USD
                                           \$5                           minimum

  **LTC**     Litecoin      \$10.00        Ramp: \$10  \~\$0.50          \$10 USD
                                                                         minimum
  ------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Minimum amount validation in PayoutValidator                       |
|                                                                       |
| // Called during initiate flow before payout_requests row is created  |
|                                                                       |
| validateCryptoMinimum(                                                |
|                                                                       |
| amountUSD: number,                                                    |
|                                                                       |
| token: string,                                                        |
|                                                                       |
| network: string,                                                      |
|                                                                       |
| ): void {                                                             |
|                                                                       |
| const minimums: Record\<string, number\> = {                          |
|                                                                       |
| \"ETH:ethereum\": 50,                                                 |
|                                                                       |
| \"BTC:bitcoin\": 20,                                                  |
|                                                                       |
| \"USDC:ethereum\": 20,                                                |
|                                                                       |
| \"USDC:polygon\": 5,                                                  |
|                                                                       |
| \"USDT:bsc\": 5,                                                      |
|                                                                       |
| \"BNB:bsc\": 5,                                                       |
|                                                                       |
| \"MATIC:polygon\": 5,                                                 |
|                                                                       |
| \"SOL:solana\": 5,                                                    |
|                                                                       |
| \"LTC:litecoin\": 10,                                                 |
|                                                                       |
| };                                                                    |
|                                                                       |
| const key = \`\${token}:\${network}\`;                                |
|                                                                       |
| const min = minimums\[key\] ?? 20; // default \$20 for unlisted       |
|                                                                       |
| if (amountUSD \< min)                                                 |
|                                                                       |
| throw new PayoutError(                                                |
|                                                                       |
| \`Minimum payout for \${token} on \${network} is \$\${min} USD.\`,    |
|                                                                       |
| HttpStatus.UNPROCESSABLE_ENTITY,                                      |
|                                                                       |
| \"ERR_CRYPTO_BELOW_MINIMUM\",                                         |
|                                                                       |
| { token, network, minimumUSD: min, requestedUSD: amountUSD },         |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **7. Tokens --- Actual Payout vs Display Only**

  ----------------------------------------------------------------------------
  **Token**    **Network**     **Actual payout  **Display     **Notes**
                               supported**      rate shown**  
  ------------ --------------- ---------------- ------------- ----------------
  **ETH**      Ethereum        Yes              Yes           Primary EVM
                                                              token. Direct
                                                              treasury
                                                              transfer.

  **BTC**      Bitcoin         Yes              Yes           Via Ramp. Most
                                                              requested crypto
                                                              payout.

  **USDC**     Ethereum        Yes              Yes           Stablecoin.
                                                              ERC-20 direct
                                                              transfer.

  **USDC**     Polygon         Yes              Yes           Low-fee
                                                              stablecoin
                                                              option.

  **USDT**     BNB Smart Chain Yes              Yes           BEP-20. Via
                                                              treasury direct.

  **BNB**      BNB Smart Chain Yes              Yes           Via treasury
                                                              direct.

  **MATIC**    Polygon         Yes              Yes           Via treasury
                                                              direct.

  **SOL**      Solana          Yes              Yes           Via Transak.

  **LTC**      Litecoin        Yes              Yes           Via Ramp.

  **DAI**      Ethereum        No --- display   Yes           Not supported
                               only                           for payout in
                                                              v1. Shown as
                                                              unsupported in
                                                              UI.

  **BUSD**     BNB Smart Chain No --- display   Yes           Deprecated by
                               only                           Binance. Not
                                                              supported.

  **TRX**      Tron            No --- display   No            Not supported in
                               only                           v1.

  **Any ERC-20 Ethereum        No               No            Not supported in
  beyond                                                      v1. Only ETH and
  USDC/DAI**                                                  USDC.
  ----------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Never execute a payout to an unsupported token**                    |
|                                                                       |
| If a deposit method was created with a token that is not in the       |
| \"actual payout supported\" list,                                     |
|                                                                       |
| payout execution must throw ERR_CRYPTO_TOKEN_NOT_SUPPORTED before any |
| funds move.                                                           |
|                                                                       |
| This check must happen in PayoutExecutor before the bridge API call.  |
|                                                                       |
| The deposit_methods row must be updated: verificationStatus = failed, |
|                                                                       |
| and the contractor must be notified to add a supported method.        |
+=======================================================================+

# **8. Failed Transaction Handling and Retry Logic**

## **8.1 Failure categories**

  ------------------------------------------------------------------------------------------------
  **Failure type**    **Detection       **Retry?**    **Max         **Action after max retries**
                      method**                        retries**     
  ------------------- ----------------- ------------- ------------- ------------------------------
  **Gas estimation    eth_estimateGas   Yes ---       3 attempts    payout_requests.status =
  failed (RPC         throws            exponential   over 15 min   failed.
  error)**                              backoff                     ERR_GAS_ESTIMATION_FAILED.

  **Gas too high (\>  Gas spike check   Yes ---       3 attempts,   Payout failed. Notify
  10% of payout)**    before broadcast  delayed retry 30-min        contractor. Suggest retry
                                                      intervals     during low-gas period.

  **Bridge API error  Bridge HTTP       Yes ---       3 attempts    payout_requests.status =
  (5xx)**             response          exponential   over 30 min   failed.
                                        backoff                     ERR_BRIDGE_UNAVAILABLE.

  **Bridge rejected   Bridge returns    No --- not    N/A           payout_requests.status =
  (invalid address)** 4xx with address  retryable                   failed.
                      error                                         ERR_CRYPTO_ADDRESS_REJECTED.
                                                                    Contractor must update
                                                                    address.

  **Transaction       ethers.js         Yes ---       3 attempts    payout_requests.status =
  broadcast failed    sendTransaction   exponential                 failed.
  (RPC error)**       throws            backoff                     ERR_TX_BROADCAST_FAILED.

  **Transaction stuck Polling tx        Yes ---       1 rebroadcast If rebroadcast also stuck:
  in mempool (\> 2    receipt for 2     rebroadcast   attempt       payout failed. Manual
  hours)**            hours with no     with higher                 intervention required.
                      confirmation      gas                         

  **Transaction       Receipt.status =  No --- not    N/A           payout_requests.status =
  reverted on-chain** 0                 retryable                   failed. ERR_TX_REVERTED. Funds
                                                                    remain in treasury. Contractor
                                                                    notified.

  **Bridge payout     Bridge sends      No ---        N/A           payout_requests.status =
  reversed            REVERSED webhook  escalate                    reversed. Finance team
  post-settlement**                                                 alerted. Manual reprocessing.
  ------------------------------------------------------------------------------------------------

## **8.2 Funds safety on failure**

+-----------------------------------------------------------------------+
| **Funds never lost on failure --- all failure paths preserve USD      |
| balance**                                                             |
|                                                                       |
| Step 3 of the money flow (Stripe internal ledger debit) only executes |
| after payout execution                                                |
|                                                                       |
| SUCCEEDS. If bridge call or on-chain broadcast fails, no Stripe debit |
| occurs.                                                               |
|                                                                       |
| The contractor\'s USD earnings balance is only debited after          |
| payout-service receives                                               |
|                                                                       |
| confirmed settlement from the bridge webhook (RELEASE_FINISHED /      |
| order.complete).                                                      |
|                                                                       |
| This means all failure paths in §8.1 leave the contractor\'s balance  |
| intact.                                                               |
|                                                                       |
| The only exception is transaction reversal post-settlement ---        |
| handled separately as a finance escalation.                           |
+=======================================================================+

## **8.3 Retry service**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/execution/crypto-retry.service.ts                              |
|                                                                       |
| // Exponential backoff retry for transient bridge/RPC failures        |
|                                                                       |
| async executeWithRetry\<T\>(                                          |
|                                                                       |
| fn: () =\> Promise\<T\>,                                              |
|                                                                       |
| context: { payoutRequestId: string; attempt: number },                |
|                                                                       |
| maxAttempts = 3,                                                      |
|                                                                       |
| ): Promise\<T\> {                                                     |
|                                                                       |
| const delays = \[0, 60_000, 300_000\]; // 0s, 1min, 5min              |
|                                                                       |
| for (let i = 0; i \< maxAttempts; i++) {                              |
|                                                                       |
| if (delays\[i\] \> 0)                                                 |
|                                                                       |
| await new Promise(r =\> setTimeout(r, delays\[i\]));                  |
|                                                                       |
| try {                                                                 |
|                                                                       |
| return await fn();                                                    |
|                                                                       |
| } catch (err: any) {                                                  |
|                                                                       |
| const isRetryable = this.isRetryable(err);                            |
|                                                                       |
| this.logger.warn(                                                     |
|                                                                       |
| \`Crypto payout attempt \${i + 1} failed\`,                           |
|                                                                       |
| { payoutRequestId: context.payoutRequestId, error: err.message,       |
| isRetryable }                                                         |
|                                                                       |
| );                                                                    |
|                                                                       |
| if (!isRetryable \|\| i === maxAttempts - 1) throw err;               |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| throw new Error(\"unreachable\");                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| private isRetryable(err: any): boolean {                              |
|                                                                       |
| // 5xx bridge errors and RPC connection errors are retryable          |
|                                                                       |
| // 4xx bridge errors (bad address, unsupported token) are not         |
|                                                                       |
| if (err.status \>= 500) return true;                                  |
|                                                                       |
| if (err.code === \"NETWORK_ERROR\" \|\| err.code === \"TIMEOUT\")     |
| return true;                                                          |
|                                                                       |
| return false;                                                         |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **9. Regulatory Classification by Jurisdiction**

+-----------------------------------------------------------------------+
| **This section documents current operational guidance --- not legal   |
| advice**                                                              |
|                                                                       |
| Regulatory treatment of crypto payouts varies by jurisdiction and     |
| changes frequently.                                                   |
|                                                                       |
| This section reflects Marketeq\'s current operational understanding   |
| for v1 launch.                                                        |
|                                                                       |
| Legal counsel must review before any expansion to new jurisdictions.  |
|                                                                       |
| Marketeq is not a money transmitter for crypto payouts --- Ramp and   |
| Transak hold                                                          |
|                                                                       |
| the relevant money transmission licenses in each jurisdiction they    |
| operate.                                                              |
+=======================================================================+

  -------------------------------------------------------------------------------------------------
  **Jurisdiction**   **Classification**   **Tax treatment for **Marketeq reporting **Notes**
                                          contractor**        obligation**         
  ------------------ -------------------- ------------------- -------------------- ----------------
  **United States**  Property (IRS Notice Contractor receives 1099-NEC issued for  Ramp and Transak
                     2014-21). Not        crypto FMV at time  total USD earnings   are licensed
                     currency.            of payout as        (already handled by  MSBs (FinCEN).
                                          ordinary income.    earnings-service).   Marketeq is not
                                          Self-reported on    Crypto conversion is the converter
                                          Schedule C.         contractor\'s tax    --- bridge is.
                                                              event.               

  **European Union   Crypto-asset. MiCA   Income tax on FMV   None beyond standard Ramp and Transak
  (MiCA)**           applies from Dec     at receipt.         contractor payment   hold MiCA
                     2024.                Country-specific.   reporting.           authorization.
                                                                                   Marketeq relies
                                                                                   on bridge
                                                                                   licensing.

  **United Kingdom** Cryptoasset (HMRC).  Income tax on GBP   None specific to     FCA registration
                                          value at receipt.   crypto beyond        required for
                                          CGT on future       standard contractor  crypto
                                          disposal.           reporting.           operations.
                                                                                   Ramp/Transak
                                                                                   hold FCA
                                                                                   registration.

  **Canada**         Commodity (CRA).     Business income at  T4A issued for total Ramp/Transak
                                          CAD value at        earnings (same as    operate under
                                          receipt.            fiat).               FINTRAC VASP
                                                                                   registration.

  **Australia**      Property (ATO).      Income on AUD value None specific beyond Ramp/Transak
                                          at receipt. CGT on  standard contractor  hold AUSTRAC
                                          disposal.           reporting.           registration.

  **OFAC-blocked     Prohibited           N/A                 N/A                  Same OFAC block
  jurisdictions**                                                                  list from PS-07.
                                                                                   Crypto payouts
                                                                                   blocked for all
                                                                                   16 restricted
                                                                                   countries. Check
                                                                                   at method
                                                                                   creation AND at
                                                                                   execution time.
  -------------------------------------------------------------------------------------------------

## **9.1 OFAC double-check at execution**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // OFAC check fires twice for crypto payouts:                         |
|                                                                       |
| // 1. At method creation (POST /v1/deposit-methods) --- per PS-07     |
|                                                                       |
| // 2. At payout execution --- contractor country may have changed, or |
| sanction list updated                                                 |
|                                                                       |
| async checkOFACAtExecution(                                           |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| walletAddress: string,                                                |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| const contractor = await                                              |
| this.contractorService.getById(contractorId);                         |
|                                                                       |
| if (OFAC_BLOCKED_COUNTRIES.includes(contractor.country))              |
|                                                                       |
| throw new PayoutError(                                                |
|                                                                       |
| \"Payout cannot be processed due to regulatory restrictions in your   |
| region.\",                                                            |
|                                                                       |
| HttpStatus.FORBIDDEN,                                                 |
|                                                                       |
| \"ERR_PAYOUT_OFAC_BLOCKED\",                                          |
|                                                                       |
| );                                                                    |
|                                                                       |
| // Also check wallet address against OFAC SDN list (Chainalysis or    |
| similar)                                                              |
|                                                                       |
| // For v1: use Chainalysis API to screen wallet address before        |
| broadcast                                                             |
|                                                                       |
| await this.chainalysisService.screenAddress(walletAddress);           |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **10. Error Code Reference**

  -------------------------------------------------------------------------------------
  **Error code**                       **HTTP     **When thrown**
                                       status**   
  ------------------------------------ ---------- -------------------------------------
  **ERR_CRYPTO_BELOW_MINIMUM**         422        Payout amount below token/network
                                                  minimum. minimumUSD and requestedUSD
                                                  in metadata.

  **ERR_CRYPTO_TOKEN_NOT_SUPPORTED**   422        Token on deposit method is
                                                  display-only --- not supported for
                                                  actual payout execution.

  **ERR_GAS_ESTIMATION_FAILED**        503        eth_estimateGas RPC call failed after
                                                  3 retries.

  **ERR_GAS_TOO_HIGH**                 422        Estimated gas exceeds 10% of payout
                                                  amount. Payout queued for retry.

  **ERR_BRIDGE_UNAVAILABLE**           503        Bridge API (Ramp or Transak) returned
                                                  5xx after 3 retries.

  **ERR_CRYPTO_ADDRESS_REJECTED**      422        Bridge rejected the wallet address as
                                                  invalid or unsupported.

  **ERR_TX_BROADCAST_FAILED**          503        ethers.js sendTransaction failed
                                                  after 3 retries.

  **ERR_TX_REVERTED**                  502        On-chain transaction confirmed with
                                                  status=0 (reverted). Funds remain in
                                                  treasury.

  **ERR_PAYOUT_OFAC_BLOCKED**          403        Contractor country or wallet address
                                                  matches OFAC sanctions list.
  -------------------------------------------------------------------------------------

# **11. References**

  -------------------------------------------------------------------------------
  **Document /           **Relevant to**
  Resource**             
  ---------------------- --------------------------------------------------------
  **PS-02 --- Withdrawal payout_requests state machine. Initiation guards. Retry
  Flow & Payout State    integration.
  Machine**              

  **PS-10 --- Crypto     Wallet address storage, encryption, fawazahmed0 display
  Wallet Connection**    rate, network validation

  **PS-11 ---            Bridge provider details, WalletConnect session, provider
  Per-Provider           limitations
  Integration Spec**     

  **PS-07 --- Global     OFAC blocked country list (same list applies to crypto
  Bank Schema            payouts)
  Reference**            

  **ES-06 --- Currency   fawazahmed0 instance and Redis cache pattern (shared)
  Conversion & Display** 

  **Ramp Payouts API**   https://docs.ramp.network/api-reference/payouts

  **Transak Payouts      https://docs.transak.com/docs/server-to-server-payouts
  API**                  

  **Chainalysis API      https://docs.chainalysis.com/api/kyt
  (wallet screening)**   

  **IRS Notice 2014-21** https://www.irs.gov/pub/irs-drop/n-14-21.pdf
  -------------------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-12 \| v1.0
