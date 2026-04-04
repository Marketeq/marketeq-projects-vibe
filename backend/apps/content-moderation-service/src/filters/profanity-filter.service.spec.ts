import { Test, TestingModule } from '@nestjs/testing';
import { ProfanityFilterService } from './profanity-filter.service';

describe('ProfanityFilterService', () => {
  let service: ProfanityFilterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProfanityFilterService],
    }).compile();

    service = module.get<ProfanityFilterService>(ProfanityFilterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject text with profanity', async () => {
    const result = await service.check('This is a fuck project','proj123', 'title');
    expect(result.failed).toBe(true); // ✅ should reject
  });

  it('should allow clean text', async () => {
    const result = await service.check('This is a space mission','proj456', 'description');
    expect(result.failed).toBe(false); // ✅ should accept
  });
});
