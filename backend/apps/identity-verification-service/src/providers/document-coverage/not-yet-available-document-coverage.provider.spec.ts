import { NotYetAvailableDocumentCoverageProvider } from './not-yet-available-document-coverage.provider';
import { DocumentCoverageUnavailableException } from '../../common/errors/domain-exceptions';

describe('NotYetAvailableDocumentCoverageProvider', () => {
  it('always throws DocumentCoverageUnavailableException rather than returning a fabricated list', async () => {
    const provider = new NotYetAvailableDocumentCoverageProvider();

    await expect(provider.getAcceptedDocumentTypes('US')).rejects.toBeInstanceOf(
      DocumentCoverageUnavailableException,
    );
  });

  it('never resolves successfully for any country input', async () => {
    const provider = new NotYetAvailableDocumentCoverageProvider();

    await expect(provider.getAcceptedDocumentTypes('')).rejects.toMatchObject({
      code: 'DOCUMENT_COVERAGE_UNAVAILABLE',
    });
  });
});
