import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TinEncryptionService } from './tin-encryption.service';
import { Repository } from 'typeorm';
import { TaxInfo } from './tax-info.entity';
import { UpsertTaxInfoDto } from './tax-info.dto';

// Every field on the form is mandatory. There are no optional fields here:
// the W-9 substitute is incomplete without any one of them.
const IDENTIFICATION_FIELDS = [
  'legalFullName',
  'federalTaxClassification',
  'tinType',
  'tin',
  'country',
  'addressLine1',
  'addressLine2',
  'city',
  'stateOrProvince',
  'postalCode',
] as const;

/** A TIN is nine digits, whatever punctuation it was typed with. */
const isTinComplete = (tin?: string | null) =>
  !!tin && tin.replace(/\D/g, '').length === 9;

@Injectable()
export class TaxInfoService {
  constructor(
    @InjectRepository(TaxInfo)
    private readonly repo: Repository<TaxInfo>,
    private readonly tinCrypto: TinEncryptionService,
  ) {}

  /**
   * Which certification applies. A US person certifies on a W-9; anyone else
   * uses the W-8 series, so showing them W-9 text would have them certify to
   * being a US person, which is false.
   */
  private formKindFor(entity?: TaxInfo | null): 'W-9' | 'W-8BEN' {
    return entity?.country === 'United States' ? 'W-9' : 'W-8BEN';
  }

  /** Fields the signature certifies. Changing any of them voids it. */
  private static readonly CERTIFIED_FIELDS = [
    'legalFullName',
    'federalTaxClassification',
    'tinType',
    'tin',
    'country',
    'addressLine1',
    'addressLine2',
    'city',
    'stateOrProvince',
    'postalCode',
  ] as const;

  /**
   * Read shape. `tin` is deliberately dropped and replaced by its last four
   * digits so the full identifier never leaves the service.
   */
  private toView(entity: TaxInfo | null) {
    if (!entity) {
      return {
        exists: false,
        identificationComplete: false,
        certificationProgress: 0,
        submitted: false,
        formKind: 'W-9' as const,
        forms: [],
      };
    }

    const { tin, ...rest } = entity;
    const plainTin = this.tinCrypto.decrypt(tin);

    const identificationComplete =
      IDENTIFICATION_FIELDS.every((f) => !!entity[f]) &&
      isTinComplete(plainTin);

    // Four things make up the certification: a signature, a date, and the two
    // consents. Reported as a percentage so the UI can show partial progress.
    const certificationParts = [
      !!entity.signature,
      !!entity.signedDate,
      entity.consentESignature,
      entity.consentDigitalDelivery,
    ];
    const certificationProgress = Math.round(
      (certificationParts.filter(Boolean).length / certificationParts.length) *
        100,
    );

    return {
      ...rest,
      exists: true,
      submitted: !!entity.submittedAt,
      forms: this.buildForms(entity),
      tinLast4: this.tinCrypto.last4(plainTin),
      formKind: this.formKindFor(entity),
      identificationComplete,
      certificationProgress,
    };
  }

  /**
   * Documents the platform can produce once the W-9 is certified.
   *
   * The W-9 substitute is ours to issue: it is built from what the user just
   * certified, so it exists the moment they submit. The two 1099s are the
   * year-end reports of what was actually paid, so they are listed for the
   * current and previous tax year and resolve to a generated PDF.
   */
  private buildForms(entity: TaxInfo) {
    if (!entity.submittedAt) return [];

    const submittedYear = new Date(entity.submittedAt).getFullYear();
    const span = (start: number) => `${start} - ${start + 1}`;

    return [
      {
        id: `${entity.id}-cert`,
        formType: this.formKindFor(entity),
        issuerName: entity.legalFullName ?? '',
        amount: '',
        taxYear: span(submittedYear),
        downloadUrl: `/user/tax-info/documents/certification`,
        isLastYear: false,
      },
      {
        id: `${entity.id}-nec-${submittedYear}`,
        formType: '1099-NEC' as const,
        issuerName: 'Marketeq Digital',
        amount: '',
        taxYear: span(submittedYear),
        downloadUrl: `/user/tax-info/documents/1099-nec/${submittedYear}`,
        isLastYear: false,
      },
      {
        id: `${entity.id}-nec-${submittedYear - 1}`,
        formType: '1099-NEC' as const,
        issuerName: 'Marketeq Digital',
        amount: '',
        taxYear: span(submittedYear - 1),
        downloadUrl: `/user/tax-info/documents/1099-nec/${submittedYear - 1}`,
        isLastYear: true,
      },
    ];
  }

  /**
   * Certify the W-9. Requires the whole form, not a partial one: a signature
   * without consents, or an identity without a TIN, is not a valid
   * certification and must not be recorded as one.
   */
  async submit(userId: string) {
    const entity = await this.repo.findOne({ where: { userId } });
    if (!entity) {
      throw new BadRequestException('Add your tax information before submitting');
    }

    const missing: string[] = [];
    for (const field of IDENTIFICATION_FIELDS) {
      if (!entity[field]) missing.push(field);
    }
    if (entity.tin && !isTinComplete(this.tinCrypto.decrypt(entity.tin)))
      missing.push('tin (9 digits)');
    if (!entity.signature) missing.push('signature');
    if (!entity.signedDate) missing.push('signedDate');
    if (!entity.consentESignature) missing.push('consentESignature');
    if (!entity.consentDigitalDelivery) missing.push('consentDigitalDelivery');

    if (missing.length) {
      throw new BadRequestException(
        `Complete every field before submitting: ${missing.join(', ')}`,
      );
    }

    await this.repo.update(entity.id, { submittedAt: new Date() });
    return this.get(userId);
  }

  /** Raw entity plus the last four TIN digits, for PDF rendering only. */
  async forDocument(userId: string) {
    const entity = await this.repo.findOne({ where: { userId } });
    return {
      entity,
      tinLast4: entity ? this.tinCrypto.last4(this.tinCrypto.decrypt(entity.tin)) : null,
    };
  }

  async get(userId: string) {
    return this.toView(await this.repo.findOne({ where: { userId } }));
  }

  async upsert(userId: string, dto: UpsertTaxInfoDto) {
    const existing = await this.repo.findOne({ where: { userId } });

    const patch: Partial<TaxInfo> = { ...dto };
    if (dto.tin) patch.tin = this.tinCrypto.encrypt(dto.tin);

    if (existing) {
      // A signature certifies a specific set of facts. If any of them change
      // after submission the certification no longer describes the record, so
      // it is cleared and the form has to be signed again.
      const changed = TaxInfoService.CERTIFIED_FIELDS.some((field) => {
        if (!(field in patch)) return false;
        if (field === 'tin') {
          return (
            !!dto.tin &&
            dto.tin !== this.tinCrypto.decrypt(existing.tin)
          );
        }
        return patch[field] !== existing[field];
      });

      if (existing.submittedAt && changed) {
        patch.submittedAt = null;
        patch.signature = null;
        patch.signedDate = null;
        patch.consentESignature = false;
        patch.consentDigitalDelivery = false;
      }
      await this.repo.update(existing.id, patch);
    } else {
      await this.repo.save(this.repo.create({ userId, ...patch }));
    }
    return this.get(userId);
  }
}
