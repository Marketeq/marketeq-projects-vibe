import {
  DocumentCoverageMetadata,
  SupportedDocumentCountry,
} from '../../providers/document-coverage/document-coverage-provider.interface';

export class SupportedDocumentCountriesResponseDto {
  catalogVersion!: string;
  countries!: SupportedDocumentCountry[];

  static from(
    countries: SupportedDocumentCountry[],
    metadata: DocumentCoverageMetadata,
  ): SupportedDocumentCountriesResponseDto {
    const dto = new SupportedDocumentCountriesResponseDto();
    dto.catalogVersion = metadata.catalogVersion;
    dto.countries = countries.map(({ alpha2, alpha3, name }) => ({ alpha2, alpha3, name }));
    return dto;
  }
}
