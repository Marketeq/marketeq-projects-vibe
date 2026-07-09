import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }      from '@nestjs/config';

const COUNTRY_CURRENCY: Record<string, string> = {
  US:'USD', GB:'GBP', IN:'INR', AU:'AUD', CA:'CAD',
  JP:'JPY', CN:'CNY', SG:'SGD', AE:'AED', PK:'PKR', NG:'NGN',
  PH:'PHP', BD:'BDT', ID:'IDR', VN:'VND', MX:'MXN', BR:'BRL',
  DE:'EUR', FR:'EUR', ES:'EUR', IT:'EUR', NL:'EUR', BE:'EUR',
  PL:'PLN', UA:'UAH', RO:'RON', HU:'HUF', CZ:'CZK', SE:'SEK',
  NO:'NOK', DK:'DKK', CH:'CHF', NZ:'NZD', ZA:'ZAR', KE:'KES',
  GH:'GHS', EG:'EGP', MA:'MAD', TZ:'TZS', ET:'ETB', UG:'UGX',
  KR:'KRW', TW:'TWD', HK:'HKD', TH:'THB', MY:'MYR', TR:'TRY',
  IL:'ILS', SA:'SAR', QA:'QAR', KW:'KWD', BH:'BHD', OM:'OMR',
  AR:'ARS', CL:'CLP', CO:'COP', PE:'PEN', VE:'VES',
  RU:'RUB', KZ:'KZT', UZ:'UZS', AZ:'AZN', GE:'GEL',
};

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly defaultCurrency: string;

  constructor(private readonly config: ConfigService) {
    this.defaultCurrency = this.config.get('DEFAULT_CURRENCY', 'USD');
  }

  // Detect currency from IP. Full MaxMind integration added when GeoLite2 DB is available.
  // For now returns default currency. In production, auth-service handles geo-detection
  // and embeds localCurrency in the JWT.
  async detectCurrency(ip: string): Promise<string> {
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.'))
      return this.defaultCurrency;

    // TODO: MaxMind GeoLite2 integration when DB file is mounted
    this.logger.debug(`GeoService: ${ip} → default ${this.defaultCurrency} (MaxMind not configured)`);
    return this.defaultCurrency;
  }

  // Static lookup for testing
  getCurrencyForCountry(countryCode: string): string {
    return COUNTRY_CURRENCY[countryCode.toUpperCase()] ?? this.defaultCurrency;
  }
}
