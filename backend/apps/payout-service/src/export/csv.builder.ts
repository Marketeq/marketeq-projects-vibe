const CRLF = '\r\n';

function esc(v: string | number | null | undefined): string {
  const s = v == null ? '—' : String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r'))
    return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

const STATUS_LABELS: Record<string, string> = {
  pending_verification: 'Awaiting Confirmation',
  awaiting_edd: 'Awaiting Confirmation',
  queued: 'Processing',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

// Shape matches PayoutService.toHistoryItem()'s return value — the export
// reuses the exact same row transformation the Payouts table renders from,
// so the file can never drift from what the contractor sees on screen.
export interface PayoutExportRow {
  id: string;
  amountUsd: string;
  feeUsd: string;
  netAmountUsd: string;
  status: string;
  trigger: string;
  failureReason: string | null;
  methodType: string | null;
  methodLabel: string | null;
  createdAt: string;
  settledAt: string | null;
  estimatedArrivalAt: string | null;
}

export interface PayoutCsvBuildOptions {
  rows: PayoutExportRow[];
  exportedAt: Date;
  contractorName?: string;
}

export function buildPayoutCsv(opts: PayoutCsvBuildOptions): Buffer {
  const { rows } = opts;

  const headers = [
    'Amount (USD)', 'Fee (USD)', 'Net Amount (USD)', 'External Account', 'Method Type',
    'Status', 'Trigger', 'Initiated On', 'Est. Arrival', 'Settled On', 'Failure Reason',
    'Payout ID',
  ];

  const lines: string[] = [];
  lines.push(`# Marketeq Payouts Export — ${opts.contractorName ?? 'Contractor'}`);
  lines.push(`# Generated: ${opts.exportedAt.toISOString()} UTC — All dates and times are in UTC.`);
  lines.push('');
  lines.push(headers.map(esc).join(','));

  for (const row of rows) {
    lines.push([
      row.amountUsd, row.feeUsd, row.netAmountUsd,
      row.methodLabel ?? '—', row.methodType ?? '—',
      STATUS_LABELS[row.status] ?? row.status,
      row.trigger === 'scheduled' ? 'Scheduled' : 'Manual',
      row.createdAt,
      row.settledAt ? '—' : (row.estimatedArrivalAt ?? '—'),
      row.settledAt ?? '—',
      row.failureReason ?? '—',
      row.id,
    ].map(esc).join(','));
  }
  return Buffer.from(lines.join(CRLF) + CRLF, 'utf8');
}
