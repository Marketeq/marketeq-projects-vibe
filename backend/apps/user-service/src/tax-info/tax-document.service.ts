import { Injectable } from '@nestjs/common';
// `allowSyntheticDefaultImports` is on but `esModuleInterop` is not, so a
// default import of this CommonJS module type-checks and then fails at runtime
// with "pdfkit_1.default is not a constructor". Require it instead.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');
import { TaxInfo } from './tax-info.entity';

const NAVY = '#22376B';
const GREY = '#667085';

/**
 * Renders the documents this platform can genuinely produce.
 *
 * The certification is a substitute W-9 / W-8BEN built from exactly what the
 * user certified, so it exists the moment they submit. The 1099 is a report of
 * what was actually paid, so it renders whatever figures tax reporting supplies
 * and says so plainly when there are none yet, rather than inventing amounts.
 */
@Injectable()
export class TaxDocumentService {
  private start(title: string) {
    const doc = new PDFDocument({ size: 'LETTER', margin: 56 });
    doc.fontSize(18).fillColor(NAVY).text(title);
    doc.moveDown(0.3);
    doc
      .fontSize(9)
      .fillColor(GREY)
      .text(`Marketeq Digital · generated ${new Date().toLocaleDateString('en-US')}`);
    doc.moveDown(1.2);
    return doc;
  }

  private row(doc: PDFKit.PDFDocument, label: string, value: string) {
    doc.fontSize(9).fillColor(GREY).text(label);
    doc.fontSize(11).fillColor(NAVY).text(value || '—');
    doc.moveDown(0.6);
  }

  certification(entity: TaxInfo, tinLast4: string | null) {
    const kind = entity.country === 'United States' ? 'W-9' : 'W-8BEN';
    const doc = this.start(`Substitute Form ${kind}`);

    this.row(doc, 'Full legal name', entity.legalFullName ?? '');
    this.row(doc, 'Federal tax classification', entity.federalTaxClassification ?? '');
    this.row(
      doc,
      `${entity.tinType ?? 'TIN'} (last four digits)`,
      tinLast4 ? `•••••${tinLast4}` : '—',
    );
    this.row(
      doc,
      'Residence',
      [
        entity.addressLine1,
        entity.addressLine2,
        entity.city,
        entity.stateOrProvince,
        entity.postalCode,
        entity.country,
      ]
        .filter(Boolean)
        .join(', '),
    );

    doc.moveDown(0.6);
    doc.fontSize(11).fillColor(NAVY).text('Certification');
    doc.moveDown(0.3);
    doc
      .fontSize(9)
      .fillColor(GREY)
      .text(
        kind === 'W-9'
          ? 'Under penalties of perjury, the signer certified that the taxpayer identification number shown is correct, that they are not subject to backup withholding, that they are a U.S. person, and that any FATCA code entered is correct.'
          : 'The signer certified that they are not a U.S. person, that the income to which this form relates is not effectively connected with a U.S. trade or business, and that the details given are correct.',
        { align: 'left' },
      );

    doc.moveDown(0.8);
    this.row(doc, 'Signed by', entity.signature ?? '');
    this.row(doc, 'Date signed', entity.signedDate ?? '');
    this.row(
      doc,
      'Submitted',
      entity.submittedAt ? new Date(entity.submittedAt).toUTCString() : 'Not submitted',
    );
    this.row(
      doc,
      'Electronic consent',
      entity.consentESignature && entity.consentDigitalDelivery
        ? 'Consented to electronic signature and electronic delivery'
        : 'Not consented',
    );

    doc.end();
    return doc;
  }

  form1099(entity: TaxInfo, taxYear: number, tinLast4: string | null) {
    const doc = this.start(`Form 1099-NEC · ${taxYear}`);

    this.row(doc, 'Payer', 'Marketeq Digital');
    this.row(doc, 'Recipient', entity.legalFullName ?? '');
    this.row(
      doc,
      `${entity.tinType ?? 'TIN'} (last four digits)`,
      tinLast4 ? `•••••${tinLast4}` : '—',
    );
    this.row(doc, 'Tax year', String(taxYear));

    doc.moveDown(0.4);
    doc
      .fontSize(9)
      .fillColor(GREY)
      .text(
        'Nonemployee compensation for this year has not been finalised yet. ' +
          'This form will show the reported total once year-end tax reporting closes.',
      );

    doc.end();
    return doc;
  }
}
