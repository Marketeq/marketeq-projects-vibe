export class EarningsDetailDto {
  id:              string;
  transactionId:   string;
  contractorId:    string;
  contractId:      string | null;
  projectId:       string | null;
  taskId:          string | null;
  entryType:       string;
  status:          string;
  grossAmount:     string;
  feeAmount:       string;
  netAmount:       string;
  netAmountDisplay:string;
  currency:        string;
  displayCurrency: string;
  fxRateToUsd:     string;
  netAmountUsd:    string;
  workStartAt:     string;
  workEndAt:       string;
  durationMinutes: number;
  durationLabel:   string;
  avgKeyboardPct:  number | null;
  avgMousePct:     number | null;
  idempotencyKey:  string;
  createdAt:       string;
  reversedAt:      string | null;
  contract:        { id:string; title:string|null; status:string } | null;
  project:         { id:string|null; name:string|null; clientHandle:string|null; clientName:string|null } | null;
}
