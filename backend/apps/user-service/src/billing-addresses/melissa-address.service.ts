import { Injectable, Logger } from '@nestjs/common';
import { ValidateBillingAddressDto } from './billing-address.dto';

export type AddressValidationStatus =
  | 'verified'
  | 'corrected'
  | 'unverified'
  | 'undeliverable'
  | 'unavailable';

export interface RecommendedAddress {
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
}

export interface AddressValidationResult {
  status: AddressValidationStatus;
  recommended: RecommendedAddress | null;
  resultCodes: string[];
}

interface MelissaRecord {
  Results?: string;
  AddressLine1?: string;
  AddressLine2?: string;
  Locality?: string;
  AdministrativeArea?: string;
  PostalCode?: string;
}

interface MelissaResponse {
  TransmissionResults?: string;
  Records?: MelissaRecord[];
}

const MELISSA_PATH = '/V3/WEB/GlobalAddress/doGlobalAddress';
const DEFAULT_BASE_URL = 'https://address.melissadata.net';
const REQUEST_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_LIMIT = 500;
const FULLY_VERIFIED = /^AV2[1-5]$/;
const US_COUNTRY = /^(us|usa|united states( of america)?)$/i;

const normalize = (value?: string | null) =>
  (value ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const alphanumeric = (value?: string | null) =>
  (value ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

const postalCodesMatch = (provided: string, recommended: string) => {
  const a = alphanumeric(provided);
  const b = alphanumeric(recommended);
  return a === b || (a.length === 5 && b.length === 9 && b.startsWith(a));
};

@Injectable()
export class MelissaAddressService {
  private readonly logger = new Logger(MelissaAddressService.name);
  private readonly cache = new Map<
    string,
    { at: number; result: AddressValidationResult }
  >();

  async validate(
    dto: ValidateBillingAddressDto,
  ): Promise<AddressValidationResult> {
    const licenseKey = process.env.MELISSA_LICENSE_KEY;
    if (!licenseKey) {
      this.logger.warn('MELISSA_LICENSE_KEY is not set, skipping validation');
      return this.unavailable();
    }

    const cacheKey = [
      dto.addressLine1,
      dto.addressLine2,
      dto.city,
      dto.state,
      dto.postalCode,
      dto.country,
    ]
      .map(normalize)
      .join('|');
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.result;

    const response = await this.callMelissa(licenseKey, dto);
    const record = response?.Records?.[0];
    if (!record || response?.TransmissionResults) {
      if (response?.TransmissionResults) {
        this.logger.warn(
          `Melissa rejected the request: ${response.TransmissionResults}`,
        );
      }
      return this.unavailable();
    }

    const result = this.toResult(dto, record);
    this.remember(cacheKey, result);
    return result;
  }

  private async callMelissa(
    licenseKey: string,
    dto: ValidateBillingAddressDto,
  ): Promise<MelissaResponse | null> {
    const baseUrl = (
      process.env.MELISSA_API_BASE_URL || DEFAULT_BASE_URL
    ).replace(/\/+$/, '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${baseUrl}${MELISSA_PATH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          CustomerID: licenseKey,
          Options: 'OutputGeo:OFF,DeliveryLines:ON',
          Records: [
            {
              RecordID: '1',
              AddressLine1: dto.addressLine1,
              ...(dto.addressLine2 ? { AddressLine2: dto.addressLine2 } : {}),
              Locality: dto.city,
              AdministrativeArea: dto.state ?? '',
              PostalCode: dto.postalCode,
              Country: dto.country,
            },
          ],
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        this.logger.warn(`Melissa responded with HTTP ${res.status}`);
        return null;
      }
      return (await res.json()) as MelissaResponse;
    } catch (error) {
      this.logger.warn(
        `Melissa request failed: ${error instanceof Error ? error.name : 'unknown error'}`,
      );
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  private toResult(
    dto: ValidateBillingAddressDto,
    record: MelissaRecord,
  ): AddressValidationResult {
    const resultCodes = (record.Results ?? '')
      .split(',')
      .map((code) => code.trim())
      .filter(Boolean);

    if (resultCodes.some((code) => code.startsWith('AE'))) {
      return { status: 'undeliverable', recommended: null, resultCodes };
    }
    if (!resultCodes.some((code) => FULLY_VERIFIED.test(code))) {
      return { status: 'unverified', recommended: null, resultCodes };
    }

    const isUnitedStates = US_COUNTRY.test(dto.country.trim());
    const recommended: RecommendedAddress = {
      addressLine1: record.AddressLine1 || dto.addressLine1,
      addressLine2: record.AddressLine2 || null,
      city: record.Locality || dto.city,
      state: isUnitedStates
        ? record.AdministrativeArea || dto.state || null
        : dto.state || null,
      postalCode: record.PostalCode || dto.postalCode,
      country: dto.country,
    };

    const sameStreet =
      normalize(`${dto.addressLine1} ${dto.addressLine2 ?? ''}`) ===
      normalize(`${recommended.addressLine1} ${recommended.addressLine2 ?? ''}`);
    const sameCity = normalize(dto.city) === normalize(recommended.city);
    const sameState =
      !isUnitedStates ||
      normalize(dto.state) === normalize(recommended.state);
    const samePostal = postalCodesMatch(dto.postalCode, recommended.postalCode);

    if (sameStreet && sameCity && sameState && samePostal) {
      return { status: 'verified', recommended: null, resultCodes };
    }
    return { status: 'corrected', recommended, resultCodes };
  }

  private remember(key: string, result: AddressValidationResult) {
    if (this.cache.size >= CACHE_LIMIT) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, { at: Date.now(), result });
  }

  private unavailable(): AddressValidationResult {
    return { status: 'unavailable', recommended: null, resultCodes: [] };
  }
}
