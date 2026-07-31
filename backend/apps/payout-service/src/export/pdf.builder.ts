import { PayoutExportRow } from './csv.builder';

export interface PayoutPdfBuildOptions {
  rows: PayoutExportRow[];
  contractorName?: string;
  exportedAt: Date;
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

export async function buildPayoutPdf(opts: PayoutPdfBuildOptions): Promise<Buffer> {
  try {
    const PDFDocument = require('pdfkit');
    return buildPdfWithPdfkit(PDFDocument, opts);
  } catch {
    // Fallback: generate CSV if pdfkit isn't available, same as earnings-service.
    const { buildPayoutCsv } = require('./csv.builder');
    return buildPayoutCsv({ ...opts });
  }
}

function buildPdfWithPdfkit(PDFDocument: any, opts: PayoutPdfBuildOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const { rows } = opts;

    doc.fontSize(16).font('Helvetica-Bold').text('Marketeq Payouts Export', 36, 36);
    doc.fontSize(9).font('Helvetica')
      .text(`Contractor: ${opts.contractorName ?? 'N/A'}   Generated: ${opts.exportedAt.toISOString().slice(0, 10)} UTC`, 36, 58);
    doc.fontSize(8).fillColor('#999999').text('All dates and times are in UTC.', 36, 70);

    const colW = [70, 90, 100, 90, 70, 80, 80, 80];
    const colHeaders = ['Amount (USD)', 'External Account', 'Method Type', 'Status', 'Trigger', 'Initiated On', 'Est. Arrival', 'Settled On'];
    let y = 90;
    doc.rect(36, y, colW.reduce((a, b) => a + b, 0), 18).fill('#1B3A6B');
    doc.fontSize(7.5).fillColor('#FFFFFF').font('Helvetica-Bold');
    let x = 36;
    for (let i = 0; i < colHeaders.length; i++) {
      doc.text(colHeaders[i], x + 3, y + 5, { width: colW[i] - 4, lineBreak: false });
      x += colW[i];
    }
    y += 18;

    let amountTotal = 0;
    rows.forEach((row, ri) => {
      if (y > doc.page.height - 60) { doc.addPage(); y = 36; }
      const failed = row.status === 'failed' || row.status === 'cancelled';
      const bg = ri % 2 === 0 ? '#FFFFFF' : '#F7F8FA';
      const rowW = colW.reduce((a, b) => a + b, 0);
      doc.rect(36, y, rowW, 14).fill(bg);

      if (row.status === 'completed') amountTotal += parseFloat(row.amountUsd);

      const cells = [
        `$${row.amountUsd}`,
        row.methodLabel ?? '—',
        row.methodType ?? '—',
        STATUS_LABELS[row.status] ?? row.status,
        row.trigger === 'scheduled' ? 'Scheduled' : 'Manual',
        row.createdAt.slice(0, 10),
        row.settledAt ? '—' : (row.estimatedArrivalAt ? row.estimatedArrivalAt.slice(0, 10) : '—'),
        row.settledAt ? row.settledAt.slice(0, 10) : '—',
      ];

      doc.fontSize(7.5).fillColor(failed ? '#999999' : '#333333').font('Helvetica');
      x = 36;
      for (let i = 0; i < cells.length; i++) {
        doc.text(cells[i], x + 3, y + 3, { width: colW[i] - 4, lineBreak: false });
        x += colW[i];
      }
      y += 14;
    });

    y += 4;
    const rowW = colW.reduce((a, b) => a + b, 0);
    doc.rect(36, y, rowW, 16).fill('#EBF4FA');
    doc.fontSize(7.5).fillColor('#1B3A6B').font('Helvetica-Bold');
    doc.text('TOTAL (Completed)', 36 + 3, y + 4, { width: colW[0] + colW[1] - 4, lineBreak: false });
    doc.text(`$${amountTotal.toFixed(2)}`, 36 + colW[0] + colW[1] + 3, y + 4, { width: colW[2] - 4, lineBreak: false });

    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).fillColor('#999999').font('Helvetica')
        .text(`Page ${i + 1} of ${pageCount}  |  All dates and times are in UTC.  |  Full data available in CSV export.`,
          36, doc.page.height - 24, { width: 750, align: 'center' });
    }
    doc.end();
  });
}
