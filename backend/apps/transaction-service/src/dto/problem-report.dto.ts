import { IsString, IsNotEmpty, MaxLength } from 'class-validator'

export class ProblemReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string
}
