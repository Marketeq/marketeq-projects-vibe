import { BannedKeywordsService } from './banned-keywords.service';

describe('BannedKeywordsService', () => {
  let service: BannedKeywordsService;

  beforeEach(() => {
    service = new BannedKeywordsService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject text with exact banned keyword', async () => {
    const result = await service.check('This content contains violence.');
    expect(result.failed).toBe(true);
    expect(result.reason).toContain('Banned keyword');
  });

  it('should reject text with fuzzy match to banned keyword', async () => {
    const result = await service.check('This content has violnce in it.');
    expect(result.failed).toBe(true);
    expect(result.reason).toContain('Banned keyword');
  });

  it('should reject text with negative sentiment', async () => {
    const result = await service.check('This is the worst most annoying platform ever.');
    expect(result.failed).toBe(true);
    expect(result.reason).toContain('Negative sentiment');
  });

  it('should allow clean text', async () => {
    const result = await service.check('This is a lovely and informative article.');
    expect(result.failed).toBe(false);
  });

  it('should allow dynamically adding new banned keyword', async () => {
    await service.add('bannedword');
    const result = await service.check('This contains bannedword content.');
    expect(result.failed).toBe(true);
    expect(result.reason).toContain('Banned keyword');
  });
});
