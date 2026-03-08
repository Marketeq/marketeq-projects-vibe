**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-06 --- Manual Bank Entry --- International (7 Regions)

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-06 --- Manual Bank Entry --- International (7
                      Regions)

  **Version**         1.0

  **Regions**         US, Europe (SEPA), India, Australia, UK, Japan,
                      Asia Generic (SWIFT)

  **Method type**     BANK_MANUAL

  **Verification**    Micro-deposits --- two amounts \$0.01--\$0.99,
                      3-attempt limit, 24h lock, 10-day expiry

  **Sensitive         Encrypted at rest (AES-256). Only last4 stored in
  fields**            plaintext.

  **Prerequisites**   PS-01, PS-04, PS-05
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Scope of this document**                                            |
|                                                                       |
| PS-06 covers the 7 regions shown in the Marketeq design files.        |
|                                                                       |
| Full global bank coverage (150+ countries) is documented in the       |
| Global Bank Schema                                                    |
|                                                                       |
| Reference (cross-cutting document, not yet assigned a number).        |
|                                                                       |
| Any bank not covered by the 7 regions below uses the Asia Generic     |
| (SWIFT) path.                                                         |
+=======================================================================+

# **1. Region Detection & Form Selection**

The frontend determines which bank form to show based on the
contractor\'s bankCountry selection. The backend validates the submitted
fields against the rules for that country. Mismatched country/field
combinations return ERR_BANK_REGION_FIELD_MISMATCH.

  ---------------------------------------------------------------------------
  **Region**      **bankCountry    **Form shown**     **Routing identifier**
                  values**                            
  --------------- ---------------- ------------------ -----------------------
  **US**          US               US routing +       ABA routing number (9
                                   account number     digits)

  **Europe        AT BE BG HR CY   IBAN only          IBAN (15--34 chars)
  (SEPA)**        CZ DK EE FI FR                      
                  DE GR HU IE IT                      
                  LV LT LU MT NL                      
                  PL PT RO SK SI                      
                  ES SE + others                      

  **India**       IN               IFSC + account     IFSC code (11 chars)
                                   number             

  **Australia**   AU               BSB + account      BSB number (6 digits)
                                   number             

  **UK**          GB               Sort code +        Sort code (6 digits,
                                   account number     formatted XX-XX-XX)

  **Japan**       JP               Bank code + branch Bank code (4 digits) +
                                   code + account     branch code (3 digits)
                                   number             

  **Asia          All others not   SWIFT/BIC +        SWIFT/BIC (8 or 11
  Generic**       matched above    account number     chars)
  ---------------------------------------------------------------------------

# **2. POST /v1/deposit-methods --- BANK_MANUAL Request Shape**

All BANK_MANUAL submissions share a common envelope. The fields present
depend on the bankCountry. The backend determines the required field set
from bankCountry and validates accordingly.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Common fields --- all BANK_MANUAL submissions                      |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"methodType\": \"BANK_MANUAL\",                                      |
|                                                                       |
| \"bankAccountName\": \"Jane Doe\", // account holder full name ---    |
| required all regions                                                  |
|                                                                       |
| \"bankCountry\": \"IN\", // ISO 3166-1 alpha-2 --- required           |
|                                                                       |
| \"bankCurrency\": \"INR\", // ISO 4217 --- required                   |
|                                                                       |
| // US only                                                            |
|                                                                       |
| \"bankRoutingNumber\": \"021000021\", // 9-digit ABA routing          |
|                                                                       |
| \"bankAccountNumber\": \"000123456789\", // encrypted at rest         |
|                                                                       |
| // Europe / UK / Australia / Asia Generic                             |
|                                                                       |
| \"bankIban\": \"GB29NWBK60161331926819\", // IBAN --- required for    |
| SEPA                                                                  |
|                                                                       |
| \"bankSwiftBic\": \"NWBKGB2L\", // SWIFT/BIC --- required for SWIFT   |
| path                                                                  |
|                                                                       |
| // India                                                              |
|                                                                       |
| \"bankIfscCode\": \"HDFC0001234\", // 11 chars                        |
|                                                                       |
| // Australia                                                          |
|                                                                       |
| \"bankBsbNumber\": \"062000\", // 6 digits                            |
|                                                                       |
| // UK                                                                 |
|                                                                       |
| \"bankSortCode\": \"601613\", // 6 digits (dashes stripped)           |
|                                                                       |
| // Japan                                                              |
|                                                                       |
| \"bankCode\": \"0001\", // 4 digits                                   |
|                                                                       |
| \"bankBranchCode\": \"001\", // 3 digits                              |
|                                                                       |
| // All except SEPA-IBAN-only                                          |
|                                                                       |
| \"bankAccountNumber\": \"12345678\" // account number --- encrypted   |
| at rest                                                               |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **3. Region Field Rules**

## **3.1 United States**

  ---------------------------------------------------------------------------------------------------------
  **Field**               **Required**   **Validation rule**              **Error code**
  ----------------------- -------------- -------------------------------- ---------------------------------
  **bankAccountName**     Yes            1--100 characters. No special    ERR_BANK_ACCOUNT_NAME_INVALID
                                         characters except hyphen and     
                                         space.                           

  **bankRoutingNumber**   Yes            Exactly 9 digits. Must pass ABA  ERR_BANK_ROUTING_INVALID
                                         checksum (weighted sum           
                                         algorithm).                      

  **bankAccountNumber**   Yes            4--17 digits. Luhn check not     ERR_BANK_ACCOUNT_NUMBER_INVALID
                                         applied --- account numbers are  
                                         not Luhn-validated.              

  **bankCurrency**        Yes            Must be USD for US accounts.     ERR_BANK_CURRENCY_MISMATCH
  ---------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // ABA routing number checksum (weighted sum validation)              |
|                                                                       |
| function validateAbaRouting(routing: string): boolean {               |
|                                                                       |
| if (!/\^\\d{9}\$/.test(routing)) return false;                        |
|                                                                       |
| const d = routing.split(\'\').map(Number);                            |
|                                                                       |
| const checksum = (                                                    |
|                                                                       |
| 3\*(d\[0\]+d\[3\]+d\[6\]) +                                           |
|                                                                       |
| 7\*(d\[1\]+d\[4\]+d\[7\]) +                                           |
|                                                                       |
| 1\*(d\[2\]+d\[5\]+d\[8\])                                             |
|                                                                       |
| );                                                                    |
|                                                                       |
| return checksum % 10 === 0;                                           |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.2 Europe (SEPA)**

  -------------------------------------------------------------------------------------------------------------------------
  **Field**             **Required**   **Validation rule**                                  **Error code**
  --------------------- -------------- ---------------------------------------------------- -------------------------------
  **bankAccountName**   Yes            1--100 characters.                                   ERR_BANK_ACCOUNT_NAME_INVALID

  **bankIban**          Yes            15--34 alphanumeric. Must pass ISO 7064 MOD-97-10    ERR_BANK_IBAN_INVALID
                                       checksum. Country prefix must match bankCountry.     

  **bankSwiftBic**      No             8 or 11 chars. Format:                               ERR_BANK_SWIFT_INVALID
                                       \[A-Z\]{4}\[A-Z\]{2}\[A-Z0-9\]{2}(\[A-Z0-9\]{3})?.   
                                       Optional for SEPA --- required if provided.          

  **bankCurrency**      Yes            Must be EUR for SEPA zone countries. Exception:      ERR_BANK_CURRENCY_MISMATCH
                                       DK=DKK, CZ=CZK, HU=HUF, PL=PLN, SE=SEK.              
  -------------------------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // IBAN MOD-97-10 validation (ISO 7064)                               |
|                                                                       |
| function validateIban(iban: string): boolean {                        |
|                                                                       |
| const clean = iban.replace(/\\s/g, \'\').toUpperCase();               |
|                                                                       |
| if (!/\^\[A-Z\]{2}\\d{2}\[A-Z0-9\]{11,30}\$/.test(clean)) return      |
| false;                                                                |
|                                                                       |
| // Move first 4 chars to end, convert letters to numbers              |
|                                                                       |
| const rearranged = clean.slice(4) + clean.slice(0, 4);                |
|                                                                       |
| const numeric = rearranged.split(\'\').map(c =\>                      |
|                                                                       |
| isNaN(Number(c)) ? (c.charCodeAt(0) - 55).toString() : c              |
|                                                                       |
| ).join(\'\');                                                         |
|                                                                       |
| // BigInt mod 97                                                      |
|                                                                       |
| let remainder = 0n;                                                   |
|                                                                       |
| for (const chunk of numeric.match(/.{1,9}/g)!) {                      |
|                                                                       |
| remainder = BigInt(remainder.toString() + chunk) % 97n;               |
|                                                                       |
| }                                                                     |
|                                                                       |
| return remainder === 1n;                                              |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.3 India**

  ---------------------------------------------------------------------------------------------------------
  **Field**               **Required**   **Validation rule**              **Error code**
  ----------------------- -------------- -------------------------------- ---------------------------------
  **bankAccountName**     Yes            1--100 characters.               ERR_BANK_ACCOUNT_NAME_INVALID

  **bankIfscCode**        Yes            Exactly 11 characters. Format:   ERR_BANK_IFSC_INVALID
                                         \[A-Z\]{4}0\[A-Z0-9\]{6}. First  
                                         4 = bank code, 5th char always   
                                         0, last 6 = branch code.         

  **bankAccountNumber**   Yes            9--18 digits. No checksum ---    ERR_BANK_ACCOUNT_NUMBER_INVALID
                                         format only.                     

  **bankCurrency**        Yes            Must be INR.                     ERR_BANK_CURRENCY_MISMATCH
  ---------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| const IFSC_REGEX = /\^\[A-Z\]{4}0\[A-Z0-9\]{6}\$/;                    |
|                                                                       |
| function validateIfsc(ifsc: string): boolean {                        |
|                                                                       |
| return IFSC_REGEX.test(ifsc.toUpperCase());                           |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.4 Australia**

  ---------------------------------------------------------------------------------------------------------
  **Field**               **Required**   **Validation rule**              **Error code**
  ----------------------- -------------- -------------------------------- ---------------------------------
  **bankAccountName**     Yes            1--100 characters.               ERR_BANK_ACCOUNT_NAME_INVALID

  **bankBsbNumber**       Yes            Exactly 6 digits (dashes         ERR_BANK_BSB_INVALID
                                         stripped before validation).     
                                         First 2 digits = bank identifier 
                                         (02--76 for major banks).        

  **bankAccountNumber**   Yes            6--10 digits.                    ERR_BANK_ACCOUNT_NUMBER_INVALID

  **bankCurrency**        Yes            Must be AUD.                     ERR_BANK_CURRENCY_MISMATCH
  ---------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| function validateBsb(bsb: string): boolean {                          |
|                                                                       |
| const clean = bsb.replace(/-/g, \'\');                                |
|                                                                       |
| return /\^\\d{6}\$/.test(clean);                                      |
|                                                                       |
| // Display format: XXX-XXX. Strip dashes before storage.              |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.5 United Kingdom**

  ---------------------------------------------------------------------------------------------------------
  **Field**               **Required**   **Validation rule**              **Error code**
  ----------------------- -------------- -------------------------------- ---------------------------------
  **bankAccountName**     Yes            1--100 characters.               ERR_BANK_ACCOUNT_NAME_INVALID

  **bankSortCode**        Yes            6 digits (dashes stripped).      ERR_BANK_SORT_CODE_INVALID
                                         Format: XX-XX-XX in UI.          
                                         Validated as 6 contiguous        
                                         digits.                          

  **bankAccountNumber**   Yes            8 digits exactly. UK accounts    ERR_BANK_ACCOUNT_NUMBER_INVALID
                                         are always 8 digits.             

  **bankCurrency**        Yes            Must be GBP.                     ERR_BANK_CURRENCY_MISMATCH
  ---------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| function validateSortCode(sortCode: string): boolean {                |
|                                                                       |
| return /\^\\d{6}\$/.test(sortCode.replace(/-/g, \'\'));               |
|                                                                       |
| }                                                                     |
|                                                                       |
| function validateUkAccountNumber(account: string): boolean {          |
|                                                                       |
| return /\^\\d{8}\$/.test(account);                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.6 Japan**

  ---------------------------------------------------------------------------------------------------------
  **Field**               **Required**   **Validation rule**              **Error code**
  ----------------------- -------------- -------------------------------- ---------------------------------
  **bankAccountName**     Yes            1--100 characters. Katakana      ERR_BANK_ACCOUNT_NAME_INVALID
                                         accepted.                        

  **bankCode**            Yes            4 digits. Zengin bank code.      ERR_BANK_CODE_INVALID

  **bankBranchCode**      Yes            3 digits. Zengin branch code.    ERR_BANK_BRANCH_CODE_INVALID

  **bankAccountNumber**   Yes            7 digits. Standard Zengin        ERR_BANK_ACCOUNT_NUMBER_INVALID
                                         account number length.           

  **bankCurrency**        Yes            Must be JPY.                     ERR_BANK_CURRENCY_MISMATCH
  ---------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| function validateJapanBankFields(dto: BankManualDto): string\[\] {    |
|                                                                       |
| const errors: string\[\] = \[\];                                      |
|                                                                       |
| if (!/\^\\d{4}\$/.test(dto.bankCode ?? \'\'))                         |
| errors.push(\'ERR_BANK_CODE_INVALID\');                               |
|                                                                       |
| if (!/\^\\d{3}\$/.test(dto.bankBranchCode ?? \'\'))                   |
| errors.push(\'ERR_BANK_BRANCH_CODE_INVALID\');                        |
|                                                                       |
| if (!/\^\\d{7}\$/.test(dto.bankAccountNumber ?? \'\'))                |
| errors.push(\'ERR_BANK_ACCOUNT_NUMBER_INVALID\');                     |
|                                                                       |
| return errors;                                                        |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.7 Asia Generic (SWIFT/BIC)**

Used for all countries not matched by the 6 regions above. Requires a
SWIFT/BIC code and account number. IBAN is optional but validated if
provided.

  -----------------------------------------------------------------------------------------------------------------------------
  **Field**               **Required**   **Validation rule**                                  **Error code**
  ----------------------- -------------- ---------------------------------------------------- ---------------------------------
  **bankAccountName**     Yes            1--100 characters.                                   ERR_BANK_ACCOUNT_NAME_INVALID

  **bankSwiftBic**        Yes            8 or 11 chars. Regex:                                ERR_BANK_SWIFT_INVALID
                                         \[A-Z\]{4}\[A-Z\]{2}\[A-Z0-9\]{2}(\[A-Z0-9\]{3})?.   

  **bankAccountNumber**   Yes            1--34 alphanumeric (SWIFT standard max).             ERR_BANK_ACCOUNT_NUMBER_INVALID

  **bankIban**            No             If provided: validated with MOD-97. Country prefix   ERR_BANK_IBAN_INVALID
                                         must match bankCountry.                              

  **bankCurrency**        Yes            Any valid ISO 4217 3-letter code.                    ERR_BANK_CURRENCY_INVALID
  -----------------------------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| const SWIFT_REGEX =                                                   |
| /\^\[A-Z\]{4}\[A-Z\]{2}\[A-Z0-9\]{2}(\[A-Z0-9\]{3})?\$/;              |
|                                                                       |
| function validateSwiftBic(swift: string): boolean {                   |
|                                                                       |
| return SWIFT_REGEX.test(swift.toUpperCase());                         |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **4. BankValidationService --- Unified Validator**

+-------------------------------------------------------------------------------+
| typescript                                                                    |
+-------------------------------------------------------------------------------+
| // src/methods/bank-validation.service.ts                                     |
|                                                                               |
| \@Injectable()                                                                |
|                                                                               |
| export class BankValidationService {                                          |
|                                                                               |
| validate(dto: BankManualDto): void {                                          |
|                                                                               |
| const errors = this.getRegionErrors(dto);                                     |
|                                                                               |
| if (errors.length \> 0) {                                                     |
|                                                                               |
| throw new PayoutError(                                                        |
|                                                                               |
| \'Bank account details are invalid.\',                                        |
|                                                                               |
| HttpStatus.BAD_REQUEST,                                                       |
|                                                                               |
| errors\[0\], // first error code --- frontend shows field-level errors        |
|                                                                               |
| { fieldErrors: errors },                                                      |
|                                                                               |
| );                                                                            |
|                                                                               |
| }                                                                             |
|                                                                               |
| }                                                                             |
|                                                                               |
| private getRegionErrors(dto: BankManualDto): string\[\] {                     |
|                                                                               |
| const errors: string\[\] = \[\];                                              |
|                                                                               |
| if (!dto.bankAccountName?.trim())                                             |
| errors.push(\'ERR_BANK_ACCOUNT_NAME_INVALID\');                               |
|                                                                               |
| const country = dto.bankCountry?.toUpperCase();                               |
|                                                                               |
| const region = this.detectRegion(country);                                    |
|                                                                               |
| switch (region) {                                                             |
|                                                                               |
| case \'US\':                                                                  |
|                                                                               |
| if (!validateAbaRouting(dto.bankRoutingNumber ?? \'\'))                       |
| errors.push(\'ERR_BANK_ROUTING_INVALID\');                                    |
|                                                                               |
| if (!/\^\\d{4,17}\$/.test(dto.bankAccountNumber ?? \'\'))                     |
| errors.push(\'ERR_BANK_ACCOUNT_NUMBER_INVALID\');                             |
|                                                                               |
| if (dto.bankCurrency !== \'USD\')                                             |
| errors.push(\'ERR_BANK_CURRENCY_MISMATCH\');                                  |
|                                                                               |
| break;                                                                        |
|                                                                               |
| case \'SEPA\':                                                                |
|                                                                               |
| if (!validateIban(dto.bankIban ?? \'\'))                                      |
| errors.push(\'ERR_BANK_IBAN_INVALID\');                                       |
|                                                                               |
| if (dto.bankSwiftBic && !validateSwiftBic(dto.bankSwiftBic))                  |
| errors.push(\'ERR_BANK_SWIFT_INVALID\');                                      |
|                                                                               |
| break;                                                                        |
|                                                                               |
| case \'IN\':                                                                  |
|                                                                               |
| if (!validateIfsc(dto.bankIfscCode ?? \'\'))                                  |
| errors.push(\'ERR_BANK_IFSC_INVALID\');                                       |
|                                                                               |
| if (!/\^\\d{9,18}\$/.test(dto.bankAccountNumber ?? \'\'))                     |
| errors.push(\'ERR_BANK_ACCOUNT_NUMBER_INVALID\');                             |
|                                                                               |
| if (dto.bankCurrency !== \'INR\')                                             |
| errors.push(\'ERR_BANK_CURRENCY_MISMATCH\');                                  |
|                                                                               |
| break;                                                                        |
|                                                                               |
| case \'AU\':                                                                  |
|                                                                               |
| if (!validateBsb(dto.bankBsbNumber ?? \'\'))                                  |
| errors.push(\'ERR_BANK_BSB_INVALID\');                                        |
|                                                                               |
| if (!/\^\\d{6,10}\$/.test(dto.bankAccountNumber ?? \'\'))                     |
| errors.push(\'ERR_BANK_ACCOUNT_NUMBER_INVALID\');                             |
|                                                                               |
| if (dto.bankCurrency !== \'AUD\')                                             |
| errors.push(\'ERR_BANK_CURRENCY_MISMATCH\');                                  |
|                                                                               |
| break;                                                                        |
|                                                                               |
| case \'GB\':                                                                  |
|                                                                               |
| if (!validateSortCode(dto.bankSortCode ?? \'\'))                              |
| errors.push(\'ERR_BANK_SORT_CODE_INVALID\');                                  |
|                                                                               |
| if (!validateUkAccountNumber(dto.bankAccountNumber ?? \'\'))                  |
| errors.push(\'ERR_BANK_ACCOUNT_NUMBER_INVALID\');                             |
|                                                                               |
| if (dto.bankCurrency !== \'GBP\')                                             |
| errors.push(\'ERR_BANK_CURRENCY_MISMATCH\');                                  |
|                                                                               |
| break;                                                                        |
|                                                                               |
| case \'JP\':                                                                  |
|                                                                               |
| errors.push(\...validateJapanBankFields(dto));                                |
|                                                                               |
| if (dto.bankCurrency !== \'JPY\')                                             |
| errors.push(\'ERR_BANK_CURRENCY_MISMATCH\');                                  |
|                                                                               |
| break;                                                                        |
|                                                                               |
| default: // SWIFT                                                             |
|                                                                               |
| if (!validateSwiftBic(dto.bankSwiftBic ?? \'\'))                              |
| errors.push(\'ERR_BANK_SWIFT_INVALID\');                                      |
|                                                                               |
| if (!dto.bankAccountNumber?.trim())                                           |
| errors.push(\'ERR_BANK_ACCOUNT_NUMBER_INVALID\');                             |
|                                                                               |
| if (dto.bankIban && !validateIban(dto.bankIban))                              |
| errors.push(\'ERR_BANK_IBAN_INVALID\');                                       |
|                                                                               |
| break;                                                                        |
|                                                                               |
| }                                                                             |
|                                                                               |
| return errors;                                                                |
|                                                                               |
| }                                                                             |
|                                                                               |
| private detectRegion(country: string): string {                               |
|                                                                               |
| if (country === \'US\') return \'US\';                                        |
|                                                                               |
| if (country === \'IN\') return \'IN\';                                        |
|                                                                               |
| if (country === \'AU\') return \'AU\';                                        |
|                                                                               |
| if (country === \'GB\') return \'GB\';                                        |
|                                                                               |
| if (country === \'JP\') return \'JP\';                                        |
|                                                                               |
| if (SEPA_COUNTRIES.has(country)) return \'SEPA\';                             |
|                                                                               |
| return \'SWIFT\';                                                             |
|                                                                               |
| }                                                                             |
|                                                                               |
| }                                                                             |
|                                                                               |
| const SEPA_COUNTRIES = new Set(\[                                             |
|                                                                               |
| \'AT\',\'BE\',\'BG\',\'HR\',\'CY\',\'CZ\',\'DK\',\'EE\',\'FI\',\'FR\',\'DE\', |
|                                                                               |
| \'GR\',\'HU\',\'IE\',\'IT\',\'LV\',\'LT\',\'LU\',\'MT\',\'NL\',\'PL\',\'PT\', |
|                                                                               |
| \'RO\',\'SK\',\'SI\',\'ES\',\'SE\',\'IS\',\'LI\',\'NO\',\'CH\',               |
|                                                                               |
| \]);                                                                          |
+===============================================================================+

# **5. Sensitive Field Encryption**

  ------------------------------------------------------------------------
  **Field**              **Stored how**            **What is readable in
                                                   DB**
  ---------------------- ------------------------- -----------------------
  **bankAccountNumber    AES-256-GCM encrypted.    Encrypted ciphertext
  (all regions)**        Key from                  only
                         BANK_ENCRYPTION_KEY env   
                         var.                      

  **bankRoutingNumber    AES-256-GCM encrypted.    Encrypted ciphertext
  (US)**                                           only

  **bankIban             AES-256-GCM encrypted.    Encrypted ciphertext
  (SEPA/SWIFT)**                                   only. bankIbanLast4
                                                   stored separately in
                                                   plaintext.

  **bankSortCode (UK)**  AES-256-GCM encrypted.    Encrypted ciphertext
                                                   only

  **bankBsbNumber (AU)** AES-256-GCM encrypted.    Encrypted ciphertext
                                                   only

  **bankIfscCode (IN)**  Not encrypted --- IFSC is Stored plaintext
                         a public bank identifier, 
                         not sensitive.            

  **bankCode +           Not encrypted --- public  Stored plaintext
  bankBranchCode (JP)**  identifiers.              

  **bankSwiftBic         Not encrypted --- public  Stored plaintext
  (SWIFT)**              identifier.               

  **bankAccountLast4**   Not encrypted --- display Stored plaintext
                         only.                     
  ------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/methods/bank-encryption.service.ts                             |
|                                                                       |
| import { createCipheriv, createDecipheriv, randomBytes } from         |
| \'crypto\';                                                           |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class BankEncryptionService {                                  |
|                                                                       |
| private readonly KEY: Buffer;                                         |
|                                                                       |
| private readonly ALG = \'aes-256-gcm\';                               |
|                                                                       |
| constructor(private config: ConfigService) {                          |
|                                                                       |
| const keyHex = this.config.getOrThrow(\'BANK_ENCRYPTION_KEY\'); //    |
| 64-char hex = 32 bytes                                                |
|                                                                       |
| this.KEY = Buffer.from(keyHex, \'hex\');                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| encrypt(plaintext: string): string {                                  |
|                                                                       |
| const iv = randomBytes(12); // 96-bit IV for GCM                      |
|                                                                       |
| const cipher = createCipheriv(this.ALG, this.KEY, iv);                |
|                                                                       |
| const enc = Buffer.concat(\[cipher.update(plaintext, \'utf8\'),       |
| cipher.final()\]);                                                    |
|                                                                       |
| const tag = cipher.getAuthTag();                                      |
|                                                                       |
| // Format: iv(hex):tag(hex):ciphertext(hex)                           |
|                                                                       |
| return \[iv.toString(\'hex\'), tag.toString(\'hex\'),                 |
| enc.toString(\'hex\')\].join(\':\');                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| decrypt(stored: string): string {                                     |
|                                                                       |
| const \[ivHex, tagHex, ctHex\] = stored.split(\':\');                 |
|                                                                       |
| const decipher = createDecipheriv(this.ALG, this.KEY,                 |
|                                                                       |
| Buffer.from(ivHex, \'hex\'));                                         |
|                                                                       |
| decipher.setAuthTag(Buffer.from(tagHex, \'hex\'));                    |
|                                                                       |
| return decipher.update(Buffer.from(ctHex, \'hex\'), undefined,        |
| \'utf8\')                                                             |
|                                                                       |
| \+ decipher.final(\'utf8\');                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **6. Micro-Deposit Verification Flow**

After a BANK_MANUAL method is added, payout-service initiates the
Marketeq-managed micro-deposit flow. Two amounts between \$0.01 and
\$0.99 are sent to the account via Stripe ACH. The contractor enters
both amounts to complete verification.

  ---------------------------------------------------------------------------
  **Step**        **Actor**   **Action**
  --------------- ----------- -----------------------------------------------
  **1 --- Method  Backend     deposit_methods row created with
  added**                     verificationStatus=pending.
                              deposit_method_verification row created with
                              two random cent amounts, expiresAt=+10 days.

  **2 ---         Backend     Stripe ACH transfer initiated for two amounts.
  Deposits sent**             Statement descriptor: MRKTEQ.

  **3 --- Await   ---         1--2 business days. Contractor waits.
  arrival**                   

  **4 ---         Frontend    POST
  Contractor                  /v1/deposit-methods/:id/verify-micro-deposits
  enters                      with amount1Cents and amount2Cents.
  amounts**                   

  **5 --- Match   Backend     Compare submitted amounts to stored amounts
  check**                     (order-independent). On match:
                              verificationStatus=verified. On mismatch:
                              increment attempt_count.

  **6a --- 3rd    Backend     verificationStatus=locked. lockedUntil=+24h.
  failed                      Contractor must wait 24h then retry.
  attempt**                   

  **6b --- 10     Cron        verificationStatus=expired. Contractor must
  days elapsed**              re-add the method.
  ---------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Amount match is order-independent**                                 |
|                                                                       |
| Contractor may enter the two amounts in any order.                    |
|                                                                       |
| Validation: sort(\[submitted1, submitted2\]) must equal               |
| sort(\[stored1, stored2\]).                                           |
|                                                                       |
| Do not require the contractor to match the deposit order --- they may |
| not know which arrived first.                                         |
+=======================================================================+

# **7. Display Label Generation Per Region**

  ------------------------------------------------------------------------
  **Region**      **displayLabel format**  **Example**
  --------------- ------------------------ -------------------------------
  **US**          {bankName} ••••{last4}   Chase ••••4242

  **Europe        {bankName} {IBAN last 4} Deutsche Bank ••••5678
  (SEPA)**                                 

  **India**       IFSC {ifscCode}          HDFC0001234 ••••3456
                  ••••{last4}              

  **Australia**   BSB {bsb} ••••{last4}    BSB 062-000 ••••7890

  **UK**          {bankName} {sort code}   Barclays 20-12-34 ••••1234
                  ••••{last4}              

  **Japan**       Bank {bankCode} Branch   Bank 0001 Branch 001 ••••5678
                  {branchCode} ••••{last4} 

  **Asia Generic  SWIFT {swift}            SWIFT DBSSSGSG ••••2345
  (SWIFT)**       ••••{last4}              
  ------------------------------------------------------------------------

bankName is not stored --- it is not submitted by the contractor for
BANK_MANUAL. The display label uses the routing identifier (IFSC, BSB,
sort code etc.) as a proxy for bank identity for all non-Stripe manual
methods.

# **8. References**

  -----------------------------------------------------------------------
  **Document**           **Relevant to**
  ---------------------- ------------------------------------------------
  **PS-01 --- Database   deposit_method_verification table,
  Schema**               bankIbanLast4, bankBsbNumber, bankSortCode
                         columns

  **PS-04 --- Deposit    verificationStatus transitions, attempt limits,
  Method Management**    lock/expiry behaviour

  **PS-05 --- Stripe     Stripe-native micro-deposits (different from §6
  Financial              of this document --- Marketeq-managed
  Connections**          micro-deposits)

  **Global Bank Schema   Full country coverage for regions beyond the 7
  Reference**            documented here
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-06 \| v1.0
