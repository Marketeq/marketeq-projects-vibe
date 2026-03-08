**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-22 --- Compliance & Regulatory Reference (Legal & Financial Experts)

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-22 --- Compliance & Regulatory Reference (Legal
                      & Financial Experts)

  **Version**         1.0 --- DRAFT FOR LEGAL REVIEW

  **Audience**        Compliance officers, legal counsel, financial
                      regulators, and external auditors. Not engineering.

  **Applies to**      All Marketeq contractor payout operations. All
                      jurisdictions where Marketeq accepts contractors.

  **Status**          ⚠️ DRAFT --- Must be reviewed and approved by
                      qualified legal counsel before any
                      contractor-facing obligations are relied upon.

  **Companion         PS-21 covers the same regulations from an
  document**          engineering implementation perspective.

  **Last reviewed by  Pending --- not yet reviewed
  legal**             
  -----------------------------------------------------------------------

# **1. Executive Summary**

This document sets out Marketeq\'s regulatory obligations arising from
its operation of a contractor payout system. Marketeq operates a
marketplace platform through which clients engage independent
contractors for professional services. Marketeq collects payments from
clients, retains a service fee, and disburses the remainder to
contractors via multiple payout channels including ACH bank transfer,
PayPal, Wise, Payoneer, cryptocurrency wallet, and a Marketeq-branded
Visa debit card issued through Stripe Issuing.

This document addresses: the legal classification of Marketeq\'s
fund-holding activities; anti-money laundering and know-your-customer
obligations; tax reporting and withholding requirements; wage payment
law applicability; international payment obligations; required
disclosures to contractors; audit trail and record-keeping requirements;
and the allocation of regulatory responsibility between Marketeq and its
third-party processors.

+-----------------------------------------------------------------------+
| **This document is a compliance reference --- not a legal opinion**   |
|                                                                       |
| Nothing in this document constitutes legal advice or a formal legal   |
| opinion.                                                              |
|                                                                       |
| All obligations described herein must be confirmed by qualified legal |
| counsel                                                               |
|                                                                       |
| in each applicable jurisdiction before Marketeq relies on them.       |
|                                                                       |
| Regulatory requirements change. This document must be reviewed        |
| annually                                                              |
|                                                                       |
| and updated whenever Marketeq launches in a new jurisdiction or a     |
| material                                                              |
|                                                                       |
| regulatory change occurs.                                             |
|                                                                       |
| Marketeq must retain qualified legal counsel with expertise in        |
| payments law,                                                         |
|                                                                       |
| money transmission, and tax in each jurisdiction where it operates.   |
+=======================================================================+

# **2. Legal Classification of Marketeq\'s Fund-Holding Activity**

## **2.1 Nature of the obligation to contractors**

When a client makes a payment to Marketeq for contractor services,
Marketeq receives those funds as principal --- not as agent. The
platform fee is retained and the net amount becomes an obligation owed
by Marketeq to the contractor, recorded as a payable in Marketeq\'s
internal ledger. This is a contractual debt obligation, not a deposit,
not a trust, and not a custodial arrangement (unless and until Marketeq
is required by applicable law to establish a trust or segregated
account).

  ------------------------------------------------------------------------
  **Classification   **Current Marketeq          **Legal risk if
  question**         position**                  classification is wrong**
  ------------------ --------------------------- -------------------------
  **Money            Marketeq may constitute a   Unlicensed money
  transmitter (US)** money transmitter under     transmission is a
                     FinCEN\'s definition and    criminal offence in most
                     applicable state money      US states. Penalties
                     transmission statutes,      include fines, cease and
                     depending on whether it is  desist orders, and
                     deemed to be transferring   disgorgement. Most
                     value on behalf of third    consequential states:
                     parties. This determination California (DBO), New
                     is state-specific and       York (BitLicense/DFS),
                     fact-dependent.             Texas, Florida,
                                                 Washington.

  **Electronic Money Marketeq may require an EMI Operating without
  Institution (EU)** licence or a payment        authorisation in the EU:
                     institution licence under   regulatory sanctions,
                     PSD2/EMD2 if it holds       prohibition orders,
                     contractor funds or         reputational damage. Must
                     executes payment            be confirmed before any
                     transactions within the EU. EU contractor onboarding.

  **Authorised       Post-Brexit, UK FCA         Carrying on regulated
  Payment            authorisation is required   payment services without
  Institution (UK)** separately from EU.         FCA authorisation is a
                     Marketeq may require FCA    criminal offence (FSMA
                     registration as a payment   2000 s.23).
                     institution or small        
                     payment institution.        

  **Deposit-taking   Marketeq does not take      If incorrectly classified
  institution**      deposits in the regulatory  as a deposit-taker: full
                     sense --- it does not hold  banking licence required.
                     funds at the direction of   Very unlikely given
                     the payer for safekeeping.  current structure.
                     This classification should  
                     not apply.                  

  **Marketplace /    The most defensible         Classification as payment
  payment            classification in many      facilitator rather than
  facilitator**      jurisdictions: Marketeq is  money transmitter may
                     a payment facilitator       reduce licensing
                     acting as a commercial      requirements in some
                     intermediary, not a money   states but is not
                     transmitter, because funds  universally accepted.
                     flow through Marketeq as    Legal counsel must assess
                     part of a commercial        state by state.
                     transaction rather than as  
                     a stand-alone money         
                     transfer service.           
  ------------------------------------------------------------------------

## **2.2 Fund segregation requirements**

Under the current structure, contractor earnings are held in Marketeq\'s
corporate Stripe account --- a pooled operating account, not a
segregated trust. If Marketeq is classified as a money transmitter in
any jurisdiction, that jurisdiction is likely to require permissible
investments or a statutory trust for held consumer funds. Legal counsel
must assess this requirement state by state before launch. The following
states are known to have permissible investment requirements for MSBs
holding consumer funds: California, New York, Texas, Florida, Illinois,
Washington, and Virginia.

# **3. Anti-Money Laundering and Know-Your-Customer Requirements**

## **3.1 Federal AML obligations (US)**

If Marketeq is classified as a Money Services Business (MSB) under 31
CFR Part 1010, it must establish and maintain a written Anti-Money
Laundering programme. The AML programme must include at minimum:
internal policies, procedures, and controls; designation of a compliance
officer; ongoing employee training; and independent review.

  ------------------------------------------------------------------------
  **AML programme       **Regulatory       **Marketeq implementation
  element**             basis**            status**
  --------------------- ------------------ -------------------------------
  **Written AML policy  31 CFR § 1022.210  Required. Must be drafted
  and procedures**      (MSBs)             before launch if Marketeq is
                                           classified as an MSB.

  **Designation of a    31 CFR §           Required. Named individual with
  BSA/AML compliance    1022.210(d)        day-to-day AML responsibility.
  officer**                                

  **Customer            31 CFR § 1022.210  For MSBs: collect name,
  Identification        / BSA              address, date of birth, and
  Programme (CIP)**                        TIN/ID for contractors.
                                           kyc-identity-service Tier 1 and
                                           Tier 2 gates implement this
                                           technically.

  **Suspicious Activity 31 CFR § 1022.320  MSBs must file SARs for
  Report (SAR) filing**                    transactions of \$2,000 or more
                                           that are suspected of involving
                                           illegal activity. Must file
                                           within 30 days of detection.

  **Currency            31 CFR § 1010.311  MSBs must file CTRs for cash
  Transaction Report                       transactions exceeding
  (CTR) filing**                           \$10,000. Note: Marketeq\'s ACH
                                           and crypto transactions are not
                                           cash --- confirm applicability
                                           with legal counsel. EDD trigger
                                           at \$10,000 is a precautionary
                                           measure (PS-21 §4).

  **Record keeping ---  31 CFR § 1010.415  For funds transfers of \$3,000
  transactions \>=                         or more: MSBs must retain
  \$3,000**                                sender name, address, and
                                           financial institution details
                                           for 5 years.

  **OFAC screening**    Executive Orders / All contractors and
                        31 CFR Chapter V   transactions screened against
                                           OFAC SDN list. Implemented at
                                           method creation and at every
                                           payout execution (PS-21 §6).

  **Structuring         31 CFR § 1010.314  Illegal to structure
  detection**                              transactions to evade reporting
                                           thresholds. Marketeq must
                                           implement pattern detection for
                                           transactions designed to stay
                                           below \$10,000. Currently a
                                           roadmap item --- must be
                                           implemented before MSB
                                           operations commence.
  ------------------------------------------------------------------------

## **3.2 KYC tier requirements**

  -----------------------------------------------------------------------------
  **KYC tier**     **What is           **Regulatory basis**  **When required**
                   collected**                               
  ---------------- ------------------- --------------------- ------------------
  **Tier 1 ---     Government-issued   BSA CIP requirements  All contractors
  Identity         photo ID. Name,     (if MSB). OFAC        --- before any
  verification**   date of birth,      screening             payout is
                   address. Identity   prerequisite. Stripe  processed.
                   match via           Issuing requirement   
                   third-party         for card issuance.    
                   verification                              
                   provider.                                 

  **Tier 2 --- Tax US contractors: SSN IRC § 3406 (backup    US contractors:
  identity**       or EIN (W-9).       withholding). IRS     before earnings
                   International       1099-NEC reporting    reach \$600 YTD.
                   individual          requirements. FATCA   International:
                   contractors:        for international     before any payout.
                   W-8BEN.             contractors.          
                   International                             
                   entity contractors:                       
                   W-8BEN-E.                                 

  **Tier 3 ---     Micro-deposit       NACHA Rules (account  Contractors using
  Bank account     verification or     ownership             bank account as
  ownership**      Stripe Financial    verification before   deposit method
                   Connections instant ACH credits). Fraud   only.
                   verification.       prevention best       
                                       practice.             

  **Enhanced Due   Additional identity FinCEN guidance on    Any single payout
  Diligence        and source-of-funds high-risk             of \$10,000 or
  (EDD)**          documentation.      transactions. BSA     more.
                   Compliance officer  suspicious activity   
                   review.             monitoring.           
  -----------------------------------------------------------------------------

## **3.3 International AML obligations**

  ------------------------------------------------------------------------------
  **Jurisdiction**   **AML framework**     **Marketeq obligation**
  ------------------ --------------------- -------------------------------------
  **European Union** EU Anti-Money         If Marketeq holds funds or processes
                     Laundering Directives payments in the EU: AML programme
                     (AMLD5, AMLD6).       required per applicable national law.
                     Implemented via       Customer due diligence (CDD),
                     national law in each  beneficial ownership verification,
                     member state.         SAR filing with national FIU.

  **United Kingdom** Proceeds of Crime Act If Marketeq processes payments in the
                     2002, Money           UK: AML/CTF programme required.
                     Laundering            Suspicious Activity Reports (SARs)
                     Regulations 2017,     filed with National Crime Agency
                     Terrorism Act 2000.   (NCA). CDD on contractors.

  **Canada**         Proceeds of Crime     If Marketeq is a FINTRAC-regulated
                     (Money Laundering)    money services business: CDD,
                     and Terrorist         transaction reporting, SAR equivalent
                     Financing Act         (STR) to FINTRAC.
                     (PCMLTFA).            

  **Australia**      AML/CTF Act 2006.     If Marketeq provides designated
                     AUSTRAC oversight.    services in Australia: enrolment with
                                           AUSTRAC, AML/CTF programme,
                                           suspicious matter reports (SMRs).

  **FATF standards   Financial Action Task Marketeq\'s AML programme should be
  (global)**         Force 40              designed to meet FATF standards as a
                     Recommendations.      baseline --- even in jurisdictions
                                           without specific national
                                           requirements. Provides defensibility
                                           in regulatory investigations.
  ------------------------------------------------------------------------------

# **4. Fund-Holding Legal Obligations**

## **4.1 Permissible investment requirements by US state**

US states that license money transmitters typically require licensees to
maintain permissible investments equal to the aggregate value of
outstanding payment obligations to consumers. The following is not an
exhaustive list --- legal counsel must conduct a state-by-state analysis
for all states where Marketeq will operate.

  --------------------------------------------------------------------------------
  **State**        **Statute**        **Permissible investments **Notes**
                                      requirement**             
  ---------------- ------------------ ------------------------- ------------------
  **California**   CA Financial Code  Licensee must maintain    CA DBO enforces.
                   §§ 2010--2080      permissible investments   Permissible
                                      in an amount equal to or  investments
                                      greater than the          include: US
                                      aggregate payment         government
                                      instrument liability      securities,
                                      outstanding.              FDIC-insured
                                                                deposits,
                                                                investment grade
                                                                bonds.

  **New York**     NY Banking Law     Licensee must maintain    NYDFS oversight.
                   Article XIII-B     permissible investments   Strict examination
                                      to cover outstanding      programme.
                                      payment obligations.      

  **Texas**        TX Finance Code    Net worth and permissible Texas DBO
                   Chapter 151        investment requirements   enforces.
                                      for money transmission    
                                      licence.                  

  **Florida**      FL Stat. § 560     Money transmitter         OFR oversight.
                                      licence + permissible     
                                      investments + surety      
                                      bond.                     

  **Washington**   WA RCW 19.230      Licensee must maintain    WA DFI enforces.
                                      permissible investments   
                                      equal to aggregate        
                                      outstanding obligations.  

  **Illinois**     205 ILCS 657       Permissible investments   IDFPR oversight.
                   (Transmitters of   required.                 
                   Money Act)                                   
  --------------------------------------------------------------------------------

## **4.2 Surety bond requirements**

Many US states require money transmitter licensees to post a surety bond
as a condition of licensure. Bond amounts vary by state and by the
volume of transactions processed. Marketeq\'s finance and legal teams
must assess surety bond requirements in all states where a money
transmitter licence is obtained. Typical bond amounts range from
\$25,000 (smaller states) to \$500,000 or more (California, New York).

## **4.3 No-interest disclosure obligation**

Marketeq does not pay interest on contractor balances held on the
platform. This must be disclosed to contractors in the Terms of Service.
Some state money transmission statutes expressly permit licensees to
retain interest earned on pooled funds, but this must be disclosed. In
states where the regulatory classification is unclear, the safest
approach is to disclose that (i) no interest is paid to contractors on
held balances, and (ii) Marketeq may earn interest on the pooled
account, which it retains.

# **5. Wage Payment Laws by US State**

+-----------------------------------------------------------------------+
| **Contractor classification is the threshold question --- wage        |
| payment laws apply to employees, not independent contractors**        |
|                                                                       |
| US wage payment laws govern timing and method of payment to           |
| employees.                                                            |
|                                                                       |
| They do not apply to independent contractors as a matter of federal   |
| law.                                                                  |
|                                                                       |
| However, several states (notably California under AB5, New York, New  |
| Jersey)                                                               |
|                                                                       |
| apply a rebuttable presumption of employee status to platform         |
| workers.                                                              |
|                                                                       |
| If any Marketeq contractor is reclassified as an employee in any      |
| state,                                                                |
|                                                                       |
| that state\'s wage payment law would apply retroactively.             |
|                                                                       |
| Marketeq must monitor contractor classification risk on an ongoing    |
| basis.                                                                |
|                                                                       |
| Legal counsel must advise on classification risk in each state before |
| launch.                                                               |
+=======================================================================+

  -----------------------------------------------------------------------------------------
  **State**        **Wage payment     **Frequency       **Method of      **Penalty for
                   statute**          requirement (if   payment          non-compliance**
                                      employees)**      requirements**   
  ---------------- ------------------ ----------------- ---------------- ------------------
  **California**   CA Labor Code §§   Weekly            Payment by       Waiting time
                   204, 212, 226      (manufacturing,   cheque, direct   penalties: up to
                                      mining).          deposit (with    30 days\' wages
                                      Semi-monthly      consent), or     for late final
                                      (most employees). cash. Payroll    pay. Private right
                                      Employees must be debit cards      of action.
                                      paid within       allowed with     
                                      specific windows. restrictions.    

  **New York**     NY Labor Law §§    Manual workers:   Cheque, direct   Up to \$20,000
                   191, 192           weekly.           deposit (with    civil penalty per
                                      Clerical/other:   consent), or     violation. Private
                                      semi-monthly.     payroll debit    right of action.
                                                        card (with       
                                                        restrictions and 
                                                        fee              
                                                        disclosures).    

  **Texas**        TX Payday Law (TX  At least          Any method the   TWC enforcement.
                   Labor Code Chapter semi-monthly.     employee agrees  Up to \$10,000
                   61)                                  to.              administrative
                                                                         penalty.

  **Florida**      No state wage      No state-mandated Any agreed       Federal FLSA only.
                   payment law for    frequency.        method.          
                   private employers.                                    

  **Washington**   WA RCW 49.48       At least monthly. Any agreed       Private right of
                                                        method.          action.
                                                                         Attorneys\' fees.

  **Illinois**     IL Wage Payment    Semi-monthly (or  Cheque, direct   2% per month
                   and Collection Act as often as       deposit, or      penalty on unpaid
                                      agreed, minimum   payroll card.    wages. IDOL
                                      semi-monthly).                     enforcement.
  -----------------------------------------------------------------------------------------

# **6. International Contractor Payment Laws**

## **6.1 European Union**

  ------------------------------------------------------------------------
  **Topic**       **EU position**          **Marketeq obligation**
  --------------- ------------------------ -------------------------------
  **Independent   EU Platform Work         Marketeq must assess Platform
  contractor      Directive (2024) creates Work Directive applicability
  status**        a rebuttable presumption for EU contractors. Legal
                  of employee status for   counsel required in each EU
                  platform workers who     member state where contractors
                  meet certain criteria.   are based.
                  If a Marketeq contractor 
                  is reclassified as a     
                  worker or employee under 
                  EU law: national         
                  employment law           
                  obligations apply.       

  **Payment       If Marketeq provides     Legal counsel must assess PSD2
  Services        payment services         applicability. If applicable:
  Directive       (including executing     authorisation as Payment
  (PSD2)**        payment transactions) in Institution or registration as
                  the EU: PSD2             Small Payment Institution
                  authorisation required   required.
                  unless an exemption      
                  applies (e.g. commercial 
                  agent exemption, limited 
                  network exemption).      

  **GDPR ---      Payment-related personal Data Protection Impact
  payment data**  data (bank account       Assessment (DPIA) required for
                  details, tax             payout processing. Legal basis:
                  information) is personal contractual necessity. Standard
                  data under GDPR.         Contractual Clauses (SCCs)
                  Marketeq must have a     required for transfers to
                  lawful basis for         US-based processors.
                  processing and must      
                  comply with data subject 
                  rights, retention        
                  limits, and cross-border 
                  transfer rules.          

  **VAT on        If Marketeq charges a    Legal counsel and tax adviser
  platform        platform fee to EU       required. VAT obligations
  services**      clients or contractors:  distinct from contractor
                  EU VAT rules may apply.  payment obligations.
                  For digital services:    
                  VAT OSS (One Stop Shop)  
                  registration may be      
                  required.                
  ------------------------------------------------------------------------

## **6.2 United Kingdom**

  ------------------------------------------------------------------------
  **Topic**       **UK position**          **Marketeq obligation**
  --------------- ------------------------ -------------------------------
  **IR35 /        For UK contractors       Legal counsel required. If IR35
  Off-payroll     engaged through their    applies and Marketeq is the end
  working rules** personal service         client: Marketeq may be liable
                  companies (PSCs): IR35   for PAYE and NI contributions.
                  rules determine whether  
                  the arrangement should   
                  be taxed as employment.  
                  Marketeq as end client   
                  (if applicable) may have 
                  obligations to assess    
                  IR35 status.             

  **National      Applies to workers (not  Monitor classification risk.
  Minimum Wage**  independent              Maintain evidence of genuine
                  contractors). If any UK  independent contractor
                  Marketeq contractor is   arrangements.
                  reclassified as a        
                  worker: NMW obligation   
                  applies retroactively.   

  **HMRC          Non-UK companies making  Legal counsel required for UK
  reporting**     payments to UK workers   launch.
                  may have PAYE            
                  withholding obligations  
                  if workers are           
                  reclassified.            
  ------------------------------------------------------------------------

## **6.3 Canada**

  ------------------------------------------------------------------------
  **Topic**       **Canadian position**    **Marketeq obligation**
  --------------- ------------------------ -------------------------------
  **Independent   CRA applies the          Legal counsel required per
  contractor vs   integration test and     province.
  employee**      control test. Platform   
                  workers may be           
                  reclassified.            

  **CPP / EI      If contractors           Not applicable for genuine
  withholding**   reclassified as          contractors. Monitor
                  employees: CPP (Canada   classification risk.
                  Pension Plan) and EI     
                  (Employment Insurance)   
                  withholding required.    

  **T4A           Marketeq must issue T4A  T4A issued by Marketeq
  reporting**     slips to Canadian        annually. Filed with CRA by
                  contractors receiving    last day of February following
                  \$500 or more in         the tax year.
                  business income in a     
                  calendar year.           
  ------------------------------------------------------------------------

## **6.4 Australia**

  ---------------------------------------------------------------------------
  **Topic**          **Australian position**  **Marketeq obligation**
  ------------------ ------------------------ -------------------------------
  **PAYG             If Marketeq makes        Require ABN collection at
  withholding**      payments to Australian   onboarding for Australian
                     contractors and the      contractors. Withhold 47% from
                     relevant payee does not  payments where no ABN is
                     provide an ABN           provided.
                     (Australian Business     
                     Number): 47% withholding 
                     required.                

  **SGC ---          If Australian            Monitor classification risk.
  Superannuation**   contractors are          Legal counsel required.
                     reclassified as          
                     employees:               
                     Superannuation Guarantee 
                     Charge (11% of ordinary  
                     time earnings) applies.  

  **TPAR (Taxable    Businesses in certain    Legal counsel and tax adviser
  Payments Annual    industries (including IT to confirm if TPAR applies to
  Report)**          services, cleaning,      Marketeq\'s contractor
                     building) that pay       categories.
                     contractors must lodge a 
                     TPAR annually with the   
                     ATO.                     
  ---------------------------------------------------------------------------

# **7. Tax Reporting Obligations**

## **7.1 United States --- 1099-NEC**

  ------------------------------------------------------------------------
  **Obligation**     **Detail**                        **Deadline**
  ------------------ --------------------------------- -------------------
  **Issue Form       Required for any US contractor    January 31 of the
  1099-NEC to        (individual or unincorporated     following year.
  contractor**       entity) paid \$600 or more in     
                     non-employee compensation in a    
                     calendar year.                    

  **File copy with   Copy A filed with IRS. Copy B     January 31 (paper).
  IRS**              provided to contractor.           February 28 (paper,
                                                       if no electronic
                                                       filing). March 31
                                                       (electronic via
                                                       FIRE system or 1099
                                                       filing vendor).

  **TIN              Marketeq must use the IRS TIN     TIN matching should
  verification**     Matching Programme to verify      be performed when
                     contractor TINs before filing     W-9 is received ---
                     1099s. Filing with an incorrect   not at filing time.
                     TIN: penalty of \$50--\$290 per   
                     form depending on timing.         

  **Backup           If contractor fails to provide a  Withholding begins
  withholding ---    valid TIN, or if IRS notifies     immediately on
  24%**              Marketeq that the TIN is          B-Notice receipt or
                     incorrect: Marketeq must withhold W-9 failure.
                     24% of all payments and remit to  
                     IRS.                              

  **Electronic       For 2024 tax year onward:         March 31 for
  filing threshold** electronic filing required if     electronic filers.
                     filing 10 or more information     
                     returns. Previously 250.          

  **Penalties for    \$50--\$290 per form for late or  N/A
  non-compliance**   incorrect filing. Up to \$3.2M    
                     annual cap for large filers.      
                     Intentional disregard: \$630 per  
                     form, no cap.                     
  ------------------------------------------------------------------------

## **7.2 FATCA --- international contractors receiving US-source income**

The Foreign Account Tax Compliance Act (FATCA) imposes reporting
obligations on US payors making payments to foreign persons and foreign
financial institutions. For Marketeq, FATCA requires: collecting W-8BEN
(or W-8BEN-E) from all non-US contractors, determining the applicable
withholding rate based on the contractor\'s country of residence and any
applicable tax treaty, and in certain cases withholding 30% on US-source
income paid to non-US persons who have not properly documented their
status.

  -----------------------------------------------------------------------
  **FATCA requirement** **Detail**
  --------------------- -------------------------------------------------
  **W-8BEN collection** Required from every non-US individual contractor
                        before any payment. W-8BEN certifies foreign
                        status and claims applicable treaty benefits.

  **W-8BEN-E            Required from non-US entity contractors
  collection**          (companies, partnerships). More complex form ---
                        requires entity classification.

  **30% withholding on  If a non-US contractor fails to provide a valid
  undocumented payees** W-8BEN: Marketeq must withhold 30% of payments
                        (US-source income). Withheld amounts remitted to
                        IRS via Form 1042-S.

  **Treaty-reduced      Many countries have US tax treaties that reduce
  withholding**         or eliminate withholding. W-8BEN allows
                        contractor to claim treaty benefits. Marketeq
                        must verify treaty applicability.

  **Form 1042-S         Annual filing with IRS for all payments to
  filing**              foreign persons. Filed by March 15 of the
                        following year.

  **W-8BEN validity     3 years from date of signature. Marketeq must
  period**              collect renewed forms before expiry.
  -----------------------------------------------------------------------

## **7.3 VAT and GST considerations**

Marketeq\'s platform fee and any other charges to contractors or clients
may be subject to VAT (EU, UK), GST (Canada, Australia, New Zealand), or
equivalent indirect taxes depending on the place of supply and the tax
status of the parties. Tax adviser input is required on indirect tax
treatment before Marketeq launches in any jurisdiction outside the US.
This document does not address indirect tax obligations in detail.

# **8. Required Disclosures in Contractor Agreements**

The following items must be included in the contractor Terms of Service
or a separate Payments Terms document. Legal counsel must draft the
exact language. The items below are substantive requirements --- not
suggested language.

  -----------------------------------------------------------------------
  **Disclosure**           **Why required**          **Priority**
  ------------------------ ------------------------- --------------------
  **Fund custody model:    Informed consent.         P0
  earnings held in         Insolvency risk           
  Marketeq corporate       disclosure. Potentially   
  account, not a           required by state money   
  segregated or            transmission law.         
  contractor-specific                                
  account**                                          

  **No interest on held    State money transmission  P0
  balances. Marketeq may   disclosure requirements.  
  earn interest on pooled  Consumer protection. FTC  
  funds.**                 guidance on material      
                           omissions.                

  **Insolvency risk:       Informed consent.         P0
  contractor balances are  Material risk disclosure. 
  unsecured obligations.   Required in most money    
  In insolvency,           transmission licensing    
  contractors are          disclosures.              
  unsecured creditors.**                             

  **FDIC coverage: funds   Accurate representation   P0
  may be held in           of insurance status. Must 
  FDIC-insured accounts    not overstate FDIC        
  through Stripe but       protection.               
  coverage is not                                    
  guaranteed per                                     
  contractor.**                                      

  **ACH authorisation:     NACHA Rules require a     P0
  contractor authorises    written authorisation for 
  Marketeq to initiate ACH recurring ACH credits.    
  credit entries to the    Must include specific     
  contractor\'s designated NACHA-compliant language. 
  bank account.**                                    

  **Dispute holds:         Contractor must consent   P0
  Marketeq may lock        to this mechanism.        
  earnings from disputed   Prevents claim that funds 
  contracts pending        are being wrongfully      
  resolution.**            withheld.                 

  **Dispute reversal:      Contractor must be aware  P0
  earnings may be reversed of reversal risk.         
  if a dispute is resolved Relevant to contractor\'s 
  in the client\'s         financial planning.       
  favour.**                                          

  **Tax reporting:         IRS and international tax P0
  Marketeq will issue a    authority requirements.   
  1099-NEC (US) or         Sets contractor           
  equivalent international expectations.             
  form for earnings above                            
  applicable thresholds.**                           

  **Backup withholding: if Required by IRS as part   P0
  contractor fails to      of W-9 certification.     
  provide a valid TIN,     Must be disclosed before  
  Marketeq will withhold   withholding commences.    
  24% of payments and                                
  remit to IRS.**                                    

  **W-8BEN withholding:    FATCA disclosure          P0
  international            requirement.              
  contractors who do not                             
  provide a valid W-8BEN                             
  will be subject to 30%                             
  withholding.**                                     

  **Dormancy and           State unclaimed property  P0
  escheatment: inactive    law disclosure            
  balances will be subject requirements. Many states 
  to unclaimed property    require notice before     
  law reporting and        escheatment.              
  potential escheatment to                           
  the applicable state.**                            

  **First-payout hold:     Contractor must           P0
  first withdrawal subject understand this delay.    
  to 5-business-day hold   Prevents complaint of     
  for security             wrongful withholding.     
  verification.**                                    

  **Platform fee: Marketeq Material financial term.  P0
  retains 20% of each      Must be disclosed         
  client payment as a      conspicuously.            
  platform fee.**                                    

  **Independent contractor Classification            P0
  status: contractor is an disclosure. Manages tax   
  independent contractor,  and employment law        
  not an employee of       expectations.             
  Marketeq.**                                        

  **Crypto payout risk:    Material investment risk. P1
  crypto payout values may Relevant to contractor    
  fluctuate between        financial decisions.      
  confirmation and                                   
  delivery. Conversion                               
  rate is live at                                    
  execution.**                                       

  **Crypto payout          Allocation of risk for    P1
  non-reversibility:       contractor-provided       
  on-chain cryptocurrency  incorrect wallet address. 
  transfers are                                      
  irreversible. Marketeq                             
  is not liable for funds                            
  sent to an incorrect                               
  address provided by the                            
  contractor.**                                      

  **OFAC compliance:       Transparency about        P0
  Marketeq is required by  regulatory screening.     
  US law to screen         Protects Marketeq from    
  payments against OFAC    contractor claims of      
  sanctions lists.         wrongful payment refusal. 
  Payments to sanctioned                             
  individuals, entities,                             
  or jurisdictions will be                           
  blocked.**                                         
  -----------------------------------------------------------------------

# **9. Audit Trail and Record-Keeping Requirements**

  ----------------------------------------------------------------------------------
  **Record type**  **Retention       **Regulatory       **Marketeq\'s current
                   period**          basis**            approach**
  ---------------- ----------------- ------------------ ----------------------------
  **All payment    5 years minimum   31 CFR § 1010.415. payout_audit_log table.
  transaction      (BSA funds        IRC § 6501.        Append-only. Partitioned by
  records**        transfer                             year. 7-year minimum
                   recordkeeping). 7                    retention.
                   years recommended                    
                   for IRS audit                        
                   statute of                           
                   limitations.                         

  **KYC / identity 5 years from the  31 CFR §           kyc-identity-service.
  verification     end of the        1020.220(a)(3).    Separate retention policy.
  records**        customer                             Access logged.
                   relationship (BSA                    
                   CIP records).                        

  **W-9 and W-8BEN 4 years from the  IRC § 6001.        Stored in Cloudflare R2 via
  forms**          date the form is  Treasury Reg. §    kyc-identity-service.
                   last relied upon  31.3406(d)-5.      Encrypted. Access-logged.
                   (IRS).                               

  **1099-NEC and   4 years (IRS). 7  IRC § 6001.        Retained by Marketeq and/or
  1042-S copies**  years                                1099 filing vendor.
                   recommended.                         

  **SAR filings    5 years from date 31 CFR §           Compliance team record. Not
  (if MSB)**       of filing.        1022.320(d).       in engineering systems.

  **CTR filings    5 years from date 31 CFR §           Compliance team record.
  (if MSB)**       of filing.        1010.306(a).       

  **BSA funds      5 years from date 31 CFR § 1010.415. payout_audit_log with
  transfer records of transaction.                      extended retention flag.
  (\>= \$3,000)**                                       

  **EDD review     7 years           BSA programme      edd_reviews table. 7-year
  records**        recommended (no   requirements.      retention.
                   specific BSA                         
                   period for                           
                   non-CTR EDD).                        

  **Dispute and    7 years.          General limitation earnings-service dispute
  lock records**                     periods.           records. 7-year retention.

  **Dormancy and   Permanent (or     State unclaimed    contractor_activity table.
  escheatment      until remitted to property law       Archived, not deleted.
  records**        state and         varies.            
                   confirmed                            
                   accepted).                           

  **Contractor ToS Duration of       General contract   contractor_tos_acceptances
  acceptance       relationship + 7  and limitation     table. Timestamped.
  records**        years.            period             
                                     requirements.      
  ----------------------------------------------------------------------------------

# **10. Regulatory Responsibility --- Marketeq vs Third-Party Processors**

Marketeq relies on several third-party processors for payment execution,
KYC verification, card issuance, and crypto conversion. The table below
sets out how regulatory responsibility is allocated between Marketeq and
each processor. This allocation does not eliminate Marketeq\'s
obligations --- it describes who is the primary regulated entity for
each function.

  ---------------------------------------------------------------------------
  **Function**   **Third-party   **Processor\'s           **Marketeq\'s
                 processor**     regulatory role**        residual
                                                          obligation**
  -------------- --------------- ------------------------ -------------------
  **ACH bank     Stripe (via     Stripe is an             Marketeq must: (i)
  transfers**    Stripe\'s       FDIC-insured financial   pass accurate
                 banking         institution\'s           payment data to
                 partners)       technology partner.      Stripe; (ii)
                                 Stripe\'s bank partners  validate account
                                 (e.g. Evolve Bank &      ownership before
                                 Trust, Goldman Sachs)    initiation
                                 are the ODFI             (micro-deposits);
                                 (Originating Depository  (iii) handle return
                                 Financial Institution)   codes
                                 for ACH purposes. They   appropriately; (iv)
                                 bear primary NACHA       maintain
                                 compliance obligations   authorisation
                                 for the ACH entries.     records. Marketeq
                                                          cannot delegate
                                                          NACHA compliance
                                                          entirely to Stripe
                                                          --- it is
                                                          contractually bound
                                                          to comply with
                                                          NACHA Rules as a
                                                          third-party sender.

  **Card         Stripe Issuing  Stripe Issuing is the    Marketeq as
  issuance**     (Visa card      card programme manager   programme sponsor
                 programme)      and acts as the issuing  is responsible for:
                                 processor. Visa is the   (i) KYC of
                                 card network. Stripe     cardholders; (ii)
                                 Issuing\'s banking       spending control
                                 partner (e.g. Celtic     configuration;
                                 Bank) is the card        (iii) AML screening
                                 issuer. PCI DSS          of card
                                 compliance for card data transactions; (iv)
                                 is Stripe\'s             accurate cardholder
                                 responsibility.          data provided to
                                                          Stripe; (v) dispute
                                                          handling for
                                                          cardholders.

  **PayPal       PayPal          PayPal is a licensed     Marketeq is
  payouts**                      money transmitter in all responsible for:
                                 50 US states and holds   (i) OFAC screening
                                 equivalent licences      before sending
                                 internationally. PayPal  payout instruction
                                 bears primary money      to PayPal; (ii) KYC
                                 transmission licensing   verification of the
                                 obligations for the      contractor\'s
                                 PayPal-to-contractor     identity; (iii)
                                 transfer.                accurate payment
                                                          instruction data.

  **Wise         Wise            Wise is FCA-authorised,  Same as PayPal ---
  payouts**      (TransferWise   FinCEN-registered, and   Marketeq
                 Ltd)            holds licences in        responsible for
                                 applicable               OFAC screening and
                                 jurisdictions. Wise      KYC before
                                 bears money transmission instruction.
                                 obligations for the      
                                 transfer from            
                                 Marketeq\'s Wise account 
                                 to the contractor.       

  **Payoneer     Payoneer        Payoneer is licensed as  Same as PayPal.
  payouts**                      a money transmitter in   
                                 applicable US states and 
                                 holds equivalent         
                                 international licences.  

  **Crypto       Ramp Network,   Both hold applicable     Marketeq is
  conversion and Transak         MSB, FINTRAC, FCA, and   responsible for:
  settlement**                   MiCA authorisations for  (i)
                                 crypto on-ramp           OFAC/Chainalysis
                                 activities. They bear    screening of wallet
                                 primary crypto           addresses before
                                 regulatory obligations   sending
                                 for the conversion and   instruction; (ii)
                                 transfer.                contractor KYC;
                                                          (iii) EDD for
                                                          transactions above
                                                          \$10,000; (iv)
                                                          accurate payment
                                                          data. Marketeq
                                                          cannot rely on
                                                          Ramp/Transak for
                                                          its own OFAC
                                                          obligations.

  **Identity     Third-party     Identity verification    Marketeq remains
  verification   identity        vendors process          responsible for:
  (KYC)**        verification    biometric and document   (i) making the KYC
                 vendor (e.g.    data under their own     determination
                 Jumio, Onfido,  privacy and data         (vendor provides a
                 Stripe          protection licences.     risk score ---
                 Identity)                                Marketeq decides to
                                                          approve or reject);
                                                          (ii) record
                                                          retention of KYC
                                                          outcomes; (iii)
                                                          accuracy of KYC
                                                          data used in
                                                          BSA/AML programme.

  **Crypto       Chainalysis     Chainalysis provides     Marketeq bears full
  wallet                         blockchain analytics and OFAC compliance
  screening**                    OFAC risk scoring. They  responsibility.
                                 are a compliance tool    Chainalysis is a
                                 provider, not a          tool. Marketeq is
                                 regulated entity for     accountable for
                                 OFAC purposes.           OFAC violations
                                                          even if Chainalysis
                                                          fails to flag an
                                                          address.
  ---------------------------------------------------------------------------

# **11. Minimum Compliance Programme Requirements Before Launch**

  ------------------------------------------------------------------------
  **Programme element**       **Required         **Owner**
                              before**           
  --------------------------- ------------------ -------------------------
  **Written AML/BSA policy    Launch             Chief Compliance
  (if MSB classification                         Officer + legal counsel
  confirmed)**                                   

  **BSA/AML compliance        Launch             Board / executive team
  officer designated**                           

  **SAR and CTR filing        Launch             Compliance officer
  procedures established (if                     
  MSB)**                                         

  **State money transmitter   Launch (or prior   Legal counsel + finance
  licence applications filed  --- licences take  
  in required states**        3--18 months)      

  **Surety bonds obtained for With licence       Finance + legal
  licensed states**           application        

  **W-9/W-8BEN collection     Before first \$600 Finance + engineering
  process operational**       YTD contractor     
                              earns              

  **IRS TIN matching          Before first 1099  Finance + engineering
  programme integration**     filing             

  **Backup withholding        Before any         Engineering + finance
  implementation (if TIN      B-Notice is        
  mismatch occurs)**          received           

  **1099-NEC filing vendor    Before January 31  Finance
  contracted**                of first tax year  

  **T4A filing process        Before Canadian    Finance + legal
  (Canada)**                  contractor launch  

  **Contractor ToS reviewed   Before any         Legal counsel + product
  and approved by legal       contractor         
  counsel**                   onboarding         

  **OFAC screening programme  Before any payout  Compliance officer +
  documented and tested**     processed          engineering

  **NACHA third-party sender  Before any ACH     Legal + finance
  agreement with Stripe       payout             
  signed**                                       

  **Unclaimed property        Before first       Finance + legal +
  compliance programme        dormancy threshold engineering
  established**               date               

  **Annual AML training       Ongoing from       Compliance officer + HR
  programme for employees**   launch             

  **Independent AML programme Within 12 months   External compliance
  review**                    of launch          auditor

  **Data retention and        Before launch      Legal + engineering + DPO
  destruction schedule                           
  documented**                                   
  ------------------------------------------------------------------------

# **12. Statutory and Regulatory References**

  --------------------------------------------------------------------------------------------------------------------------------------------
  **Reference**          **Description**
  ---------------------- ---------------------------------------------------------------------------------------------------------------------
  **31 CFR Part 1010,    BSA implementing regulations for financial institutions and MSBs (FinCEN)
  1022**                 

  **31 CFR § 1022.320**  SAR filing requirements for MSBs

  **31 CFR § 1010.311**  CTR filing requirements

  **31 CFR § 1010.415**  Funds transfer recordkeeping (\>= \$3,000)

  **IRC § 3406; Treasury Backup withholding requirements
  Reg. § 31.3406**       

  **IRC § 6041A; IRS     1099-NEC filing requirements and electronic specifications
  Publication 1220**     

  **26 CFR § 1.1441      Withholding on US-source income paid to foreign persons
  (FATCA)**              

  **IRS Notice 2014-21** Crypto-asset tax treatment (property classification)

  **NACHA Operating      ACH network rules --- available at nacha.org
  Rules (current         
  edition)**             

  **CA Financial Code §§ California money transmission licence requirements
  2010--2080**           

  **NY Banking Law       New York money transmission requirements
  Article XIII-B**       

  **EU PSD2 (Directive   Payment Services Directive --- EU payment institution authorisation
  2015/2366)**           

  **EU MiCA (Regulation  Markets in Crypto-Assets Regulation --- effective Dec 2024
  2023/1114)**           

  **EU Platform Work     Worker classification presumption for platform workers
  Directive (2024)**     

  **UK FSMA 2000**       Financial Services and Markets Act --- FCA authorisation requirements

  **UK Money Laundering  UK AML/CTF programme requirements
  Regulations 2017**     

  **PCMLTFA (Canada)**   Proceeds of Crime (Money Laundering) and Terrorist Financing Act

  **AML/CTF Act 2006     Australian AML/CTF programme requirements
  (Australia)**          

  **FATF 40              International AML/CFT standards baseline
  Recommendations**      

  **OFAC SDN List**      https://home.treasury.gov/policy-issues/financial-sanctions/specially-designated-nationals-and-blocked-persons-list
  --------------------------------------------------------------------------------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-22 \| v1.0
