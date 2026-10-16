import { IsString, Length, Matches } from 'class-validator';

export class AcceptedDocumentsRequestDto {
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, { message: 'issuingCountry must be a 2-letter uppercase ISO country code' })
  issuingCountry!: string;
}
