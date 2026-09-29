import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { IdentityVerificationController } from './identity-verification.controller';
import { IdentityVerificationService } from '../services/identity-verification.service';
import { CatalogDocumentCoverageProvider } from '../providers/document-coverage/catalog-document-coverage.provider';
import { AcceptedDocumentsRequestDto } from '../dto/request/accepted-documents.request.dto';
import { DocumentType } from '../entities/enums/identity-verification.enums';
import { DocumentCoverageUnavailableException } from '../common/errors/domain-exceptions';

// Exercises the controller against the real catalog-backed provider through
// the real service methods the route uses, so the response shape and the
// per-country answers are what a client actually receives.
describe('IdentityVerificationController GET accepted-documents', () => {
  const buildController = (provider = new CatalogDocumentCoverageProvider()) => {
    const service = Object.create(IdentityVerificationService.prototype) as IdentityVerificationService;
    (service as any).documentCoverageProvider = provider;
    return new IdentityVerificationController(service as any, {} as any);
  };
  const query = (issuingCountry: string) => plainToInstance(AcceptedDocumentsRequestDto, { issuingCountry });

  it.each(['US', 'IN', 'GB'])('returns all four canonical types plus version metadata for %s', async (country) => {
    const response = await buildController().getAcceptedDocuments(query(country));

    expect(response.issuingCountry).toBe(country);
    expect([...response.acceptedDocumentTypes].sort()).toEqual(Object.values(DocumentType).sort());
    expect(response.catalogVersion).toBe('2026-09-29.1');
    expect(response.catalogRetrievedAt).toBe('2026-09-29');
  });

  it('returns only the country\'s own documents for Afghanistan and Aruba', async () => {
    const controller = buildController();

    await expect(controller.getAcceptedDocuments(query('AF'))).resolves.toMatchObject({
      acceptedDocumentTypes: [DocumentType.ID_CARD, DocumentType.PASSPORT, DocumentType.DRIVERS_LICENCE],
    });
    await expect(controller.getAcceptedDocuments(query('AW'))).resolves.toMatchObject({
      acceptedDocumentTypes: [DocumentType.ID_CARD, DocumentType.DRIVERS_LICENCE, DocumentType.RESIDENCE_PERMIT],
    });
  });

  it('keeps the existing acceptedDocumentTypes and issuingCountry fields the frontend validates', async () => {
    const response = await buildController().getAcceptedDocuments(query('US'));

    expect(typeof response.issuingCountry).toBe('string');
    expect(Array.isArray(response.acceptedDocumentTypes)).toBe(true);
    expect(response.acceptedDocumentTypes.every((t) => typeof t === 'string')).toBe(true);
  });

  it('propagates DocumentCoverageUnavailableException (503) when the catalog is unusable', async () => {
    const broken = new CatalogDocumentCoverageProvider({
      catalogVersion: 'x',
      sourceUrl: 'x',
      sourceRenditionUrl: 'x',
      retrievedAt: '2026-09-29',
      sourceSha256: 'x',
      contentSha256: 'not-the-hash',
      countries: [],
    });

    await expect(buildController(broken).getAcceptedDocuments(query('US'))).rejects.toBeInstanceOf(
      DocumentCoverageUnavailableException,
    );
  });

  it('still validates issuingCountry as a 2-letter uppercase alpha-2 code', async () => {
    const errors = async (value: string) => validate(query(value));

    expect(await errors('US')).toHaveLength(0);
    expect(await errors('USA')).not.toHaveLength(0);
    expect(await errors('us')).not.toHaveLength(0);
  });
});
