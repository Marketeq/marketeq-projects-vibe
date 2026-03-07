import { IsString, IsUrl } from 'class-validator';

export class LinkedInLoginDto {
  @IsString()
  code: string;

  @IsUrl()
  redirectUri: string;
}
