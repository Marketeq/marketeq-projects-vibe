import { IsEnum } from 'class-validator';
import { TravelClassification } from '../../entities/enums/identity-verification.enums';

export class TravelClassificationRequestDto {
  @IsEnum(TravelClassification, {
    message: 'classification must be one of: temporarily_traveling, permanently_relocated',
  })
  classification: TravelClassification;
}
