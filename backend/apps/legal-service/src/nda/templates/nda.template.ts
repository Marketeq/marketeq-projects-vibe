/**
 * NDA clause definitions used by NdaGenerationService.buildPdf().
 * Each clause has a heading and a body function that accepts
 * the requireNdaToViewScope flag (which affects scope-related language).
 */
export interface NdaClause {
  heading: string;
  body: (requireNdaToViewScope: boolean) => string;
}

export const NDA_CLAUSES: NdaClause[] = [
  {
    heading: 'RECITALS',
    body: () =>
      'WHEREAS, the Disclosing Party possesses certain confidential and proprietary ' +
      'information relating to the project or engagement described above (the "Purpose"); ' +
      'and WHEREAS, the Receiving Party desires to receive certain confidential information ' +
      'from the Disclosing Party solely for the Purpose of evaluating or performing the ' +
      'engagement; NOW, THEREFORE, in consideration of the mutual covenants set forth herein, ' +
      'and for other good and valuable consideration, the receipt and sufficiency of which are ' +
      'hereby acknowledged, the parties agree as follows.',
  },
  {
    heading: 'CONFIDENTIAL INFORMATION',
    body: () =>
      '"Confidential Information" means any and all non-public information disclosed by the ' +
      'Disclosing Party to the Receiving Party, whether disclosed orally, in writing, ' +
      'electronically, or by any other means, that is designated as confidential or that ' +
      'reasonably should be understood to be confidential given the nature of the information ' +
      'and the circumstances of disclosure. Confidential Information includes, without ' +
      'limitation: business plans, project briefs, financial data, technical specifications, ' +
      'client lists, pricing information, trade secrets, and any other proprietary information ' +
      'related to the Disclosing Party\'s business or the Purpose.',
  },
  {
    heading: 'NON-DISCLOSURE OBLIGATIONS',
    body: (requireNdaToViewScope: boolean) =>
      'The Receiving Party agrees to: (a) hold the Confidential Information in strict ' +
      'confidence using at least the same degree of care it uses to protect its own ' +
      'confidential information, but in no event less than reasonable care; ' +
      '(b) not disclose the Confidential Information to any third party without the prior ' +
      'written consent of the Disclosing Party; (c) use the Confidential Information solely ' +
      'for the Purpose and for no other purpose; and (d) limit access to the Confidential ' +
      'Information to those of its representatives who have a need to know such information ' +
      'for the Purpose and who are bound by confidentiality obligations no less restrictive ' +
      'than those set forth herein.' +
      (requireNdaToViewScope
        ? ' The Receiving Party acknowledges that access to the full project scope and ' +
          'deliverables description is contingent upon execution of this Agreement.'
        : ''),
  },
  {
    heading: 'PERMITTED DISCLOSURES',
    body: () =>
      'The obligations of confidentiality shall not apply to information that: ' +
      '(a) is or becomes publicly available through no fault of the Receiving Party; ' +
      '(b) was rightfully known to the Receiving Party prior to disclosure by the ' +
      'Disclosing Party; (c) is independently developed by the Receiving Party without ' +
      'use of or reference to the Confidential Information; or (d) is required to be ' +
      'disclosed by applicable law, regulation, or court order, provided that the ' +
      'Receiving Party gives the Disclosing Party prompt written notice of such requirement ' +
      'prior to disclosure (to the extent permitted by law) and reasonably cooperates with ' +
      'the Disclosing Party in seeking a protective order or other appropriate remedy.',
  },
  {
    heading: 'TERM',
    body: () =>
      'This Agreement is effective as of the date of electronic execution set forth in the ' +
      'signature block below and shall remain in effect for the duration of the engagement ' +
      'between the parties on the Marketeq platform. The obligations of confidentiality ' +
      'shall survive termination or expiration of this Agreement and shall remain in full ' +
      'force and effect for a period of three (3) years thereafter, or until the ' +
      'Confidential Information enters the public domain through no act or omission of the ' +
      'Receiving Party, whichever occurs first.',
  },
  {
    heading: 'INTERNATIONAL DISCLAIMER',
    body: () =>
      'The Marketeq platform operates internationally and facilitates engagements between ' +
      'parties in multiple jurisdictions. This Agreement is governed by the laws of the ' +
      'State of Delaware, United States, as set forth in the Governing Law section below. ' +
      'Depending on the Receiving Party\'s jurisdiction of residence, local mandatory laws ' +
      'may provide additional rights that cannot be contractually waived. Nothing in this ' +
      'Agreement is intended to, or shall, limit any rights the Receiving Party may have ' +
      'under applicable mandatory local law. Marketeq makes no representation that this ' +
      'Agreement complies with the laws of any jurisdiction outside of the United States.',
  },
  {
    heading: 'GOVERNING LAW AND DISPUTE RESOLUTION',
    body: () =>
      'This Agreement shall be governed by and construed in accordance with the laws of the ' +
      'State of Delaware, United States, without regard to its conflict of law provisions. ' +
      'Any dispute, claim, or controversy arising out of or relating to this Agreement, or ' +
      'the breach, termination, enforcement, interpretation, or validity thereof, shall be ' +
      'resolved by binding arbitration administered by the American Arbitration Association ' +
      'under its Commercial Arbitration Rules. The arbitration shall take place in ' +
      'Wilmington, Delaware, unless otherwise agreed by the parties. The arbitrator\'s ' +
      'decision shall be final and binding and may be entered as a judgment in any court ' +
      'of competent jurisdiction.',
  },
  {
    heading: 'REMEDIES',
    body: () =>
      'The Receiving Party acknowledges that any breach of this Agreement may cause the ' +
      'Disclosing Party irreparable harm for which monetary damages would be an inadequate ' +
      'remedy, and that in the event of such breach or threatened breach, the Disclosing ' +
      'Party shall be entitled to seek equitable relief, including injunction and specific ' +
      'performance, in addition to all other remedies available at law or in equity, without ' +
      'the requirement to post any bond or other security.',
  },
];
