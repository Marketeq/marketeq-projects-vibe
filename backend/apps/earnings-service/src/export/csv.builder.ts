import { EarningsCache }      from '../entities/earnings-cache.entity';
import { ContractLabelCache } from '../entities/contract-label-cache.entity';

const CRLF = '\r\n';

function esc(v: string | number | null | undefined): string {
  const s = v == null ? '—' : String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r'))
    return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export interface CsvBuildOptions {
  rows:            EarningsCache[];
  labels:          Map<string, ContractLabelCache>;
  displayCurrency: string;
  displayAmounts:  Map<string, string>;
  contractorName?: string;
  exportedAt:      Date;
}

export function buildCsv(opts: CsvBuildOptions): Buffer {
  const { rows, labels, displayCurrency, displayAmounts } = opts;
  const firstRow = rows[0];
  const rateCurrency = firstRow?.currency ?? 'USD';
  const feePercent = firstRow && parseFloat(firstRow.grossAmount) > 0
    ? ((parseFloat(firstRow.feeAmount) / parseFloat(firstRow.grossAmount)) * 100).toFixed(1) : '20.0';

  const headers = [
    'Date', 'Day', 'Project', 'Client', 'Contract', 'Task', 'Type',
    'Start Time', 'End Time', 'Duration', 'Keyboard %', 'Mouse %',
    `Gross (${rateCurrency})`, `Fee (${rateCurrency}, ${feePercent}%)`, `Net (${rateCurrency})`,
    'FX Rate (to USD)', 'Net (USD)', 'Display Amount', 'Display Currency',
    'Status', 'Entry ID',
  ];

  const lines: string[] = [];
  lines.push(`# Marketeq Earnings Export — ${opts.contractorName ?? 'Contractor'}`);
  lines.push(`# Generated: ${opts.exportedAt.toISOString()} UTC — All dates and times are in UTC.`);
  lines.push('');
  lines.push(headers.map(esc).join(','));

  for (const row of rows) {
    const label = labels.get(row.contractId ?? '');
    const start = new Date(row.workStartAt);
    const end   = new Date(row.workEndAt);
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    lines.push([
      start.toISOString().slice(0, 10),
      days[start.getUTCDay()],
      label?.projectName ?? '—', label?.clientDisplayName ?? '—',
      label?.contractTitle ?? '—', '—',
      row.entryType === 'screenshot' ? 'Automated' : 'Manual',
      start.toISOString().slice(11, 16), end.toISOString().slice(11, 16),
      fmtDuration(row.durationMinutes),
      row.avgKeyboardPct != null ? `${row.avgKeyboardPct}%` : '—',
      row.avgMousePct != null ? `${row.avgMousePct}%` : '—',
      row.grossAmount, row.feeAmount, row.netAmount,
      row.fxRateToUsd, row.netAmountUsd,
      displayAmounts.get(row.id) ?? '—', displayCurrency,
      row.status === 'confirmed' ? 'Confirmed' : 'Reversed', row.id,
    ].map(esc).join(','));
  }
  return Buffer.from(lines.join(CRLF) + CRLF, 'utf8');
}
