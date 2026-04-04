import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JobListingDraftService } from './job-listing-draft.service';
import { JobListing } from '../entities/job-listing.entity';
import { JobListingEventsPublisher } from '../events/job-listing-events.publisher';
import { JobListingStatus } from '../enums/job-listing-status.enum';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRepo = {
  findOne: jest.fn(),
  update: jest.fn(),
  find:   jest.fn(),
};

const mockPublisher = {
  emit: jest.fn(),
};

const mockConfig = {
  get: jest.fn().mockReturnValue(90), // DRAFT_STALE_WARNING_DAYS = 90
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('JobListingDraftService', () => {
  let service: JobListingDraftService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobListingDraftService,
        { provide: getRepositoryToken(JobListing), useValue: mockRepo },
        { provide: JobListingEventsPublisher,       useValue: mockPublisher },
        { provide: ConfigService,                   useValue: mockConfig },
      ],
    }).compile();

    service = module.get<JobListingDraftService>(JobListingDraftService);
    jest.clearAllMocks();
  });

  // ── autoSave ───────────────────────────────────────────────────────────────

  describe('autoSave()', () => {
    it('saves changed fields and always stamps lastActivityAt', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.update.mockResolvedValue(undefined);

      await service.autoSave('listing-123', { description: 'We are building a marketplace' });

      expect(mockRepo.update).toHaveBeenCalledWith(
        'listing-123',
        expect.objectContaining({
          description:      'We are building a marketplace',
          lastActivityAt:   expect.any(Date),
          staleWarningSent: false,
        }),
      );
      console.log('✓ autoSave saved description and stamped lastActivityAt');
    });

    it('advances lastCompletedStep when a higher step is completed', async () => {
      mockRepo.findOne.mockResolvedValue({ lastCompletedStep: 1 });
      mockRepo.update.mockResolvedValue(undefined);

      await service.autoSave('listing-123', {}, 3);

      expect(mockRepo.update).toHaveBeenCalledWith(
        'listing-123',
        expect.objectContaining({ lastCompletedStep: 3 }),
      );
      console.log('✓ autoSave advanced lastCompletedStep from 1 → 3');
    });

    it('does NOT decrease lastCompletedStep when client goes backwards', async () => {
      mockRepo.findOne.mockResolvedValue({ lastCompletedStep: 4 });
      mockRepo.update.mockResolvedValue(undefined);

      await service.autoSave('listing-123', {}, 2);

      const updateCall = mockRepo.update.mock.calls[0][1];
      expect(updateCall.lastCompletedStep).toBeUndefined();
      console.log('✓ autoSave did NOT decrease lastCompletedStep (stayed at 4, ignored step 2)');
    });

    it('resets staleWarningSent on every save', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.update.mockResolvedValue(undefined);

      await service.autoSave('listing-123', { ndaEnabled: true });

      expect(mockRepo.update).toHaveBeenCalledWith(
        'listing-123',
        expect.objectContaining({ staleWarningSent: false }),
      );
      console.log('✓ autoSave reset staleWarningSent so warning can fire again later');
    });
  });

  // ── checkStaleWarnings ─────────────────────────────────────────────────────

  describe('checkStaleWarnings()', () => {
    it('emits a warning event and marks staleWarningSent for each stale draft', async () => {
      const staleDrafts = [
        { id: 'draft-aaa', clientUserId: 'user-111', lastActivityAt: new Date('2024-01-01'), status: JobListingStatus.DRAFT },
        { id: 'draft-bbb', clientUserId: 'user-222', lastActivityAt: new Date('2024-02-01'), status: JobListingStatus.NEEDS_UPDATE },
      ];

      mockRepo.find.mockResolvedValue(staleDrafts);
      mockRepo.update.mockResolvedValue(undefined);

      await service.checkStaleWarnings();

      // One event emitted per stale draft
      expect(mockPublisher.emit).toHaveBeenCalledTimes(2);

      expect(mockPublisher.emit).toHaveBeenCalledWith(
        'job_listing.stale_draft_warning',
        expect.objectContaining({ listingId: 'draft-aaa', clientUserId: 'user-111' }),
      );

      expect(mockPublisher.emit).toHaveBeenCalledWith(
        'job_listing.stale_draft_warning',
        expect.objectContaining({ listingId: 'draft-bbb', clientUserId: 'user-222' }),
      );

      // staleWarningSent flagged true for both
      expect(mockRepo.update).toHaveBeenCalledWith('draft-aaa', { staleWarningSent: true });
      expect(mockRepo.update).toHaveBeenCalledWith('draft-bbb', { staleWarningSent: true });

      console.log('✓ checkStaleWarnings emitted 2 warning events and marked both drafts as warned');
    });

    it('does nothing when no stale drafts exist', async () => {
      mockRepo.find.mockResolvedValue([]);

      await service.checkStaleWarnings();

      expect(mockPublisher.emit).not.toHaveBeenCalled();
      expect(mockRepo.update).not.toHaveBeenCalled();
      console.log('✓ checkStaleWarnings did nothing — no stale drafts found');
    });
  });
});
