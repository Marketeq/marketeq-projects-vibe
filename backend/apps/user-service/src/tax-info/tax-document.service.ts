import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
// `allowSyntheticDefaultImports` is on but `esModuleInterop` is not, so a
// default import of this CommonJS module type-checks and then fails at runtime
// with "pdfkit_1.default is not a constructor". Require it instead.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFKitDocument = require("pdfkit");
import { TaxInfo } from './tax-info.entity';

/** Copy B, "For Recipient", is page 4 of the IRS 1099-NEC packet. */
const COPY_B_PAGE_INDEX = 3;

/**
 * The payer on every 1099 this platform furnishes. Overridable so the entity
 * details are not baked into the build.
 */
const PAYER = {
  name: process.env.TAX_PAYER_NAME ?? 'Marketeq Digital',
  street: process.env.TAX_PAYER_STREET ?? '',
  city: process.env.TAX_PAYER_CITY ?? '',
  state: process.env.TAX_PAYER_STATE ?? '',
  country: process.env.TAX_PAYER_COUNTRY ?? '',
  postalCode: process.env.TAX_PAYER_POSTAL_CODE ?? '',
  phone: process.env.TAX_PAYER_PHONE ?? '',
  tin: process.env.TAX_PAYER_TIN ?? '',
};

/**
 * The two-character country box, blank for domestic addresses. Anything longer
 * than the box allows is dropped rather than truncated into a wrong code.
 */
const foreignCountryCode = (country?: string | null) => {
  const value = (country ?? '').trim();
  if (!value || /^(usa|us|united states)$/i.test(value)) return '';
  return value.length === 2 ? value.toUpperCase() : '';
};

/**
 * Whether the payer block can be filled in full. A 1099 furnished with a blank
 * payer name, address or TIN is an incomplete tax document, so nothing is
 * issued until these are configured.
 */
export const payerIsConfigured = () =>
  Boolean(
    PAYER.name &&
      PAYER.street &&
      PAYER.city &&
      PAYER.state &&
      PAYER.postalCode &&
      PAYER.tin,
  );

/** A furnished recipient copy shows only the last four digits of the TIN. */
const maskTin = (tin: string) => {
  const digits = (tin ?? '').replace(/\D/g, '');
  return digits.length === 9 ? `XXX-XX-${digits.slice(-4)}` : '';
};

/** Settled volume for one contractor over one tax year, as a 1099-K reports it. */
export type Payment1099KReport = {
  /** Box 1a: gross settled volume, before fees, refunds and chargebacks. */
  grossAmount: string;
  /** Box 3: number of settled payment transactions. */
  transactionCount: number;
  /** Boxes 5a to 5l: January through December, and they must sum to box 1a. */
  monthly: string[];
  /** Box 4: only set when backup withholding was applied. */
  federalTaxWithheld?: string;
};

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
    const doc = new PDFKitDocument({ size: 'LETTER', margin: 56 });
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

  private readonly logger = new Logger(TaxDocumentService.name);

  /** Assets live beside the source and are copied into dist by nest build. */
  private asset(name: string) {
    for (const base of [__dirname, join(process.cwd(), 'apps/user-service/src/tax-info')]) {
      try {
        return readFileSync(join(base, 'assets', name));
      } catch {
        // try the next location
      }
    }
    throw new Error(`Tax form asset not found: ${name}`);
  }

  /**
   * Fills the official IRS Form W-9 with what the contractor certified.
   *
   * Field names come from the form itself (Rev. March 2024). The TIN is written
   * into the split boxes the form uses: 3-2-4 for an SSN, 2-7 for an EIN. The
   * form is flattened afterwards so the returned copy cannot be edited.
   */
  async officialW9(entity: TaxInfo, tin: string) {
    // Part I is the substance of a W-9. A copy with both the SSN and the EIN
    // boxes blank is not a completed form, so none is produced.
    const tinDigits = (tin ?? '').replace(/\D/g, '');
    if (tinDigits.length !== 9) {
      throw new BadRequestException(
        'Please add your taxpayer identification number before downloading your W-9',
      );
    }

    const doc = await PDFDocument.load(this.asset('fw9.pdf'));
    const form = doc.getForm();
    const set = (name: string, value: string) => {
      try {
        form.getTextField(name).setText(value);
      } catch {
        this.logger.warn(`W-9 field missing: ${name}`);
      }
    };
    // The form's own "on" appearance for these boxes renders as a barely
    // visible grey square, so the rectangle is recorded and the mark is drawn
    // onto the page after flattening.
    let checkedBox: { x: number; y: number; width: number } | null = null;
    const check = (name: string) => {
      try {
        const box = form.getCheckBox(name);
        box.check();
        const rect = box.acroField.getWidgets()[0]?.getRectangle();
        if (rect) checkedBox = { x: rect.x, y: rect.y, width: rect.width };
      } catch {
        this.logger.warn(`W-9 checkbox missing: ${name}`);
      }
    };

    const P = 'topmostSubform[0].Page1[0]';
    const B = `${P}.Boxes3a-b_ReadOrder[0]`;

    set(`${P}.f1_01[0]`, entity.legalFullName ?? '');
    set(
      `${P}.Address_ReadOrder[0].f1_07[0]`,
      [entity.addressLine1, entity.addressLine2].filter(Boolean).join(', '),
    );
    set(
      `${P}.Address_ReadOrder[0].f1_08[0]`,
      [entity.city, entity.stateOrProvince, entity.postalCode]
        .filter(Boolean)
        .join(', '),
    );

    // Line 3a: one of seven boxes, in the order printed on the form.
    const classificationBox: Record<string, number> = {
      Individual: 0,
      'Sole Proprietor': 0,
      'C Corporation': 1,
      'S Corporation': 2,
      'Partnership': 3,
      'Trust or Estate': 4,
      'Single-member LLC': 5,
    };
    const box = classificationBox[entity.federalTaxClassification ?? ''];
    if (box !== undefined) check(`${B}.c1_1[${box}]`);

    // Line 4. Optional, and blank for individuals and sole proprietors.
    set(`${P}.f1_05[0]`, entity.exemptPayeeCode ?? '');
    set(`${P}.f1_06[0]`, entity.fatcaExemptionCode ?? '');

    {
      const digits = tinDigits;
      if (entity.tinType === 'EIN') {
        set(`${P}.f1_14[0]`, digits.slice(0, 2));
        set(`${P}.f1_15[0]`, digits.slice(2));
      } else {
        set(`${P}.f1_11[0]`, digits.slice(0, 3));
        set(`${P}.f1_12[0]`, digits.slice(3, 5));
        set(`${P}.f1_13[0]`, digits.slice(5));
      }
    }

    form.flatten();

    const page = doc.getPages()[0];
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    if (checkedBox) {
      const { x, y, width } = checkedBox;
      page.drawText('X', { x: x + width / 2 - 2.6, y: y + 2.5, size: 9, font: bold });
    }

    // Neither the signature line nor the date beside it is a form field, so
    // both are drawn directly onto the "Sign Here" rule in Part II.
    if (entity.signature) {
      const font = await doc.embedFont(StandardFonts.Helvetica);
      page.drawText(entity.signature, { x: 150, y: 205, size: 9, font });
      if (entity.signedDate) {
        page.drawText(entity.signedDate, { x: 400, y: 205, size: 9, font });
      }
    }
    return Buffer.from(await doc.save());
  }

  /**
   * Fills the official IRS Form 1099-NEC, Copy B, with the contractor's details.
   *
   * Only Copy B is produced. Copy A is the red scannable sheet the IRS prints
   * itself, and the IRS warns that a downloaded Copy A must not be filed, so
   * furnishing anything else here would be wrong. Field names are positional on
   * the source form; the mapping below follows the boxes as printed.
   */
  async official1099Nec(
    entity: TaxInfo,
    tin: string,
    taxYear: number,
    amount?: string | null,
  ) {
    const doc = await PDFDocument.load(this.asset('f1099nec.pdf'));
    const form = doc.getForm();

    // Field names are nested under per-section subgroups, and the trailing
    // identifiers repeat across copies (Copy 2 reuses Copy B's `f2_*` names),
    // so the lookup is scoped to Copy B before matching on the identifier.
    const byId = new Map(
      form
        .getFields()
        .filter((f) => f.getName().includes('CopyB[0]'))
        .map((f) => [f.getName().split('.').pop(), f] as const),
    );
    const set = (name: string, value: string) => {
      if (!value) return;
      const field = byId.get(`${name}[0]`);
      if (!field) {
        this.logger.warn(`1099-NEC field missing: ${name}`);
        return;
      }
      (field as ReturnType<typeof form.getTextField>).setText(value);
    };

    set('f2_1', String(taxYear).slice(-2));

    set('f2_2', PAYER.name);
    set('f2_3', PAYER.street);
    set('f2_5', PAYER.city);
    set('f2_6', PAYER.phone);
    set('f2_7', PAYER.state);
    set('f2_8', PAYER.country);
    set('f2_9', PAYER.postalCode);
    set('f2_10', PAYER.tin);

    set('f2_11', maskTin(tin));
    set('f2_12', entity.legalFullName ?? '');
    set('f2_13', entity.addressLine1 ?? '');
    set('f2_14', entity.addressLine2 ?? '');
    set('f2_15', entity.city ?? '');
    set('f2_16', entity.stateOrProvince ?? '');
    // The Country box is for foreign addresses; a domestic one leaves it blank
    // and carries the country in the state/ZIP boxes alone.
    set('f2_17', foreignCountryCode(entity.country));
    set('f2_18', entity.postalCode ?? '');
    set('f2_19', entity.userId);

    // Box 1a. Left blank until tax reporting supplies the year's total, so the
    // copy never states a figure the platform has not actually calculated.
    if (amount) set('f2_20', amount);

    form.flatten();

    // Only the recipient's copy is furnished; the rest of the packet is the
    // IRS's own and the payer's.
    for (let i = doc.getPageCount() - 1; i >= 0; i -= 1) {
      if (i !== COPY_B_PAGE_INDEX) doc.removePage(i);
    }

    return Buffer.from(await doc.save());
  }

  /**
   * Fills the official IRS Form 1099-K, Copy B, for the payee.
   *
   * This platform settles payments from many clients to one contractor across
   * several rails, which makes it a third party settlement organization under
   * IRC 6050W. That is why the 1099-K is the form issued here and not a
   * 1099-NEC: payments settled through a third party network are excluded from
   * 1099-NEC reporting so the same money is not reported twice.
   *
   * Box 1a is gross settled volume, before platform fees, refunds and
   * chargebacks, and the monthly boxes must sum to it.
   */
  async official1099K(
    entity: TaxInfo,
    tin: string,
    taxYear: number,
    report: Payment1099KReport,
  ) {
    if (!report?.grossAmount || !report.transactionCount) {
      throw new BadRequestException(
        'Please provide the settled volume before issuing a 1099-K',
      );
    }
    if (report.monthly.length !== 12) {
      throw new BadRequestException(
        'A 1099-K needs a figure for each of the twelve months',
      );
    }

    const doc = await PDFDocument.load(this.asset('f1099k.pdf'));
    const form = doc.getForm();
    const byId = new Map(
      form
        .getFields()
        .filter((f) => f.getName().includes('CopyB[0]'))
        .map((f) => [f.getName().split('.').pop(), f] as const),
    );
    const set = (name: string, value: string) => {
      if (!value) return;
      const field = byId.get(`${name}[0]`);
      if (!field) {
        this.logger.warn(`1099-K field missing: ${name}`);
        return;
      }
      (field as ReturnType<typeof form.getTextField>).setText(value);
    };
    // As on the W-9, the form's own "on" appearance renders as a faint grey
    // square, so the boxes are marked onto the page after flattening.
    const checkedBoxes: { x: number; y: number; width: number }[] = [];
    const check = (name: string) => {
      const field = byId.get(`${name}[0]`);
      if (!field) {
        this.logger.warn(`1099-K checkbox missing: ${name}`);
        return;
      }
      (field as ReturnType<typeof form.getCheckBox>).check();
      const rect = field.acroField.getWidgets()[0]?.getRectangle();
      if (rect) {
        checkedBoxes.push({ x: rect.x, y: rect.y, width: rect.width });
      }
    };

    set('f2_1', String(taxYear).slice(-2));

    // Filer: this platform.
    set('f2_2', PAYER.name);
    set('f2_3', PAYER.street);
    set('f2_5', PAYER.city);
    set('f2_6', PAYER.phone);
    set('f2_7', PAYER.state);
    set('f2_8', PAYER.country);
    set('f2_9', PAYER.postalCode);
    set('f2_10', PAYER.tin);

    // A settlement organisation for a third party network, which is what this
    // platform is: it is the PSE, and the transactions are network, not card.
    check('c2_2');
    check('c2_5');

    // Payee: the contractor.
    set('f2_11', maskTin(tin));
    set('f2_12', entity.legalFullName ?? '');
    set('f2_13', entity.addressLine1 ?? '');
    set('f2_14', entity.addressLine2 ?? '');
    set('f2_15', entity.city ?? '');
    set('f2_16', entity.stateOrProvince ?? '');
    set('f2_17', foreignCountryCode(entity.country));
    set('f2_18', entity.postalCode ?? '');
    set('f2_19', [PAYER.name, PAYER.phone].filter(Boolean).join(' '));
    set('f2_20', entity.userId);

    set('f2_21', report.grossAmount);
    set('f2_27', String(report.transactionCount));
    if (report.federalTaxWithheld) set('f2_28', report.federalTaxWithheld);

    // Boxes 5a to 5l run January to December, left column then right.
    report.monthly.forEach((amount, i) => set(`f2_${29 + i}`, amount));

    form.flatten();

    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const page = doc.getPages()[COPY_B_PAGE_INDEX];
    for (const { x, y, width } of checkedBoxes) {
      page.drawText('X', {
        x: x + width / 2 - 2.6,
        y: y + 2.5,
        size: 9,
        font: bold,
      });
    }

    for (let i = doc.getPageCount() - 1; i >= 0; i -= 1) {
      if (i !== COPY_B_PAGE_INDEX) doc.removePage(i);
    }
    return Buffer.from(await doc.save());
  }

  /**
   * Renders the first page of a generated form as a PNG, so the document card
   * shows the contractor's own filled-in copy rather than a generic icon.
   */
  async thumbnail(pdf: Buffer) {
    // Required lazily: the renderer pulls in a canvas backend that is only
    // needed when a preview is actually requested.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: pdf });
    try {
      const shot = await parser.getScreenshot({ scale: 1.5, pages: [1] });
      const dataUrl = shot.pages?.[0]?.dataUrl ?? '';
      const base64 = dataUrl.split(',')[1];
      if (!base64) throw new Error('Preview render produced no image');
      return Buffer.from(base64, 'base64');
    } finally {
      await parser.destroy();
    }
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
