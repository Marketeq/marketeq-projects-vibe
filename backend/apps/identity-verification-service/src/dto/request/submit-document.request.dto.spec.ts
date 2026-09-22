import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SubmitDocumentRequestDto } from './submit-document.request.dto';
import { DocumentType, CaptureMethod } from '../../entities/enums/identity-verification.enums';

describe('SubmitDocumentRequestDto — expirationDate', () => {
  const base = {
    issuingCountry: 'US',
    documentNumber: 'X1234567',
    captureMethod: CaptureMethod.MANUAL_ENTRY,
    documentImageReference: 'identity-documents/profile-1/scan.jpg',
  };

  const validate_ = async (payload: Record<string, unknown>) => {
    const instance = plainToInstance(SubmitDocumentRequestDto, payload);
    return validate(instance);
  };

  const errorsFor = (errors: Awaited<ReturnType<typeof validate>>, property: string) =>
    errors.find((e) => e.property === property);

  it('allows a drivers_licence submission with expirationDate omitted', async () => {
    const errors = await validate_({
      ...base,
      documentType: DocumentType.DRIVERS_LICENCE,
      issuingState: 'CA',
    });

    expect(errorsFor(errors, 'expirationDate')).toBeUndefined();
  });

  it('accepts a drivers_licence submission with a valid future expirationDate', async () => {
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const errors = await validate_({
      ...base,
      documentType: DocumentType.DRIVERS_LICENCE,
      issuingState: 'CA',
      expirationDate: futureDate,
    });

    expect(errorsFor(errors, 'expirationDate')).toBeUndefined();
  });

  it('rejects a drivers_licence submission with an invalid supplied expirationDate', async () => {
    const errors = await validate_({
      ...base,
      documentType: DocumentType.DRIVERS_LICENCE,
      issuingState: 'CA',
      expirationDate: '2020-01-01', // valid format, but in the past
    });

    const err = errorsFor(errors, 'expirationDate');
    expect(err).toBeDefined();
    expect(err?.constraints).toHaveProperty('isNotPastDate');
  });

  it('rejects a drivers_licence submission with a malformed supplied expirationDate', async () => {
    const errors = await validate_({
      ...base,
      documentType: DocumentType.DRIVERS_LICENCE,
      issuingState: 'CA',
      expirationDate: 'not-a-date',
    });

    const err = errorsFor(errors, 'expirationDate');
    expect(err).toBeDefined();
    expect(err?.constraints).toHaveProperty('matches');
  });

  it.each([DocumentType.PASSPORT, DocumentType.ID_CARD, DocumentType.RESIDENCE_PERMIT])(
    'still requires expirationDate for %s',
    async (documentType) => {
      const errors = await validate_({
        ...base,
        documentType,
      });

      const err = errorsFor(errors, 'expirationDate');
      expect(err).toBeDefined();
    },
  );

  it.each([DocumentType.PASSPORT, DocumentType.ID_CARD, DocumentType.RESIDENCE_PERMIT])(
    'accepts a valid future expirationDate for %s',
    async (documentType) => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const errors = await validate_({
        ...base,
        documentType,
        expirationDate: futureDate,
      });

      expect(errorsFor(errors, 'expirationDate')).toBeUndefined();
    },
  );
});
