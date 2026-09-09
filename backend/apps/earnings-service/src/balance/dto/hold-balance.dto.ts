import { IsNumberString } from 'class-validator';

// amountUsd is a numeric(18,8) string (matches payout_requests.amount_usd's
// serialization), not a JS number — @IsNumberString() validates the format;
// positivity is checked separately in BalanceService.holdForPayout since
// class-validator has no string-aware @IsPositive().
export class HoldBalanceDto {
  @IsNumberString() amountUsd: string;
}
