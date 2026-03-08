import { IsString, IsNumber, Min, Max, IsNotEmpty } from 'class-validator';

export class GenerateUploadDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsNumber()
  @Min(1)
  @Max(100 * 1024 * 1024) // 100MB hard cap at DTO level; service enforces env-configured limit
  fileSize: number;
}

export class DeleteFileDto {
  @IsString()
  @IsNotEmpty()
  key: string;
}
