**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-07 --- Global Bank Schema Reference --- All Countries

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-07 --- Global Bank Schema Reference --- All
                      Countries

  **Version**         1.0

  **Coverage**        195 countries / territories grouped into 12 banking
                      system schemas

  **Used by**         PS-06 (7-region form logic), frontend form
                      rendering, BankValidationService

  **Structure**       Schema groups → per-country field tables →
                      validation rules → example values

  **Prerequisites**   PS-01, PS-06
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **How to use this document**                                          |
|                                                                       |
| This document defines the field requirements for every country.       |
|                                                                       |
| Frontend uses the schema group for bankCountry to determine which     |
| fields to render.                                                     |
|                                                                       |
| BankValidationService.detectRegion() maps bankCountry → schema group  |
| → validation rules.                                                   |
|                                                                       |
| Countries not listed explicitly fall into SWIFT_GENERIC (schema group |
| 7).                                                                   |
|                                                                       |
| PS-06 documents the implementation for the 7 regions shown in the UI  |
| designs.                                                              |
|                                                                       |
| PS-07 is the authoritative reference for all other countries.         |
+=======================================================================+

# **1. Schema Groups**

Countries are grouped by their domestic payment rail. Each group maps to
a distinct form layout and validation ruleset. A country belongs to
exactly one group.

  -------------------------------------------------------------------------------
  **Group     **Name**         **Rail**         **Countries     **Key identifier
  ID**                                          (count)**       field**
  ----------- ---------------- ---------------- --------------- -----------------
  **SG-01**   US ACH           US ACH / Fedwire US (1)          ABA routing
                                                                number (9 digits)

  **SG-02**   SEPA             SEPA Credit      EU27 + EEA + CH IBAN (15--34
                               Transfer         (32)            chars)

  **SG-03**   UK Faster        UK domestic      GB, GG, JE, IM  Sort code (6
              Payments         rails            (4)             digits) + 8-digit
                                                                account

  **SG-04**   India NEFT/IMPS  Indian domestic  IN (1)          IFSC (11 chars) +
                               rails                            account number

  **SG-05**   Australia NPP/DE Australian       AU (1)          BSB (6 digits) +
                               domestic rails                   account number

  **SG-06**   Japan Zengin     Japan Zengin     JP (1)          Bank code (4) +
                               system                           branch code (3) +
                                                                account (7)

  **SG-07**   Canada EFT       Canadian EFT     CA (1)          Institution (3) +
                                                                transit (5) +
                                                                account

  **SG-08**   BACS / Local     Countries with   BR MX ZA NG KE  Local account +
              IBAN             local IBAN-like  PK BD PH ID VN  SWIFT/BIC
                               identifiers      TH MY           

  **SG-09**   GCC / IBAN       Gulf states ---  AE SA QA BH KW  IBAN + SWIFT/BIC
              required         IBAN mandatory   OM (6)          

  **SG-10**   China            Chinese domestic CN (1)          CNAPS code (12
              UnionPay/CNAPS   rails                            digits) +
                                                                card/account
                                                                number

  **SG-11**   Russia SBP/MIR   Russian domestic RU (1)          BIK (9 digits) +
                               rails                            account (20
                                                                digits)

  **SG-12**   SWIFT Generic    International    All others      SWIFT/BIC (8 or
                               wire --- no      (\~150)         11) + account
                               domestic rail                    number
                               supported                        
  -------------------------------------------------------------------------------

# **2. SG-01 --- United States**

  ------------------------------------------------------------------------------------------
  **Field**               **Required**   **Format**      **Example**        **Validation**
  ----------------------- -------------- --------------- ------------------ ----------------
  **bankAccountName**     Yes            1--100 chars    Jane Doe           No special chars
                                                                            except hyphen,
                                                                            space, period,
                                                                            apostrophe

  **bankRoutingNumber**   Yes            9 digits        021000021          ABA weighted
                                                                            checksum --- see
                                                                            PS-06 §3.1

  **bankAccountNumber**   Yes            4--17 digits    000123456789       Digits only

  **bankCurrency**        Yes            Must be USD     USD                Exact match
  ------------------------------------------------------------------------------------------

# **3. SG-02 --- SEPA (32 Countries)**

SEPA covers the EU27 plus Iceland, Liechtenstein, Norway, Switzerland,
Monaco, San Marino, Andorra, and Vatican City.

  -------------------------------------------------------------------------------
  **Country**         **ISO**   **IBAN       **Local         **Notes**
                                length**     currency**      
  ------------------- --------- ------------ --------------- --------------------
  **Austria**         AT        20           EUR             

  **Belgium**         BE        16           EUR             

  **Bulgaria**        BG        22           BGN             Non-EUR --- payouts
                                                             in BGN

  **Croatia**         HR        21           EUR             Joined SEPA 2023

  **Cyprus**          CY        28           EUR             

  **Czech Republic**  CZ        24           CZK             Non-EUR

  **Denmark**         DK        18           DKK             Non-EUR

  **Estonia**         EE        20           EUR             

  **Finland**         FI        18           EUR             

  **France**          FR        27           EUR             

  **Germany**         DE        22           EUR             

  **Greece**          GR        27           EUR             

  **Hungary**         HU        28           HUF             Non-EUR

  **Ireland**         IE        22           EUR             

  **Italy**           IT        27           EUR             

  **Latvia**          LV        21           EUR             

  **Lithuania**       LT        20           EUR             

  **Luxembourg**      LU        20           EUR             

  **Malta**           MT        31           EUR             

  **Netherlands**     NL        18           EUR             

  **Poland**          PL        28           PLN             Non-EUR

  **Portugal**        PT        25           EUR             

  **Romania**         RO        24           RON             Non-EUR

  **Slovakia**        SK        24           EUR             

  **Slovenia**        SI        19           EUR             

  **Spain**           ES        24           EUR             

  **Sweden**          SE        24           SEK             Non-EUR

  **Iceland**         IS        26           ISK             EEA, non-EU, non-EUR

  **Liechtenstein**   LI        21           CHF             EEA, non-EU

  **Norway**          NO        15           NOK             EEA, non-EU, non-EUR

  **Switzerland**     CH        21           CHF             Non-EU, non-EUR

  **Monaco**          MC        27           EUR             
  -------------------------------------------------------------------------------

  ---------------------------------------------------------------------------------------------------------------------------------
  **Field**             **Required**   **Format**      **Example**              **Validation**
  --------------------- -------------- --------------- ------------------------ ---------------------------------------------------
  **bankAccountName**   Yes            1--100 chars    Hans Müller              UTF-8 accepted --- European characters allowed

  **bankIban**          Yes            15--34          DE89370400440532013000   ISO 7064 MOD-97-10 checksum. Country prefix must
                                       alphanumeric                             match bankCountry.

  **bankSwiftBic**      No             8 or 11 chars   DEUTDEDB                 Regex:
                                                                                \[A-Z\]{4}\[A-Z\]{2}\[A-Z0-9\]{2}(\[A-Z0-9\]{3})?

  **bankCurrency**      Yes            ISO 4217        EUR                      Must match country currency from table above
  ---------------------------------------------------------------------------------------------------------------------------------

# **4. SG-03 --- United Kingdom & Crown Dependencies**

  -----------------------------------------------------------------------------
  **Country**           **ISO**   **Notes**
  --------------------- --------- ---------------------------------------------
  **United Kingdom**    GB        Mainland --- Faster Payments, BACS, CHAPS

  **Guernsey**          GG        Uses UK rails. Sort code format same as GB.

  **Jersey**            JE        Uses UK rails. Sort code format same as GB.

  **Isle of Man**       IM        Uses UK rails. Sort code format same as GB.
  -----------------------------------------------------------------------------

  ------------------------------------------------------------------------------------------
  **Field**               **Required**   **Format**      **Example**        **Validation**
  ----------------------- -------------- --------------- ------------------ ----------------
  **bankAccountName**     Yes            1--100 chars    Jane Smith         Standard Latin
                                                                            chars

  **bankSortCode**        Yes            6 digits        601613             Stored as 6
                                         (dashes                            contiguous
                                         stripped)                          digits. UI
                                                                            formats as
                                                                            XX-XX-XX.

  **bankAccountNumber**   Yes            Exactly 8       31926819           Must be exactly
                                         digits                             8 digits --- UK
                                                                            standard

  **bankCurrency**        Yes            Must be GBP     GBP                Exact match
  ------------------------------------------------------------------------------------------

# **5. SG-04 --- India**

  -----------------------------------------------------------------------------------------------------
  **Field**               **Required**   **Format**      **Example**        **Validation**
  ----------------------- -------------- --------------- ------------------ ---------------------------
  **bankAccountName**     Yes            1--100 chars    Priya Sharma       Latin or Devanagari
                                                                            characters accepted

  **bankIfscCode**        Yes            11 chars        HDFC0001234        \[A-Z\]{4}0\[A-Z0-9\]{6}.
                                                                            5th char always 0.

  **bankAccountNumber**   Yes            9--18 digits    12345678901        Digits only

  **bankCurrency**        Yes            Must be INR     INR                Exact match
  -----------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **India account number length**                                       |
|                                                                       |
| Account number length varies by bank: SBI uses 11 digits, HDFC uses   |
| 14, ICICI uses 12.                                                    |
|                                                                       |
| Validation accepts 9--18 digits to cover all major banks.             |
|                                                                       |
| Do not validate exact length per bank --- too many edge cases.        |
+=======================================================================+

# **6. SG-05 --- Australia**

  ------------------------------------------------------------------------------------------
  **Field**               **Required**   **Format**      **Example**        **Validation**
  ----------------------- -------------- --------------- ------------------ ----------------
  **bankAccountName**     Yes            1--100 chars    John Chen          Standard Latin
                                                                            chars

  **bankBsbNumber**       Yes            6 digits        062000             UI formats as
                                         (dashes                            XXX-XXX. Stored
                                         stripped)                          as 6 digits.

  **bankAccountNumber**   Yes            6--10 digits    12345678           Digits only

  **bankCurrency**        Yes            Must be AUD     AUD                Exact match
  ------------------------------------------------------------------------------------------

# **7. SG-06 --- Japan**

  ------------------------------------------------------------------------------------------
  **Field**               **Required**   **Format**      **Example**        **Validation**
  ----------------------- -------------- --------------- ------------------ ----------------
  **bankAccountName**     Yes            1--100 chars    ヤマダ タロウ      Katakana, Latin,
                                         (Katakana                          or mixed
                                         accepted)                          

  **bankCode**            Yes            4 digits        0001               Zengin bank code

  **bankBranchCode**      Yes            3 digits        001                Zengin branch
                                                                            code

  **bankAccountNumber**   Yes            7 digits        1234567            Standard Zengin
                                                                            account number
                                                                            length

  **bankCurrency**        Yes            Must be JPY     JPY                Exact match
  ------------------------------------------------------------------------------------------

# **8. SG-07 --- Canada**

  ----------------------------------------------------------------------------------------------
  **Field**                   **Required**   **Format**      **Example**        **Validation**
  --------------------------- -------------- --------------- ------------------ ----------------
  **bankAccountName**         Yes            1--100 chars    Marie Tremblay     Latin chars.
                                                                                French accents
                                                                                accepted.

  **bankInstitutionNumber**   Yes            3 digits        001                Canadian
                                                                                financial
                                                                                institution
                                                                                number

  **bankTransitNumber**       Yes            5 digits        00010              Branch transit
                                                                                number

  **bankAccountNumber**       Yes            7--12 digits    1234567            Digits only

  **bankCurrency**            Yes            CAD or USD      CAD                Both CAD and USD
                                                                                accounts are
                                                                                common in Canada
  ----------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Canada composite routing**                                          |
|                                                                       |
| The Canadian routing number displayed on cheques is a composite:      |
| 0{institutionNumber}{transitNumber}                                   |
|                                                                       |
| e.g. Institution 001 + Transit 00010 → displayed as 000100010         |
|                                                                       |
| Store institution and transit separately --- do not store the         |
| composite.                                                            |
+=======================================================================+

# **9. SG-08 --- BACS / Local Identifier Countries**

These countries have significant banking infrastructure but no unified
IBAN system. Payouts use SWIFT wire with local account identifiers.
Field requirements vary --- the table below covers the primary field per
country.

  ------------------------------------------------------------------------------------------------------------
  **Country**       **ISO**   **Currency**   **Local identifier    **Format**       **Notes**
                                             field**                                
  ----------------- --------- -------------- --------------------- ---------------- --------------------------
  **Brazil**        BR        BRL            bankCpfCnpj (tax      CPF: 11 digits.  Pix key
                                             ID) + bankAgencia +   CNPJ: 14 digits. (CPF/phone/email/random)
                                             bankConta                              is preferred for domestic.
                                                                                    SWIFT for international.

  **Mexico**        MX        MXN            bankClabe             18 digits        CLABE replaces routing +
                                                                                    account. Luhn-validated.

  **South Africa**  ZA        ZAR            bankBranchCode +      Branch: 6        
                                             bankAccountNumber     digits. Account: 
                                                                   up to 11 digits. 

  **Nigeria**       NG        NGN            bankAccountNumber     10 digits        NUBAN format --- validated
                                             (NUBAN)                                by CBN MOD-97 variant.

  **Kenya**         KE        KES            bankAccountNumber +   Account: up to   M-Pesa is not supported
                                             bankSwiftBic          16 chars         --- bank account only.

  **Pakistan**      PK        PKR            bankIban              24 chars --- PK  Pakistan uses IBAN.
                                                                   prefix           Format:
                                                                                    PK{2}\[A-Z0-9\]{4}{16}

  **Bangladesh**    BD        BDT            bankAccountNumber +   Account: 13--17  No domestic routing
                                             bankSwiftBic          digits           standard --- SWIFT wire
                                                                                    only.

  **Philippines**   PH        PHP            bankAccountNumber +   Account: up to   InstaPay/PESONet for
                                             bankSwiftBic          16 digits        domestic --- SWIFT for
                                                                                    international.

  **Indonesia**     ID        IDR            bankAccountNumber +   Account: 10--16  BI-FAST for domestic ---
                                             bankSwiftBic          digits           SWIFT for international.

  **Vietnam**       VN        VND            bankAccountNumber +   Account: 10--16  NAPAS for domestic ---
                                             bankSwiftBic          digits           SWIFT for international.

  **Thailand**      TH        THB            bankAccountNumber +   Account: 10--12  PromptPay is not supported
                                             bankSwiftBic          digits           --- bank account only.

  **Malaysia**      MY        MYR            bankAccountNumber +   Account: 10--16  DuitNow is not supported
                                             bankSwiftBic          digits           --- bank account only.
  ------------------------------------------------------------------------------------------------------------

## **9.1 Mexico CLABE validation**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // CLABE --- 18-digit Mexican bank account identifier                 |
|                                                                       |
| // Validated using weighted checksum                                  |
|                                                                       |
| const CLABE_WEIGHTS = \[3,7,1,3,7,1,3,7,1,3,7,1,3,7,1,3,7\];          |
|                                                                       |
| function validateClabe(clabe: string): boolean {                      |
|                                                                       |
| if (!/\^\\d{18}\$/.test(clabe)) return false;                         |
|                                                                       |
| const d = clabe.split(\'\').map(Number);                              |
|                                                                       |
| const sum = CLABE_WEIGHTS.reduce((acc, w, i) =\> acc + (w \* d\[i\])  |
| % 10, 0);                                                             |
|                                                                       |
| const checkDigit = (10 - (sum % 10)) % 10;                            |
|                                                                       |
| return checkDigit === d\[17\];                                        |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **10. SG-09 --- GCC / Gulf States (IBAN Mandatory)**

  ----------------------------------------------------------------------------------
  **Country**     **ISO**   **IBAN     **Currency**   **IBAN prefix format**
                            length**                  
  --------------- --------- ---------- -------------- ------------------------------
  **UAE**         AE        23         AED            AE{2}{3}{16} --- 3-digit bank
                                                      code + 16-digit account

  **Saudi         SA        24         SAR            SA{2}{2}{18} --- 2-digit bank
  Arabia**                                            code + 18-digit account

  **Qatar**       QA        29         QAR            QA{2}{4}{21} --- 4-char bank
                                                      code + 21-char account

  **Bahrain**     BH        22         BHD            BH{2}{4}{14} --- 4-char bank
                                                      code + 14-char account

  **Kuwait**      KW        30         KWD            KW{2}{4}{22} --- 4-char bank
                                                      code + 22-char account

  **Oman**        OM        23         OMR            OM{2}{3}{16} --- 3-digit bank
                                                      code + 16-digit account
  ----------------------------------------------------------------------------------

  ---------------------------------------------------------------------------------------
  **Field**             **Required**   **Format**         **Validation**
  --------------------- -------------- ------------------ -------------------------------
  **bankAccountName**   Yes            1--100 chars       UTF-8. Arabic script accepted.
                                       (Arabic accepted)  

  **bankIban**          Yes            Country-specific   ISO 7064 MOD-97. Country prefix
                                       length (see table) must match bankCountry.

  **bankSwiftBic**      Yes            8 or 11 chars      Required for GCC --- many GCC
                                                          banks require BIC for
                                                          processing

  **bankCurrency**      Yes            Country currency   Exact match
                                       (see table)        
  ---------------------------------------------------------------------------------------

# **11. SG-10 --- China**

  ------------------------------------------------------------------------------------------
  **Field**               **Required**   **Format**      **Example**        **Validation**
  ----------------------- -------------- --------------- ------------------ ----------------
  **bankAccountName**     Yes            1--100 chars    张伟               UTF-8. Chinese
                                         (Chinese                           characters
                                         accepted)                          accepted.

  **bankCnapsCode**       Yes            12 digits       102100099996       CNAPS clearing
                                                                            code ---
                                                                            identifies bank
                                                                            and branch

  **bankAccountNumber**   Yes            16--19 digits   6225365271562822   UnionPay card
                                                                            number or
                                                                            standard account
                                                                            number

  **bankCurrency**        Yes            Must be CNY     CNY                CNH (offshore)
                                                                            is not supported
                                                                            --- CNY only
  ------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **China: no SWIFT for domestic CNY**                                  |
|                                                                       |
| Domestic CNY transfers use CNAPS codes, not SWIFT.                    |
|                                                                       |
| SWIFT/BIC is required only for foreign currency transfers out of      |
| China.                                                                |
|                                                                       |
| For CNY payouts: use CNAPS code + account number.                     |
|                                                                       |
| CNH (offshore yuan) payouts are not supported --- contractors receive |
| CNY to domestic accounts.                                             |
+=======================================================================+

# **12. SG-11 --- Russia**

  -----------------------------------------------------------------------------------------------------
  **Field**                      **Required**   **Format**      **Example**            **Validation**
  ------------------------------ -------------- --------------- ---------------------- ----------------
  **bankAccountName**            Yes            1--100 chars    Иван Петров            UTF-8. Cyrillic
                                                (Cyrillic                              accepted.
                                                accepted)                              

  **bankBik**                    Yes            9 digits        044525225              BIK --- Bank
                                                                                       Identification
                                                                                       Code (Russian
                                                                                       Central Bank)

  **bankKorrespondentAccount**   Yes            20 digits       30101810400000000225   Correspondent
                                                                                       account number

  **bankAccountNumber**          Yes            20 digits       40817810099910004312   20-digit Russian
                                                                                       account number

  **bankCurrency**               Yes            Must be RUB     RUB                    
  -----------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Russia: sanctions compliance check required**                       |
|                                                                       |
| All RUB payouts to Russian bank accounts must be screened against     |
| OFAC SDN list before processing.                                      |
|                                                                       |
| This check is performed by kyc-identity-service before payout-service |
| initiates the transfer.                                               |
|                                                                       |
| If OFAC flag is returned: payout blocked, ERR_PAYOUT_OFAC_BLOCKED,    |
| compliance team notified.                                             |
+=======================================================================+

# **13. SG-12 --- SWIFT Generic (All Other Countries)**

Used for all countries not covered by SG-01 through SG-11. Approximately
150 countries fall into this group. The only required fields are a
SWIFT/BIC code and an account number.

  ----------------------------------------------------------------------------------------------------------
  **Field**               **Required**   **Format**      **Validation**
  ----------------------- -------------- --------------- ---------------------------------------------------
  **bankAccountName**     Yes            1--100 chars    UTF-8 accepted. No structural validation.

  **bankSwiftBic**        Yes            8 or 11 chars   \[A-Z\]{4}\[A-Z\]{2}\[A-Z0-9\]{2}(\[A-Z0-9\]{3})?

  **bankAccountNumber**   Yes            1--34           SWIFT standard maximum. Digits, letters, no spaces.
                                         alphanumeric    

  **bankIban**            No             15--34 chars if ISO 7064 MOD-97 if provided. Country prefix must
                                         provided        match bankCountry.

  **bankCurrency**        Yes            Any valid ISO   3-letter code. Must be a currency supported by the
                                         4217            receiving country.
  ----------------------------------------------------------------------------------------------------------

## **13.1 Notable SWIFT Generic countries**

  -----------------------------------------------------------------------------------
  **Country**        **ISO**   **Currency**   **Common account format**
  ------------------ --------- -------------- ---------------------------------------
  **Singapore**      SG        SGD            Bank code (4) + branch (3) + account
                                              (7--11)

  **Hong Kong**      HK        HKD            Bank code (3) + branch (3) + account
                                              (6--9)

  **Taiwan**         TW        TWD            Bank code (7) + account (up to 14)

  **South Korea**    KR        KRW            Account number 10--14 digits

  **New Zealand**    NZ        NZD            Bank (2) + branch (4) + account (7) +
                                              suffix (2--3) --- total 15--16

  **Israel**         IL        ILS            Bank (2) + branch (3) + account (up to
                                              13)

  **Turkey**         TR        TRY            IBAN optional but common: TR{2}{5}{16}
                                              (26 chars)

  **Colombia**       CO        COP            Account number up to 16 digits

  **Argentina**      AR        ARS            CBU 22 digits or CVU 22 digits

  **Chile**          CL        CLP            RUT + account number up to 12 digits

  **Peru**           PE        PEN            CCI 20 digits (Código de Cuenta
                                              Interbancario)

  **Ukraine**        UA        UAH            IBAN: UA{2}{6}{19} (29 chars)

  **Egypt**          EG        EGP            Account number 13--24 digits + SWIFT

  **Morocco**        MA        MAD            RIB 24 digits

  **Ghana**          GH        GHS            Account number up to 16 digits

  **Tanzania**       TZ        TZS            Account number up to 16 digits

  **Ethiopia**       ET        ETB            Account number up to 16 digits

  **Cambodia**       KH        USD            Account number up to 16 digits (USD
                                              common)

  **Sri Lanka**      LK        LKR            Account number up to 16 digits

  **Nepal**          NP        NPR            Account number up to 16 digits
  -----------------------------------------------------------------------------------

# **14. Countries Where International Wire Is the Only Option**

These countries have no reliable domestic payout rail accessible to
international platforms. SWIFT wire via SG-12 is the only option.
Settlements typically take 3--7 business days and may incur
correspondent bank fees charged to the recipient.

  -----------------------------------------------------------------------------------
  **Country**        **ISO**   **Currency**   **Wire note**
  ------------------ --------- -------------- ---------------------------------------
  **Afghanistan**    AF        AFN            Correspondent bank required

  **Belarus**        BY        BYR            Sanctions screening required

  **Bolivia**        BO        BOB            SWIFT only --- no local rail access

  **Cuba**           CU        CUP            OFAC restricted --- payouts blocked

  **Iran**           IR        IRR            OFAC restricted --- payouts blocked

  **Iraq**           IQ        IQD            Correspondent bank required

  **Libya**          LY        LYD            Correspondent bank required

  **Myanmar**        MM        MMK            SWIFT only

  **North Korea**    KP        KPW            OFAC restricted --- payouts blocked

  **Somalia**        SO        SOS            Correspondent bank required

  **South Sudan**    SS        SSP            SWIFT only --- high failure rate

  **Sudan**          SD        SDG            OFAC restricted --- payouts blocked

  **Syria**          SY        SYP            OFAC restricted --- payouts blocked

  **Venezuela**      VE        VES            OFAC secondary sanctions --- review
                                              required

  **Yemen**          YE        YER            Correspondent bank required

  **Zimbabwe**       ZW        ZWL            Correspondent bank required
  -----------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **OFAC-blocked countries**                                            |
|                                                                       |
| Countries marked \"OFAC restricted\" must never receive payouts.      |
|                                                                       |
| If a contractor\'s bankCountry is in this list, POST                  |
| /v1/deposit-methods returns:                                          |
|                                                                       |
| 400 ERR_DEPOSIT_COUNTRY_RESTRICTED                                    |
|                                                                       |
| \"Payouts to this country are not currently supported.\"              |
|                                                                       |
| This check happens at method creation time --- not at payout          |
| execution time.                                                       |
|                                                                       |
| kyc-identity-service also screens all payouts against the OFAC SDN    |
| list regardless.                                                      |
+=======================================================================+

# **15. Frontend Field Rendering Map**

The frontend uses this table to determine which fields to show for a
given bankCountry selection. Load this as a static JSON config --- do
not hardcode per-country logic in components.

  ---------------------------------------------------------------------------
  **Schema      **Fields shown**                         **Fields hidden**
  group**                                                
  ------------- ---------------------------------------- --------------------
  **SG-01 US**  bankAccountName, bankRoutingNumber,      bankIban,
                bankAccountNumber, bankCurrency (locked  bankSwiftBic,
                USD)                                     bankIfscCode,
                                                         bankBsbNumber,
                                                         bankSortCode,
                                                         bankCode,
                                                         bankBranchCode,
                                                         bankClabe,
                                                         bankCnapsCode,
                                                         bankBik

  **SG-02       bankAccountName, bankIban, bankSwiftBic  bankRoutingNumber,
  SEPA**        (optional), bankCurrency (pre-selected)  bankAccountNumber,
                                                         bankIfscCode,
                                                         bankBsbNumber,
                                                         bankSortCode,
                                                         bankCode,
                                                         bankBranchCode

  **SG-03 UK**  bankAccountName, bankSortCode,           All other routing
                bankAccountNumber, bankCurrency (locked  fields
                GBP)                                     

  **SG-04       bankAccountName, bankIfscCode,           All other routing
  India**       bankAccountNumber, bankCurrency (locked  fields
                INR)                                     

  **SG-05       bankAccountName, bankBsbNumber,          All other routing
  Australia**   bankAccountNumber, bankCurrency (locked  fields
                AUD)                                     

  **SG-06       bankAccountName, bankCode,               All other routing
  Japan**       bankBranchCode, bankAccountNumber,       fields
                bankCurrency (locked JPY)                

  **SG-07       bankAccountName, bankInstitutionNumber,  All other routing
  Canada**      bankTransitNumber, bankAccountNumber,    fields
                bankCurrency (CAD/USD)                   

  **SG-08       bankAccountName, bankClabe (18 digits),  All routing fields
  Mexico**      bankCurrency (locked MXN)                except CLABE

  **SG-08       bankAccountName, bankCpfCnpj,            All routing fields
  Brazil**      bankAgencia, bankConta, bankSwiftBic,    except above
                bankCurrency                             

  **SG-09 GCC** bankAccountName, bankIban, bankSwiftBic  All domestic routing
                (required), bankCurrency (pre-selected)  fields

  **SG-10       bankAccountName, bankCnapsCode,          All other routing
  China**       bankAccountNumber, bankCurrency (locked  fields
                CNY)                                     

  **SG-11       bankAccountName, bankBik,                All other routing
  Russia**      bankKorrespondentAccount,                fields
                bankAccountNumber, bankCurrency (locked  
                RUB)                                     

  **SG-12 SWIFT bankAccountName, bankSwiftBic,           All domestic routing
  Generic**     bankAccountNumber, bankIban (optional),  fields
                bankCurrency                             
  ---------------------------------------------------------------------------

# **16. References**

  -----------------------------------------------------------------------------------------------------------
  **Document**             **Relevant to**
  ------------------------ ----------------------------------------------------------------------------------
  **PS-06 --- Manual Bank  Implements SG-01 through SG-06 with validation code. PS-07 extends to all groups.
  Entry (7 Regions)**      

  **PS-04 --- Deposit      POST /v1/deposit-methods --- methodType=BANK_MANUAL validation entry point
  Method Management**      

  **PS-01 --- Database     deposit_methods columns for all routing fields referenced in this document
  Schema**                 

  **SEPA country list**    https://www.europeanpaymentscouncil.eu/what-we-do/sepa-schemes/sepa-participants

  **SWIFT BIC format**     ISO 9362:2022

  **IBAN standard**        ISO 13616

  **CLABE standard**       Banco de México specification

  **CNAPS directory**      People\'s Bank of China
  -----------------------------------------------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-07 \| v1.0
