// src/earnings/dto/earnings-list.dto.ts
// Response DTO for GET /v1/earnings (paginated earnings history)
// The actual response is built inline in EarningsService.getEarnings().
// This DTO documents the response shape for type reference.

export class EarningsListItemDto {
  id:              string;
  date:            string | null;
  weekRange:       string | null;
  month:           string | null;
  project:         { id: string | null; name: string | null; clientHandle: string | null } | null;
  task:            { id: string | null; name: string | null } | null;
  startTime:       string | null;
  endTime:         string | null;
  durationMinutes: number;
  durationLabel:   string;
  grossAmount:     string;
  feeAmount:       string;
  netAmount:       string;
  netAmountDisplay:string;
  displayCurrency: string;
  entryType:       string;
  status:          string;
  avgKeyboardPct:  number | null;
  avgMousePct:     number | null;
  weeklyHours:     string | null;
  weeklyEarnings:  string | null;
  budget:          string | null;
  totalHours:      string | null;
  totalEarnings:   string | null;
}

export class EarningsListResponseDto {
  view:              string;
  page:              number;
  limit:             number;
  total:             number;
  totalPages:        number;
  columns:           string[];
  manualTimeMinutes: number;
  manualTimeLabel:   string;
  data:              EarningsListItemDto[];
  appliedFilters:    {
    view: string; dateRange: string;
    startDate: string | null; endDate: string | null;
    projectId: string | null; clientId: string | null;
    entryType: string | null; status: string | null;
    search: string | null;
  };
}
