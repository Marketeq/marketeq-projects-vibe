import { IsString } from "class-validator";

export class RegisterDeviceDto {
  @IsString() id!: string;
  @IsString() installationUuid!: string;
  @IsString() osName!: string;
  @IsString() osVersion!: string;
  @IsString() appVersion!: string;
  @IsString() arch!: string;
}
 