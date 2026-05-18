export const PDF_CONFIG = {
  pageSize: 'LETTER' as const,
  marginTop: 72,
  marginBottom: 72,
  marginLeft: 72,
  marginRight: 72,

  fontFamily: 'Helvetica',
  fontFamilyBold: 'Helvetica-Bold',
  fontSizeTitle: 18,
  fontSizeHeading: 13,
  fontSizeBody: 11,
  fontSizeSmall: 9,
  lineGap: 4,
  paragraphGap: 12,

  colourPrimary: '1F3864',
  colourBody: '1A1A1A',
  colourMuted: '777777',
  colourLine: 'CCCCCC',

  signatureLineWidth: 300,
  signatureLineY: -2,
  signatureBlockGap: 48,
} as const;
