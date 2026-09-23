import { Injectable, HttpStatus } from '@nestjs/common';
import { PayoutError } from '../common/errors/payout.error';
import { isOfacBlockedCountry } from '../common/ofac-countries';

const SEPA_COUNTRIES = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE',
  'GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT',
  'RO','SK','SI','ES','SE','IS','LI','NO','CH','MC','SM','AD','VA',
]);

const UK_COUNTRIES = new Set(['GB','GG','JE','IM']);

const GCC_COUNTRIES = new Set(['AE','SA','QA','BH','KW','OM']);

const SEPA_CURRENCY_MAP: Record<string, string> = {
  BG:'BGN', CZ:'CZK', DK:'DKK', HU:'HUF', PL:'PLN', RO:'RON',
  SE:'SEK', IS:'ISK', NO:'NOK', CH:'CHF', LI:'CHF',
};

const GCC_CURRENCY_MAP: Record<string, string> = {
  AE:'AED', SA:'SAR', QA:'QAR', BH:'BHD', KW:'KWD', OM:'OMR',
};

const BACS_COUNTRIES = new Set(['BR','MX','ZA','NG','KE','PK','BD','PH','ID','VN','TH','MY']);

@Injectable()
export class BankValidationService {

  validate(dto: any): void {
    // OFAC check first
    const country = dto.bankCountry?.toUpperCase();
    if (isOfacBlockedCountry(country)) {
      throw new PayoutError('Payouts to this country are not currently supported.',
        HttpStatus.BAD_REQUEST, 'ERR_DEPOSIT_COUNTRY_RESTRICTED');
    }

    const errors = this.getRegionErrors(dto);
    if (errors.length > 0) {
      throw new PayoutError('Bank account details are invalid.',
        HttpStatus.BAD_REQUEST, errors[0], { fieldErrors: errors });
    }
  }

  detectRegion(country: string): string {
    if (!country) return 'SWIFT';
    const c = country.toUpperCase();
    if (c === 'US') return 'US';
    if (c === 'IN') return 'IN';
    if (c === 'AU') return 'AU';
    if (c === 'JP') return 'JP';
    if (c === 'CA') return 'CA';
    if (c === 'CN') return 'CN';
    if (c === 'RU') return 'RU';
    if (c === 'MX') return 'MX';
    if (UK_COUNTRIES.has(c)) return 'GB';
    if (SEPA_COUNTRIES.has(c)) return 'SEPA';
    if (GCC_COUNTRIES.has(c)) return 'GCC';
    if (BACS_COUNTRIES.has(c)) return 'BACS';
    return 'SWIFT';
  }

  generateDisplayLabel(dto: any): string {
    const last4 = dto.bankAccountNumber?.slice(-4) ?? dto.bankIban?.slice(-4) ?? '????';
    const region = this.detectRegion(dto.bankCountry);

    switch (region) {
      case 'US':    return `Bank ••••${last4}`;
      case 'SEPA':  return `IBAN ••••${dto.bankIban?.slice(-4) ?? last4}`;
      case 'GB':    return `Sort ${this.formatSortCode(dto.bankSortCode)} ••••${last4}`;
      case 'IN':    return `${dto.bankIfscCode ?? 'IFSC'} ••••${last4}`;
      case 'AU':    return `BSB ${this.formatBsb(dto.bankBsbNumber)} ••••${last4}`;
      case 'JP':    return `Bank ${dto.bankCode ?? '?'} Branch ${dto.bankBranchCode ?? '?'} ••••${last4}`;
      case 'CA':    return `Inst ${dto.bankInstitutionNumber ?? '?'} Transit ${dto.bankTransitNumber ?? '?'} ••••${last4}`;
      case 'MX':    return `CLABE ••••${dto.bankClabe?.slice(-4) ?? last4}`;
      case 'GCC':   return `IBAN ••••${dto.bankIban?.slice(-4) ?? last4}`;
      case 'CN':    return `CNAPS ${dto.bankCnapsCode ?? '?'} ••••${last4}`;
      case 'RU':    return `BIK ${dto.bankBik ?? '?'} ••••${last4}`;
      case 'BACS':  return `SWIFT ${dto.bankSwiftBic ?? '?'} ••••${last4}`;
      default:      return `SWIFT ${dto.bankSwiftBic ?? '?'} ••••${last4}`;
    }
  }

  private getRegionErrors(dto: any): string[] {
    const errors: string[] = [];
    if (!dto.bankAccountName?.trim() || dto.bankAccountName.length > 100)
      errors.push('ERR_BANK_ACCOUNT_NAME_INVALID');

    const country = dto.bankCountry?.toUpperCase();
    if (!country) { errors.push('ERR_BANK_REGION_FIELD_MISMATCH'); return errors; }
    const region = this.detectRegion(country);

    switch (region) {
      case 'US':
        if (!this.validateAbaRouting(dto.bankRoutingNumber ?? '')) errors.push('ERR_BANK_ROUTING_INVALID');
        if (!/^\d{4,17}$/.test(dto.bankAccountNumber ?? '')) errors.push('ERR_BANK_ACCOUNT_NUMBER_INVALID');
        if (dto.bankCurrency !== 'USD') errors.push('ERR_BANK_CURRENCY_MISMATCH');
        break;

      case 'SEPA':
        if (!this.validateIban(dto.bankIban ?? '')) errors.push('ERR_BANK_IBAN_INVALID');
        if (dto.bankSwiftBic && !this.validateSwiftBic(dto.bankSwiftBic)) errors.push('ERR_BANK_SWIFT_INVALID');
        const expectedSepaCurrency = SEPA_CURRENCY_MAP[country] ?? 'EUR';
        if (dto.bankCurrency && dto.bankCurrency !== expectedSepaCurrency) errors.push('ERR_BANK_CURRENCY_MISMATCH');
        break;

      case 'GB':
        if (!/^\d{6}$/.test((dto.bankSortCode ?? '').replace(/-/g, ''))) errors.push('ERR_BANK_SORT_CODE_INVALID');
        if (!/^\d{8}$/.test(dto.bankAccountNumber ?? '')) errors.push('ERR_BANK_ACCOUNT_NUMBER_INVALID');
        if (dto.bankCurrency !== 'GBP') errors.push('ERR_BANK_CURRENCY_MISMATCH');
        break;

      case 'IN':
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test((dto.bankIfscCode ?? '').toUpperCase())) errors.push('ERR_BANK_IFSC_INVALID');
        if (!/^\d{9,18}$/.test(dto.bankAccountNumber ?? '')) errors.push('ERR_BANK_ACCOUNT_NUMBER_INVALID');
        if (dto.bankCurrency !== 'INR') errors.push('ERR_BANK_CURRENCY_MISMATCH');
        break;

      case 'AU':
        if (!/^\d{6}$/.test((dto.bankBsbNumber ?? '').replace(/-/g, ''))) errors.push('ERR_BANK_BSB_INVALID');
        if (!/^\d{6,10}$/.test(dto.bankAccountNumber ?? '')) errors.push('ERR_BANK_ACCOUNT_NUMBER_INVALID');
        if (dto.bankCurrency !== 'AUD') errors.push('ERR_BANK_CURRENCY_MISMATCH');
        break;

      case 'JP':
        if (!/^\d{4}$/.test(dto.bankCode ?? '')) errors.push('ERR_BANK_CODE_INVALID');
        if (!/^\d{3}$/.test(dto.bankBranchCode ?? '')) errors.push('ERR_BANK_BRANCH_CODE_INVALID');
        if (!/^\d{7}$/.test(dto.bankAccountNumber ?? '')) errors.push('ERR_BANK_ACCOUNT_NUMBER_INVALID');
        if (dto.bankCurrency !== 'JPY') errors.push('ERR_BANK_CURRENCY_MISMATCH');
        break;

      case 'CA':
        if (!/^\d{3}$/.test(dto.bankInstitutionNumber ?? '')) errors.push('ERR_BANK_INSTITUTION_INVALID');
        if (!/^\d{5}$/.test(dto.bankTransitNumber ?? '')) errors.push('ERR_BANK_TRANSIT_INVALID');
        if (!/^\d{7,12}$/.test(dto.bankAccountNumber ?? '')) errors.push('ERR_BANK_ACCOUNT_NUMBER_INVALID');
        if (dto.bankCurrency && !['CAD','USD'].includes(dto.bankCurrency)) errors.push('ERR_BANK_CURRENCY_MISMATCH');
        break;

      case 'MX':
        if (!this.validateClabe(dto.bankClabe ?? '')) errors.push('ERR_BANK_CLABE_INVALID');
        if (dto.bankCurrency !== 'MXN') errors.push('ERR_BANK_CURRENCY_MISMATCH');
        break;

      case 'GCC':
        if (!this.validateIban(dto.bankIban ?? '')) errors.push('ERR_BANK_IBAN_INVALID');
        if (!this.validateSwiftBic(dto.bankSwiftBic ?? '')) errors.push('ERR_BANK_SWIFT_INVALID');
        const expectedGccCurrency = GCC_CURRENCY_MAP[country];
        if (dto.bankCurrency && dto.bankCurrency !== expectedGccCurrency) errors.push('ERR_BANK_CURRENCY_MISMATCH');
        break;

      case 'CN':
        if (!/^\d{12}$/.test(dto.bankCnapsCode ?? '')) errors.push('ERR_BANK_CNAPS_INVALID');
        if (!/^\d{16,19}$/.test(dto.bankAccountNumber ?? '')) errors.push('ERR_BANK_ACCOUNT_NUMBER_INVALID');
        if (dto.bankCurrency !== 'CNY') errors.push('ERR_BANK_CURRENCY_MISMATCH');
        break;

      case 'RU':
        if (!/^\d{9}$/.test(dto.bankBik ?? '')) errors.push('ERR_BANK_BIK_INVALID');
        if (!/^\d{20}$/.test(dto.bankAccountNumber ?? '')) errors.push('ERR_BANK_ACCOUNT_NUMBER_INVALID');
        if (dto.bankCurrency !== 'RUB') errors.push('ERR_BANK_CURRENCY_MISMATCH');
        break;

      case 'BACS':
        if (!this.validateSwiftBic(dto.bankSwiftBic ?? '')) errors.push('ERR_BANK_SWIFT_INVALID');
        if (!dto.bankAccountNumber?.trim()) errors.push('ERR_BANK_ACCOUNT_NUMBER_INVALID');
        break;

      default: // SWIFT Generic
        if (!this.validateSwiftBic(dto.bankSwiftBic ?? '')) errors.push('ERR_BANK_SWIFT_INVALID');
        if (!dto.bankAccountNumber?.trim()) errors.push('ERR_BANK_ACCOUNT_NUMBER_INVALID');
        if (dto.bankIban && !this.validateIban(dto.bankIban)) errors.push('ERR_BANK_IBAN_INVALID');
        break;
    }
    return errors;
  }

  // ─── Validators ───────────────────────────────────────────────

  private validateAbaRouting(routing: string): boolean {
    if (!/^\d{9}$/.test(routing)) return false;
    const d = routing.split('').map(Number);
    return (3*(d[0]+d[3]+d[6]) + 7*(d[1]+d[4]+d[7]) + 1*(d[2]+d[5]+d[8])) % 10 === 0;
  }

  private validateIban(iban: string): boolean {
    const clean = iban.replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(clean)) return false;
    const rearranged = clean.slice(4) + clean.slice(0, 4);
    const numeric = rearranged.split('').map(c =>
      isNaN(Number(c)) ? (c.charCodeAt(0) - 55).toString() : c
    ).join('');
    let remainder = 0n;
    for (const chunk of numeric.match(/.{1,9}/g)!) {
      remainder = BigInt(remainder.toString() + chunk) % 97n;
    }
    return remainder === 1n;
  }

  private validateSwiftBic(swift: string): boolean {
    return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift.toUpperCase());
  }

  private validateClabe(clabe: string): boolean {
    if (!/^\d{18}$/.test(clabe)) return false;
    const d = clabe.split('').map(Number);
    const weights = [3,7,1,3,7,1,3,7,1,3,7,1,3,7,1,3,7];
    const sum = weights.reduce((acc, w, i) => acc + (w * d[i]) % 10, 0);
    return (10 - (sum % 10)) % 10 === d[17];
  }

  private formatBsb(bsb: string): string {
    const clean = (bsb ?? '').replace(/-/g, '');
    return clean.length === 6 ? `${clean.slice(0,3)}-${clean.slice(3)}` : clean;
  }

  private formatSortCode(sc: string): string {
    const clean = (sc ?? '').replace(/-/g, '');
    return clean.length === 6 ? `${clean.slice(0,2)}-${clean.slice(2,4)}-${clean.slice(4)}` : clean;
  }
}
