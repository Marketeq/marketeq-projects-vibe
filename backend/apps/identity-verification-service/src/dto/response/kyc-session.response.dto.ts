// The minimum the browser needs to redirect: a validated https Didit URL.
// No session id, no reference, no status.
export class KycSessionResponseDto {
  url!: string;
}
