export class VerifyResponseDto {
  payoutRequestId: string;
  status:          string;
  message?:        string;
  replayed?:       boolean;
}
