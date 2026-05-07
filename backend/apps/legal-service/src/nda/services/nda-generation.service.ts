import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as PDFDocument from 'pdfkit';

import { NdaDocument } from '../entities/nda-document.entity';
import { NdaSettings } from '../entities/nda-settings.entity';
import { createR2Client } from '../../config/r2.config';
import { PDF_CONFIG } from '../../config/pdf.config';
import { NDA_CLAUSES } from '../templates/nda.template';

interface BuildPdfOptions {
  clientDisplayName: string;
  listingTitle: string | null;
  requireNdaToViewScope: boolean;
  templateVersion: string;
  signed: boolean;
  // Signed-only fields
  typedName?: string;
  signedAtUtc?: Date;
  signingEventId?: string;
  signerUserId?: string;
  ipAddress?: string;
  deviceType?: string;
}

/**
 * Handles NDA PDF generation (pdfkit) and Cloudflare R2 storage.
 *
 * Two PDFs per NDA workflow:
 *  - Unsigned: generated on NDA creation, stored as preview/base document
 *  - Signed:   generated on signing, includes typed name, UTC timestamp, and audit footer
 *
 * All PDFs are private. Presigned GET URLs are generated fresh on every request.
 */
@Injectable()
export class NdaGenerationService {
  private readonly logger = new Logger(NdaGenerationService.name);
  private readonly r2: S3Client;

  constructor(private readonly config: ConfigService) {
    this.r2 = createR2Client(config);
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Build the unsigned NDA PDF and write it to R2.
   * R2 key: nda/unsigned/{documentId}/{uuid}.pdf
   * Returns the R2 key.
   */
  async generateUnsignedNda(
    ndaDocument: NdaDocument,
    settings: NdaSettings,
  ): Promise<string> {
    const buffer = await this.buildPdf({
      clientDisplayName: ndaDocument.clientDisplayName,
      listingTitle: ndaDocument.listingTitle,
      requireNdaToViewScope: settings.requireNdaToViewScope,
      templateVersion: ndaDocument.templateVersion,
      signed: false,
    });

    const key = `nda/unsigned/${ndaDocument.id}/${uuidv4()}.pdf`;
    await this.writePdfToR2(key, buffer);
    this.logger.log(
      `NDA unsigned PDF written: documentId=${ndaDocument.id} r2Key=[REDACTED]`,
    );
    return key;
  }

  /**
   * Build the signed NDA PDF (adds typed name, UTC timestamp, audit footer)
   * and write it to R2.
   * R2 key: nda/signed/{documentId}/{signingEventId}.pdf
   * Returns the R2 key.
   */
  async generateSignedNda(
    ndaDocument: NdaDocument,
    settings: NdaSettings,
    signingEventId: string,
    typedName: string,
    signerUserId: string,
    ipAddress: string,
    deviceType: string,
    signedAtUtc: Date,
  ): Promise<string> {
    const buffer = await this.buildPdf({
      clientDisplayName: ndaDocument.clientDisplayName,
      listingTitle: ndaDocument.listingTitle,
      requireNdaToViewScope: settings.requireNdaToViewScope,
      templateVersion: ndaDocument.templateVersion,
      signed: true,
      typedName,
      signedAtUtc,
      signingEventId,
      signerUserId,
      ipAddress,
      deviceType,
    });

    const key = `nda/signed/${ndaDocument.id}/${signingEventId}.pdf`;
    await this.writePdfToR2(key, buffer);
    this.logger.log(
      `NDA signed PDF written: documentId=${ndaDocument.id} signingEventId=${signingEventId} r2Key=[REDACTED]`,
    );
    return key;
  }

  /**
   * Generate a presigned GET URL for an R2 object.
   * URLs expire after R2_PRESIGN_TTL_SECONDS (default 3600).
   * Never store these URLs — always generate fresh on each request.
   */
  async getPresignedUrl(key: string): Promise<string> {
    const bucket = this.config.get<string>('CLOUDFLARE_R2_BUCKET')!;
    const ttl = Number(this.config.get<string>('R2_PRESIGN_TTL_SECONDS', '3600'));
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(this.r2, command, { expiresIn: ttl });
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private buildPdf(opts: BuildPdfOptions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      const doc = new (PDFDocument as any)({
        size: PDF_CONFIG.pageSize,
        margins: {
          top: PDF_CONFIG.marginTop,
          bottom: PDF_CONFIG.marginBottom,
          left: PDF_CONFIG.marginLeft,
          right: PDF_CONFIG.marginRight,
        },
        info: {
          Title: 'Non-Disclosure Agreement',
          Author: 'Marketeq Platform',
          Subject: opts.listingTitle ?? 'Marketeq NDA',
        },
      }) as PDFKit.PDFDocument;

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── HEADER ───────────────────────────────────────────────────────────
      doc
        .font(PDF_CONFIG.fontFamilyBold)
        .fontSize(PDF_CONFIG.fontSizeTitle)
        .fillColor(`#${PDF_CONFIG.colourPrimary}`)
        .text('NON-DISCLOSURE AGREEMENT', { align: 'center' })
        .moveDown(0.4)
        .font(PDF_CONFIG.fontFamily)
        .fontSize(PDF_CONFIG.fontSizeSmall)
        .fillColor(`#${PDF_CONFIG.colourMuted}`)
        .text(`Template Version: ${opts.templateVersion}`, { align: 'center' })
        .moveDown(1.5);

      // ── PARTIES ──────────────────────────────────────────────────────────
      doc
        .font(PDF_CONFIG.fontFamilyBold)
        .fontSize(PDF_CONFIG.fontSizeHeading)
        .fillColor(`#${PDF_CONFIG.colourBody}`)
        .text('PARTIES')
        .moveDown(0.4)
        .font(PDF_CONFIG.fontFamily)
        .fontSize(PDF_CONFIG.fontSizeBody)
        .text(`Disclosing Party: ${opts.clientDisplayName}`, { lineGap: PDF_CONFIG.lineGap });

      if (opts.listingTitle) {
        doc.text(`Project / Service: ${opts.listingTitle}`, {
          lineGap: PDF_CONFIG.lineGap,
        });
      }

      doc
        .moveDown(0.4)
        .text(
          'Receiving Party: The undersigned talent member registered on the Marketeq platform.',
          { lineGap: PDF_CONFIG.lineGap },
        )
        .moveDown(1.5);

      // ── NDA CLAUSES ──────────────────────────────────────────────────────
      this.renderClauses(doc, opts.requireNdaToViewScope);

      // ── ELECTRONIC SIGNATURE DISCLOSURE ──────────────────────────────────
      doc
        .moveDown(1)
        .font(PDF_CONFIG.fontFamilyBold)
        .fontSize(PDF_CONFIG.fontSizeHeading)
        .fillColor(`#${PDF_CONFIG.colourBody}`)
        .text('ELECTRONIC SIGNATURE DISCLOSURE')
        .moveDown(0.4)
        .font(PDF_CONFIG.fontFamily)
        .fontSize(PDF_CONFIG.fontSizeBody)
        .text(
          'By typing your name below, you agree that your electronic signature is the legal ' +
            'equivalent of your handwritten signature on this Agreement. You consent to be ' +
            'legally bound by this Agreement\'s terms and conditions. You further consent to ' +
            'the use of electronic records and signatures in connection with this Agreement, ' +
            'as permitted by the Electronic Signatures in Global and National Commerce Act ' +
            '(15 U.S.C. § 7001 et seq.) and the Uniform Electronic Transactions Act.',
          { lineGap: PDF_CONFIG.lineGap },
        )
        .moveDown(1.5);

      // ── SIGNATURE BLOCK ───────────────────────────────────────────────────
      const lineY = doc.y + PDF_CONFIG.signatureBlockGap;
      doc
        .moveTo(PDF_CONFIG.marginLeft, lineY)
        .lineTo(PDF_CONFIG.marginLeft + PDF_CONFIG.signatureLineWidth, lineY)
        .strokeColor(`#${PDF_CONFIG.colourLine}`)
        .stroke();
      doc.y = lineY + 8;

      if (opts.signed && opts.typedName && opts.signedAtUtc) {
        doc
          .font(PDF_CONFIG.fontFamilyBold)
          .fontSize(PDF_CONFIG.fontSizeBody)
          .fillColor(`#${PDF_CONFIG.colourBody}`)
          .text(opts.typedName)
          .moveDown(0.3)
          .font(PDF_CONFIG.fontFamily)
          .fontSize(PDF_CONFIG.fontSizeSmall)
          .fillColor(`#${PDF_CONFIG.colourMuted}`)
          .text(`Signed electronically on ${opts.signedAtUtc.toISOString()} UTC`)
          .moveDown(0.2)
          .text(
            'Typed name constitutes legal electronic signature per ESIGN Act (15 U.S.C. § 7001) and UETA.',
          );
      } else {
        doc
          .font(PDF_CONFIG.fontFamily)
          .fontSize(PDF_CONFIG.fontSizeBody)
          .fillColor(`#${PDF_CONFIG.colourMuted}`)
          .text('[SIGNATURE PENDING]');
      }

      // ── AUDIT FOOTER (signed PDFs only — new page) ────────────────────────
      if (
        opts.signed &&
        opts.signingEventId &&
        opts.signerUserId &&
        opts.signedAtUtc
      ) {
        doc.addPage();

        doc
          .font(PDF_CONFIG.fontFamilyBold)
          .fontSize(PDF_CONFIG.fontSizeHeading)
          .fillColor(`#${PDF_CONFIG.colourPrimary}`)
          .text('ELECTRONIC SIGNATURE AUDIT RECORD')
          .moveDown(0.5)
          .font(PDF_CONFIG.fontFamily)
          .fontSize(PDF_CONFIG.fontSizeSmall)
          .fillColor(`#${PDF_CONFIG.colourMuted}`)
          .text(
            'This page forms part of the electronically executed Non-Disclosure Agreement above.',
          )
          .moveDown(1)
          .fontSize(PDF_CONFIG.fontSizeBody)
          .fillColor(`#${PDF_CONFIG.colourBody}`)
          .text(`Signing Event ID : ${opts.signingEventId}`, { lineGap: 6 })
          .text(`Signer User ID   : ${opts.signerUserId}`, { lineGap: 6 })
          .text(`IP Address       : ${opts.ipAddress ?? 'unknown'}`, { lineGap: 6 })
          .text(`Device Type      : ${opts.deviceType ?? 'unknown'}`, { lineGap: 6 })
          .text(`Signed At (UTC)  : ${opts.signedAtUtc.toISOString()}`, { lineGap: 6 })
          .moveDown(1)
          .fontSize(PDF_CONFIG.fontSizeSmall)
          .fillColor(`#${PDF_CONFIG.colourMuted}`)
          .text(
            'This audit record satisfies the record retention requirements of the Electronic ' +
              'Signatures in Global and National Commerce Act (15 U.S.C. § 7001 et seq.) ' +
              'and the Uniform Electronic Transactions Act.',
          );
      }

      doc.end();
    });
  }

  private renderClauses(
    doc: PDFKit.PDFDocument,
    requireNdaToViewScope: boolean,
  ): void {
    for (const clause of NDA_CLAUSES) {
      doc
        .font(PDF_CONFIG.fontFamilyBold)
        .fontSize(PDF_CONFIG.fontSizeHeading)
        .fillColor(`#${PDF_CONFIG.colourBody}`)
        .text(clause.heading)
        .moveDown(0.3)
        .font(PDF_CONFIG.fontFamily)
        .fontSize(PDF_CONFIG.fontSizeBody)
        .text(clause.body(requireNdaToViewScope), { lineGap: PDF_CONFIG.lineGap })
        .moveDown(PDF_CONFIG.paragraphGap / 10);
    }
  }

  private async writePdfToR2(key: string, buffer: Buffer): Promise<void> {
    const bucket = this.config.get<string>('CLOUDFLARE_R2_BUCKET')!;
    await this.r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: 'application/pdf',
      }),
    );
  }
}
