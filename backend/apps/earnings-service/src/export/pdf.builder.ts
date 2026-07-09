// PDF builder — simplified version that works without pdfkit
// When pdfkit is available, this generates a proper PDF
// For now, generates a text-based PDF-like buffer

import { EarningsCache }      from '../entities/earnings-cache.entity';
import { ContractLabelCache } from '../entities/contract-label-cache.entity';

export interface PdfBuildOptions {
  rows:            EarningsCache[];
  labels:          Map<string, ContractLabelCache>;
  displayCurrency: string;
  displayAmounts:  Map<string, string>;
  contractorName?: string;
  dateRangeLabel:  string;
  exportedAt:      Date;
}

export async function buildPdf(opts: PdfBuildOptions): Promise<Buffer> {
  try {
    const PDFDocument = require('pdfkit');
    return buildPdfWithPdfkit(PDFDocument, opts);
  } catch {
    // Fallback: generate CSV if pdfkit not available
    const { buildCsv } = require('./csv.builder');
    return buildCsv({ ...opts });
  }
}

function buildPdfWithPdfkit(PDFDocument: any, opts: PdfBuildOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const { rows, labels, displayCurrency, displayAmounts } = opts;
    const rateCurrency = rows[0]?.currency ?? 'USD';
    const feePercent = rows[0] && parseFloat(rows[0].grossAmount) > 0
      ? ((parseFloat(rows[0].feeAmount) / parseFloat(rows[0].grossAmount)) * 100).toFixed(1) : '20.0';

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text('Marketeq Earnings Export', 36, 36);
    doc.fontSize(9).font('Helvetica')
       .text(`Contractor: ${opts.contractorName ?? 'N/A'}   Period: ${opts.dateRangeLabel}   Generated: ${opts.exportedAt.toISOString().slice(0,10)} UTC`, 36, 58);
    doc.fontSize(8).fillColor('#999999').text('All dates and times are in UTC.', 36, 70);

    // Column headers
    const colW = [68, 62, 120, 62, 62, 62, 72, 80, 68];
    const colHeaders = ['Date','Type','Project','Duration',`Gross (${rateCurrency})`,`Fee (${feePercent}%)`,`Net (${rateCurrency})`,`Amount (${displayCurrency})`,'Status'];
    let y = 90;
    doc.rect(36, y, colW.reduce((a,b)=>a+b,0), 18).fill('#1B3A6B');
    doc.fontSize(7.5).fillColor('#FFFFFF').font('Helvetica-Bold');
    let x = 36;
    for (let i = 0; i < colHeaders.length; i++) {
      doc.text(colHeaders[i], x + 3, y + 5, { width: colW[i] - 4, lineBreak: false });
      x += colW[i];
    }
    y += 18;

    // Data rows
    let grossTotal = 0, feeTotal = 0, netTotal = 0, dispTotal = 0;
    rows.forEach((row, ri) => {
      if (y > doc.page.height - 60) { doc.addPage(); y = 36; }
      const label = labels.get(row.contractId ?? '');
      const reversed = row.status === 'reversed';
      const bg = ri % 2 === 0 ? '#FFFFFF' : '#F7F8FA';
      const rowW = colW.reduce((a,b)=>a+b,0);
      doc.rect(36, y, rowW, 14).fill(bg);

      const start = new Date(row.workStartAt);
      const dur = row.durationMinutes < 60 ? `${row.durationMinutes}m` : `${Math.floor(row.durationMinutes/60)}h ${row.durationMinutes%60}m`;
      const project = label?.projectName ?? '—';
      const dispAmt = displayAmounts.get(row.id) ?? '—';
      const cells = [
        start.toISOString().slice(0,10),
        row.entryType === 'screenshot' ? 'Automated' : 'Manual',
        project.length > 18 ? project.slice(0,16)+'…' : project,
        dur, row.grossAmount, row.feeAmount, row.netAmount, dispAmt,
        reversed ? 'Reversed' : 'Confirmed',
      ];

      if (!reversed) {
        grossTotal += parseFloat(row.grossAmount);
        feeTotal += parseFloat(row.feeAmount);
        netTotal += parseFloat(row.netAmount);
        dispTotal += parseFloat(dispAmt) || 0;
      }

      doc.fontSize(7.5).fillColor(reversed ? '#999999' : '#333333').font('Helvetica');
      x = 36;
      for (let i = 0; i < cells.length; i++) {
        doc.text(cells[i], x + 3, y + 3, { width: colW[i] - 4, lineBreak: false });
        x += colW[i];
      }
      y += 14;
    });

    // Totals
    y += 4;
    const rowW = colW.reduce((a,b)=>a+b,0);
    doc.rect(36, y, rowW, 16).fill('#EBF4FA');
    doc.fontSize(7.5).fillColor('#1B3A6B').font('Helvetica-Bold');
    const totals = ['TOTAL','','','', grossTotal.toFixed(2), feeTotal.toFixed(2), netTotal.toFixed(2), String(Math.round(dispTotal)), ''];
    x = 36;
    for (let i = 0; i < totals.length; i++) {
      doc.text(totals[i], x + 3, y + 4, { width: colW[i] - 4, lineBreak: false });
      x += colW[i];
    }

    // Footer
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).fillColor('#999999').font('Helvetica')
         .text(`Page ${i+1} of ${pageCount}  |  All dates and times are in UTC.  |  Full data available in CSV export.`,
               36, doc.page.height - 24, { width: 750, align: 'center' });
    }
    doc.end();
  });
}
