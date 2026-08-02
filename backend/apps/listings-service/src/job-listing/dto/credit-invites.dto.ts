import { IsIn, IsInt, IsString, Min } from "class-validator";

export class CreditInvitesDto {
  @IsInt()
  @Min(1)
  @IsIn([50, 100, 500, 1000])
  inviteCount: number;

  @IsString()
  checkoutSessionId: string;
}
