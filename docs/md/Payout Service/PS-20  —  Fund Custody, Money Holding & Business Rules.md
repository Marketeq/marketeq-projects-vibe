**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-20 --- Fund Custody, Money Holding & Business Rules

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-20 --- Fund Custody, Money Holding & Business
                      Rules

  **Version**         1.0

  **Applies to**      All contractor earnings balances held on the
                      Marketeq platform.

  **Custody model**   Marketeq corporate Stripe account. Pooled balance.
                      No contractor-specific sub-accounts.

  **Interest on held  None. Must be disclosed in contractor Terms of
  funds**             Service.

  **Unclaimed balance Dormancy triggers at 12 months inactivity.
  policy**            Escheatment per applicable US state law.

  **Legal review      Yes --- this document contains operational
  required**          guidance. Legal counsel must review before launch
                      and before any jurisdiction expansion.

  **Prerequisites**   PS-02, PS-15, earnings-service
  -----------------------------------------------------------------------

# **1. Overview**

This document defines how contractor earnings are held by Marketeq, the
legal classification of those funds, the contractor\'s rights to the
balance, holding period limits, what happens to funds in dispute and
cancellation scenarios, interest policy, unclaimed balance handling,
insolvency protections, reserve balance rules, and what must be
disclosed to contractors in the Terms of Service. This document is
operational guidance for engineering, product, and legal. It is not a
legal opinion. Legal counsel must review this document before
contractor-facing language is published.

+-----------------------------------------------------------------------+
| **Legal counsel review required before publishing any                 |
| contractor-facing content**                                           |
|                                                                       |
| This document contains Marketeq\'s current operational understanding  |
| of fund custody rules.                                                |
|                                                                       |
| It is not legal advice. Nothing in this document should be published  |
| to contractors,                                                       |
|                                                                       |
| included in Terms of Service, or used in product copy without review  |
| and approval                                                          |
|                                                                       |
| from qualified legal counsel in each applicable jurisdiction.         |
|                                                                       |
| Regulatory requirements for held funds, escheatment, and unclaimed    |
| property vary by                                                      |
|                                                                       |
| state, country, and fund classification. This document reflects v1 US |
| operations only.                                                      |
+=======================================================================+

# **2. Where Contractor Earnings Are Held**

## **2.1 Custody model**

  -----------------------------------------------------------------------
  **Property**          **Value**
  --------------------- -------------------------------------------------
  **Account type**      Marketeq corporate Stripe account balance. Single
                        pooled account.

  **Account ownership** Marketeq Inc. (or the applicable legal entity).
                        Not the contractor.

  **Sub-accounts per    None. Contractor balances are tracked as a ledger
  contractor**          entry in the earnings-service database --- not as
                        separate Stripe accounts or sub-accounts.

  **Stripe product      Stripe Balance (standard). Not Stripe Treasury,
  used**                not Stripe Connect separate accounts.

  **FDIC insurance**    Stripe holds customer funds in FDIC-insured
                        accounts with partner banks. Coverage applies per
                        Stripe\'s terms --- not per individual
                        contractor. Marketeq must confirm with Stripe the
                        applicable coverage model and disclose it to
                        contractors.

  **Contractor access   Indirect. Contractors access earnings by
  to funds**            initiating a payout via Marketeq. They do not
                        have direct access to the Stripe account.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Contractor balances are accounting entries --- not segregated bank  |
| accounts**                                                            |
|                                                                       |
| When a contractor earns \$500, Marketeq\'s Stripe balance increases   |
| by \$500.                                                             |
|                                                                       |
| The earnings-service database records that contractor X has a \$500   |
| balance.                                                              |
|                                                                       |
| There is no Stripe sub-account holding exactly \$500 for that         |
| contractor.                                                           |
|                                                                       |
| The \$500 is part of the pooled corporate balance --- the ledger      |
| entry is the contractor\'s claim.                                     |
|                                                                       |
| This is standard for marketplace platforms. It has material           |
| implications for                                                      |
|                                                                       |
| insolvency scenarios (see §8) and must be disclosed to contractors.   |
+=======================================================================+

## **2.2 Fund flow from client payment to contractor balance**

  -----------------------------------------------------------------------
  **Step**           **What happens**
  ------------------ ----------------------------------------------------
  **Client pays for  Client pays Marketeq via Stripe (card, ACH, etc.).
  contract**         Funds enter Marketeq Stripe balance.

  **Marketeq deducts 20% service fee retained by Marketeq. 80% allocated
  service fee**      to contractor in earnings-service ledger.

  **Contractor       earnings-service credits contractor balance. No
  earnings           movement of actual funds --- only a ledger update.
  credited**         

  **Contractor       payout-service initiates transfer from Marketeq
  requests payout**  Stripe balance to contractor\'s designated account.
                     Ledger debited.

  **Payout settles** Funds leave Marketeq\'s Stripe balance. Contractor
                     receives funds in their bank/wallet/card.
  -----------------------------------------------------------------------

# **3. Legal Classification of Held Funds**

+-----------------------------------------------------------------------+
| **The legal classification below reflects Marketeq\'s current         |
| operational position --- not a legal determination**                  |
|                                                                       |
| The correct legal classification of held contractor funds depends on  |
| the jurisdiction,                                                     |
|                                                                       |
| the structure of the contractor agreement, and applicable state money |
| transmission laws.                                                    |
|                                                                       |
| Legal counsel must confirm this classification before it is relied    |
| upon in product decisions.                                            |
+=======================================================================+

  -----------------------------------------------------------------------
  **Classification       **Marketeq\'s current position**
  question**             
  ---------------------- ------------------------------------------------
  **Are held funds a     No. Funds are held as an obligation to pay ---
  deposit?**             not as a deposit product. Marketeq is not a bank
                         and does not offer deposit accounts. This must
                         be clearly stated to contractors.

  **Are held funds       Yes --- the contractor has a contractual right
  contractor property?** to the earned balance subject to the terms of
                         the contractor agreement. The funds are owed to
                         the contractor. Marketeq holds them on the
                         contractor\'s behalf as a payable.

  **Is Marketeq a money  Potentially yes in some US states depending on
  transmitter?**         fund flow structure. This determination depends
                         on whether Marketeq is transmitting money on
                         behalf of contractors or clients. Legal counsel
                         and state-by-state MSB registration analysis
                         required before launch.

  **Are held funds       Depends on jurisdiction and money transmitter
  subject to trust       classification. If Marketeq is classified as an
  requirements?**        MSB in a state, that state may require held
                         consumer funds to be held in trust or in a
                         permissible investment. Legal counsel must
                         advise.

  **What are held funds  Not a savings account. Not an investment
  NOT?**                 account. Not FDIC-insured per contractor. Not a
                         custody account under securities law. Not
                         guaranteed against Marketeq insolvency beyond
                         standard unsecured creditor rights.
  -----------------------------------------------------------------------

# **4. Contractor\'s Legal Claim to the Balance**

  -----------------------------------------------------------------------
  **Right**             **Detail**
  --------------------- -------------------------------------------------
  **Right to withdraw** Contractor may withdraw their available balance
                        at any time subject to: KYC completion (PS-15),
                        minimum withdrawal amount (\$50), verified
                        deposit method, and platform terms. Marketeq may
                        not withhold funds without cause.

  **Right to balance    Marketeq must maintain an accurate, auditable
  accuracy**            ledger of each contractor\'s earnings. The
                        balance shown in the UI must reflect the true
                        available balance at all times.

  **Right to payout on  Earnings from completed contracts are credited to
  contract completion** the contractor\'s balance. Credits must be
                        applied within 1 business day of the client
                        billing event.

  **Right to funds in   Funds under active dispute are held but not
  dispute**             forfeited. They remain the contractor\'s balance
                        unless the dispute is resolved against the
                        contractor under the dispute resolution terms.

  **Right to payout on  If a contractor closes their account, any
  account closure**     remaining available balance must be paid out to
                        their designated method. Marketeq may not retain
                        the balance.

  **Limitation ---      If a contractor has configured a reserve (up to
  reserve balance**     \$250), that amount remains in the balance and is
                        not automatically included in scheduled payouts.
                        The reserve is still the contractor\'s funds ---
                        it is a scheduling preference, not a withholding.
  -----------------------------------------------------------------------

# **5. Maximum Holding Periods by Jurisdiction**

+-----------------------------------------------------------------------+
| **Holding period limits are jurisdiction-specific and must be         |
| confirmed with legal counsel**                                        |
|                                                                       |
| The table below reflects Marketeq\'s current operational              |
| understanding of applicable                                           |
|                                                                       |
| holding period limits under US state money transmission and unclaimed |
| property laws.                                                        |
|                                                                       |
| These limits inform platform policy but are not a substitute for      |
| legal advice.                                                         |
+=======================================================================+

  -----------------------------------------------------------------------------
  **Jurisdiction**   **Applicable law**    **Maximum holding  **Mandatory
                                           period before      action**
                                           mandatory action** 
  ------------------ --------------------- ------------------ -----------------
  **United States    No federal maximum    N/A at federal     N/A
  (federal)**        holding period for    level.             
                     marketplace earnings                     
                     balances. Unclaimed                      
                     Property Act applies                     
                     at state level.                          

  **California       CA Unclaimed Property 3 years of owner   Escheat to
  (CA)**             Law (Code of Civil    inactivity.        California State
                     Procedure § 1500 et                      Controller\'s
                     seq.)                                    Office.

  **New York (NY)**  NY Abandoned Property 3 years of         Escheat to NY
                     Law                   dormancy.          Comptroller.

  **Texas (TX)**     TX Property Code      3 years.           Report and remit
                     Chapter 72--75                           to TX
                                                              Comptroller.

  **Delaware (DE)**  12 Del. C. § 1130 et  5 years (general   Escheat to DE
                     seq.                  intangibles).      Department of
                                                              Finance.

  **All other US     Uniform Disposition   Typically 3--5     Escheat to
  states**           of Unclaimed Property years. Varies.     applicable state.
                     Act or equivalent                        

  **Non-US           Applicable home       Not defined for    To be determined.
  contractors**      country law. Varies   v1. Legal counsel  
                     significantly.        required per       
                                           expansion country. 
  -----------------------------------------------------------------------------

Marketeq must implement an unclaimed property compliance program before
launch. This includes: annual dormancy reviews, contractor outreach
before escheatment, state-by-state reporting, and integration with a
specialist unclaimed property compliance vendor (e.g. Sovos, Keane).
Engineering must provide the compliance team with a data export of all
dormant balances on demand.

# **6. Disputed and Cancelled Contracts --- Effect on Held Funds**

## **6.1 Active contract dispute**

  -----------------------------------------------------------------------
  **Scenario**          **Fund handling**
  --------------------- -------------------------------------------------
  **Client initiates    Earnings from the disputed contract are flagged
  dispute on a          in earnings-service as disputed. They remain in
  completed contract**  the contractor\'s balance but are locked ---
                        cannot be included in a payout until the dispute
                        resolves.

  **Dispute resolved in Lock removed. Funds included in next scheduled
  contractor\'s         payout or available for manual withdrawal.
  favour**              

  **Dispute resolved in Disputed earnings reversed from contractor
  client\'s favour      balance. If contractor balance has insufficient
  (full refund)**       funds to cover the reversal (contractor already
                        withdrew): Marketeq absorbs the shortfall in v1.
                        Future versions may implement a clawback hold.
                        Must be disclosed in contractor ToS.

  **Dispute resolved in Partial reversal applied to contractor balance.
  client\'s favour      Remaining unlocked amount available for payout.
  (partial refund)**    

  **Dispute unresolved  Escalated to Marketeq legal / trust & safety
  after 90 days**       team. Funds remain locked. Neither party can
                        access them. Max lock period to be defined by
                        legal counsel.
  -----------------------------------------------------------------------

## **6.2 Cancelled contracts**

  -----------------------------------------------------------------------
  **Cancellation type** **Fund handling**
  --------------------- -------------------------------------------------
  **Contract cancelled  No earnings credited. No fund movement.
  before any work       
  billed**              

  **Contract cancelled  Earnings for completed billing periods remain in
  after partial         contractor balance. Earnings for the cancelled
  billing**             future period are not credited.

  **Contract cancelled  Earnings prorated to the cancellation date (per
  by client mid-billing contract terms). Prorated amount credited to
  period**              contractor balance.

  **Contract cancelled  Same as client cancellation --- prorated earnings
  by contractor**       credited per contract terms. Any applicable early
                        termination fee applied per contract.

  **Contract cancelled  Funds may be withheld pending trust & safety
  due to contractor ToS review. Withholding must have contractual basis
  violation**           and be disclosed in contractor ToS. Legal counsel
                        must define permissible withholding conditions.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // earnings-service --- fund lock on dispute                          |
|                                                                       |
| // When a dispute is opened, earnings-service receives a              |
| contract.disputed event                                               |
|                                                                       |
| // and sets a lock on the affected earnings records                   |
|                                                                       |
| // earnings table --- relevant columns                                |
|                                                                       |
| // is_locked BOOLEAN NOT NULL DEFAULT false                           |
|                                                                       |
| // lock_reason VARCHAR(64) \-- DISPUTE \| TRUST_SAFETY_REVIEW \|      |
| LEGAL_HOLD                                                            |
|                                                                       |
| // locked_at TIMESTAMPTZ                                              |
|                                                                       |
| // locked_by VARCHAR(64) \-- event or actor that triggered the lock   |
|                                                                       |
| // Locked earnings are excluded from available_balance calculation:   |
|                                                                       |
| // available_balance = SUM(amount) WHERE is_locked = false AND status |
| = \'credited\'                                                        |
|                                                                       |
| // payout-service reads available_balance --- it never sees locked    |
| funds                                                                 |
|                                                                       |
| // Locked funds are shown separately in the UI as \"Earnings under    |
| review\"                                                              |
+=======================================================================+

# **7. Interest on Held Funds**

  -----------------------------------------------------------------------
  **Question**           **Answer**
  ---------------------- ------------------------------------------------
  **Does Marketeq pay    No. Marketeq does not pay interest on contractor
  interest on held       balances held on the platform.
  contractor earnings?** 

  **Does Marketeq earn   Potentially yes --- Stripe may earn interest on
  interest on pooled     pooled balances held at partner banks. Marketeq
  funds?**               retains any such interest. Contractors receive
                         none.

  **Must this be         Yes. The absence of interest on held funds and
  disclosed to           the fact that Marketeq may earn interest on the
  contractors?**         pooled balance must be disclosed in the
                         contractor Terms of Service. Failure to disclose
                         may create regulatory exposure in states with
                         money transmitter interest requirements.

  **Are there            Potentially yes for MSB-licensed operations in
  jurisdictions where    certain states. Legal counsel must advise. For
  interest must be       v1, the position is no interest paid --- subject
  paid?**                to legal review.

  **What does this mean  Funds sitting idle in the Marketeq balance do
  for contractors?**     not grow. Contractors should withdraw regularly
                         if they want to earn interest elsewhere.
  -----------------------------------------------------------------------

# **8. Unclaimed Balance Policy --- Inactivity and Escheatment**

## **8.1 Dormancy definition**

  -----------------------------------------------------------------------
  **Event**                         **Resets dormancy clock?**
  --------------------------------- -------------------------------------
  **Contractor logs in**            Yes

  **Contractor initiates a          Yes
  withdrawal**                      

  **Contractor earns new income     Yes
  (contract completes)**            

  **Contractor updates profile or   Yes
  settings**                        

  **Contractor receives a payout    Yes
  (scheduled)**                     

  **Scheduled payout fires but is   No --- system action does not reset
  skipped (below threshold)**       dormancy

  **Marketeq sends a notification   No
  email (no contractor action)**    

  **12 months pass with no          Dormancy threshold reached
  qualifying contractor action**    
  -----------------------------------------------------------------------

## **8.2 Dormancy response timeline**

  -----------------------------------------------------------------------
  **Months of        **Action**
  inactivity**       
  ------------------ ----------------------------------------------------
  **Month 9**        First outreach: email to contractor --- \"We noticed
                     you haven\'t logged in for a while. Your balance of
                     \${amount} is waiting for you.\"

  **Month 11**       Second outreach: email + in-app notification ---
                     \"Your account balance will be subject to unclaimed
                     property laws if no activity is recorded in the next
                     30 days.\"

  **Month 12**       Dormancy threshold reached. Balance flagged as
                     dormant in earnings-service. Internal review begins.

  **Month 12--24**   Compliance team reviews. State-specific holding
                     period countdown starts from original dormancy date.
                     No further payouts processed without contractor
                     re-authentication.

  **State holding    Escheatment: remaining balance reported and remitted
  period end         to applicable state unclaimed property fund.
  (typically 3 years Contractor may reclaim from the state directly.
  from dormancy)**   
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // earnings-service --- dormancy tracking                             |
|                                                                       |
| // contractor_activity table                                          |
|                                                                       |
| CREATE TABLE contractor_activity (                                    |
|                                                                       |
| contractor_id UUID NOT NULL,                                          |
|                                                                       |
| last_activity_at TIMESTAMPTZ NOT NULL,                                |
|                                                                       |
| last_activity_type VARCHAR(64), \-- LOGIN \| WITHDRAWAL \| EARNING \| |
| PROFILE_UPDATE                                                        |
|                                                                       |
| dormant BOOLEAN NOT NULL DEFAULT false,                               |
|                                                                       |
| dormant_since TIMESTAMPTZ,                                            |
|                                                                       |
| escheatment_due_at TIMESTAMPTZ, \-- calculated: dormant_since + state |
| holding period                                                        |
|                                                                       |
| esheated BOOLEAN NOT NULL DEFAULT false,                              |
|                                                                       |
| esheated_at TIMESTAMPTZ,                                              |
|                                                                       |
| state_of_record VARCHAR(2), \-- US state for escheatment jurisdiction |
|                                                                       |
| PRIMARY KEY (contractor_id)                                           |
|                                                                       |
| );                                                                    |
+=======================================================================+

# **9. Insolvency Scenario**

+-----------------------------------------------------------------------+
| **Insolvency scenario must be reviewed by legal counsel and disclosed |
| to contractors**                                                      |
|                                                                       |
| The analysis below describes the likely outcome of Marketeq           |
| insolvency under current                                              |
|                                                                       |
| fund custody structure. It is not a legal determination. Legal        |
| counsel must review.                                                  |
|                                                                       |
| Contractors must be made aware of this risk in the Terms of Service.  |
+=======================================================================+

  -----------------------------------------------------------------------
  **Question**           **Current position**
  ---------------------- ------------------------------------------------
  **What happens to      Under the current pooled balance model,
  contractor balances if contractor balances are unsecured obligations of
  Marketeq becomes       Marketeq. In insolvency, contractors would be
  insolvent?**           unsecured creditors. They would not have
                         priority access to the pooled funds --- they
                         would share with other unsecured creditors in
                         the insolvency estate.

  **Are contractor funds Not under the current structure. Funds are held
  protected from         in a Marketeq corporate account --- they are
  Marketeq creditors?**  part of Marketeq\'s assets. Unlike a trust or
                         segregated account, they are not ring-fenced
                         from Marketeq\'s creditors.

  **Could this be        Yes --- by holding contractor funds in a
  improved?**            segregated trust account separate from Marketeq
                         operating funds. This is required in some
                         jurisdictions for licensed money transmitters.
                         Legal counsel must advise on whether this is
                         required and whether it should be implemented
                         proactively.

  **Must this be         Yes. Contractors must be informed in the Terms
  disclosed to           of Service that their balance is an unsecured
  contractors?**         obligation, that funds are not held in a
                         segregated account, and that in the event of
                         Marketeq insolvency, their balance may not be
                         recoverable in full.

  **What is Marketeq\'s  Marketeq must continue to process payout
  obligation to pay out  requests up to the point of insolvency. It may
  before insolvency?**   not preferentially retain contractor funds to
                         improve its balance sheet.
  -----------------------------------------------------------------------

# **10. Reserve Balance Business Rules**

  -----------------------------------------------------------------------
  **Rule**              **Detail**
  --------------------- -------------------------------------------------
  **What is the         A contractor-configured amount (up to \$250) that
  reserve?**            is excluded from scheduled automatic payouts. The
                        contractor chooses to keep this amount in their
                        Marketeq balance at all times.

  **Is the reserve      Yes. The reserve is the contractor\'s funds. It
  still the             is a scheduling preference --- not a withholding.
  contractor\'s         The contractor can manually withdraw the reserve
  money?**              at any time.

  **Does the reserve    No --- same as all held funds.
  earn interest?**      

  **Can the reserve be  Yes --- if a dispute is resolved against the
  used to cover a       contractor and their balance is insufficient, the
  dispute reversal?**   reserve may be applied to the reversal. The
                        contractor retains any remaining reserve balance.

  **Can Marketeq        No. The reserve amount is set by the contractor.
  increase the reserve  Marketeq cannot unilaterally increase it.
  without contractor    
  consent?**            

  **Can Marketeq hold   No. Marketeq may only hold funds beyond the
  funds beyond the      reserve in the following cases: active dispute
  reserve without       lock, trust & safety review hold, legal hold
  cause?**              (court order or regulatory requirement),
                        first-payout 5-business-day hold (PS-15), or KYC
                        pending hold.

  **Maximum reserve**   \$250.00 USD. Cannot be set higher in the UI.
                        Backend enforces this cap at schedule creation
                        and update.
  -----------------------------------------------------------------------

# **11. Required Terms of Service Disclosures --- Contractor-Facing**

+-----------------------------------------------------------------------+
| **All ToS language must be drafted and approved by legal counsel**    |
|                                                                       |
| The items below identify what must be disclosed --- not the exact     |
| language.                                                             |
|                                                                       |
| Legal counsel must draft all contractor-facing Terms of Service       |
| language.                                                             |
|                                                                       |
| The categories below are engineering and product requirements for     |
| legal to work from.                                                   |
+=======================================================================+

  -----------------------------------------------------------------------
  **ToS item**     **What must be disclosed**        **Priority**
  ---------------- --------------------------------- --------------------
  **Custody        Earnings are held in a Marketeq   P0 --- required at
  model**          corporate account, not a          launch
                   contractor-specific bank account. 
                   Balances are ledger entries       
                   representing amounts owed to the  
                   contractor.                       

  **No interest**  Marketeq does not pay interest on P0 --- required at
                   held balances. Marketeq may earn  launch
                   interest on pooled funds.         

  **Insolvency     Contractor balances are unsecured P0 --- required at
  risk**           obligations. Funds are not held   launch
                   in a segregated trust. In         
                   insolvency, contractors are       
                   unsecured creditors.              

  **Dispute        Earnings from disputed contracts  P0 --- required at
  holds**          may be locked pending resolution. launch
                   Marketeq will notify the          
                   contractor of any lock and the    
                   reason.                           

  **Reversal on    If a dispute is resolved in the   P0 --- required at
  dispute**        client\'s favour, earnings may be launch
                   reversed from the contractor\'s   
                   balance.                          

  **Dormancy and   Balances inactive for an extended P0 --- required at
  escheatment**    period (per applicable state law) launch
                   may be escheated to the relevant  
                   state. Marketeq will attempt to   
                   contact the contractor before     
                   escheatment.                      

  **Reserve        The reserve is the contractor\'s  P0 --- required at
  balance**        funds. It is a scheduling         launch
                   preference. Marketeq may apply    
                   the reserve to dispute reversals. 

  **First-payout   The contractor\'s first payout is P0 --- required at
  hold**           subject to a 5-business-day hold  launch
                   for security reasons.             

  **Withholding    Marketeq may withhold funds       P0 --- required at
  conditions**     pending: active dispute, trust &  launch
                   safety review, KYC completion,    
                   legal hold. Contractor will be    
                   notified of any withholding and   
                   the reason.                       

  **FDIC           Funds held by Stripe may be       P1 --- recommended
  coverage**       covered by FDIC pass-through      
                   insurance subject to Stripe\'s    
                   terms and applicable limits. This 
                   is not a guarantee of             
                   per-contractor coverage.          

  **Payout         Scheduled payouts process per the P1 --- recommended
  timing**         contractor\'s configured          
                   schedule. Marketeq is not liable  
                   for delays caused by third-party  
                   payment providers, banking        
                   holidays, or force majeure        
                   events.                           

  **Account        On account closure, any available P0 --- required at
  closure payout** balance will be paid out to the   launch
                   contractor\'s last verified       
                   deposit method. Locked balances   
                   will be resolved per the          
                   applicable hold policy before     
                   payout.                           

  **No money       If Marketeq is not licensed as a  P0 --- legal counsel
  transmitter      money transmitter in the          to advise on
  licence (if      contractor\'s state, this must be applicability
  applicable)**    disclosed and the implications    
                   explained.                        
  -----------------------------------------------------------------------

# **12. Engineering Requirements from This Document**

  ------------------------------------------------------------------------
  **Requirement**                **Owner**          **Priority**
  ------------------------------ ------------------ ----------------------
  **earnings-service must        earnings-service   P0
  maintain an auditable ledger                      
  of all balance movements with                     
  timestamps, amounts, event                        
  source, and reversal records**                    

  **earnings-service must        earnings-service   P0
  support locking individual                        
  earnings records for disputes                     
  and holding reviews**                             

  **earnings-service must track  earnings-service   P0
  dormancy per contractor and                       
  expose dormancy status to                         
  compliance team via internal                      
  API**                                             

  **payout-service must exclude  payout-service     P0
  locked earnings from                              
  available_balance at all                          
  times**                                           

  **payout-service must enforce  payout-service     P0
  reserve balance exclusion from (PS-17)            
  scheduled payouts**                               

  **payout-service must produce  payout-service +   P0
  a dormant balance report on    earnings-service   
  demand for compliance                             
  escheatment filing**                              

  **Admin dashboard must allow   Admin service      P0
  finance team to apply and                         
  release legal holds with audit                    
  trail**                                           

  **Terms of Service must        Legal + product    P0
  include all P0 disclosures                        
  from §11 before contractor                        
  onboarding is enabled**                           

  **Marketeq must confirm with   Finance + legal    P0
  Stripe the applicable FDIC                        
  coverage model and document it                    
  internally**                                      

  **Legal counsel must determine Legal              P0
  MSB licence requirements by                       
  state and advise on whether                       
  segregated trust accounts are                     
  required**                                        
  ------------------------------------------------------------------------

# **13. References**

  -------------------------------------------------------------------------------------------------------
  **Document /           **Relevant to**
  Resource**             
  ---------------------- --------------------------------------------------------------------------------
  **PS-02 --- Withdrawal payout_requests. Balance debit timing relative to execution.
  Flow & Payout State    
  Machine**              

  **PS-15 ---            First-payout hold. KYC-required holds.
  KYC-Identity Gating**  

  **PS-17 --- Schedule   Reserve exclusion from scheduled payouts.
  Execution Engine**     

  **earnings-service     Earnings ledger, balance calculation, lock mechanism.
  (ES-01 through         
  ES-17)**               

  **FinCEN MSB           https://www.fincen.gov/money-services-business-msb-information-center
  registration**         

  **CA Unclaimed         https://www.sco.ca.gov/upd_msg.html
  Property Law**         

  **Stripe FDIC          https://stripe.com/docs/treasury/money-management/understanding-fdic-insurance
  pass-through           
  insurance**            

  **NAUPA --- Unclaimed  https://www.unclaimedproperty.com
  Property reporting**   
  -------------------------------------------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-20 \| v1.0
