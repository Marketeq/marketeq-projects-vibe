// uuid v13 is ESM-only — mock it so Jest (CommonJS) can load the service file.
jest.mock("uuid", () => ({ v4: () => "mock-uuid" }));

import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { ConflictException, ForbiddenException } from "@nestjs/common";
import { of } from "rxjs";
import { JobListingService } from "./job-listing.service";
import { JobListing } from "../entities/job-listing.entity";
import { TeamMemberRow } from "../entities/job-listing-role-row.entity";
import { BasicInformation } from "../entities/job-listing-basic-info.entity";
import { RoleDescription } from "../entities/job-listing-role-description.entity";
import { JobListingInviteService } from "./job-listing-invite.service";
import { JobListingBriefStorageService } from "./job-listing-brief-storage.service";
import { JobListingScopeService } from "./job-listing-scope.service";
import { JobListingEventsPublisher } from "../events/job-listing-events.publisher";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRepo = {
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockRoleRowRepo = {};
const mockBasicInfoRepo = {};
const mockRoleDescriptionRepo = {};

const mockConfig = {
  get: jest.fn().mockReturnValue("http://contracts-service"),
};

const mockHttp = {
  get: jest.fn(),
};

const mockInviteService = {
  send: jest.fn(),
};

const mockBriefStorage = {
  createPresignedUpload: jest.fn(),
};

const mockPublisher = {
  emit: jest.fn(),
};

const mockScopeService = {
  loadInheritedScope: jest.fn().mockResolvedValue([]),
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("JobListingService — JL-10 Existing Contract", () => {
  let service: JobListingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobListingService,
        { provide: getRepositoryToken(JobListing), useValue: mockRepo },
        {
          provide: getRepositoryToken(TeamMemberRow),
          useValue: mockRoleRowRepo,
        },
        {
          provide: getRepositoryToken(BasicInformation),
          useValue: mockBasicInfoRepo,
        },
        {
          provide: getRepositoryToken(RoleDescription),
          useValue: mockRoleDescriptionRepo,
        },
        { provide: ConfigService, useValue: mockConfig },
        { provide: HttpService, useValue: mockHttp },
        { provide: JobListingInviteService, useValue: mockInviteService },
        { provide: JobListingBriefStorageService, useValue: mockBriefStorage },
        { provide: JobListingEventsPublisher, useValue: mockPublisher },
        { provide: JobListingScopeService, useValue: mockScopeService },
      ],
    }).compile();

    service = module.get<JobListingService>(JobListingService);
    jest.clearAllMocks();
  });

  // ── validateContractSelectable ────────────────────────────────────────────

  describe("validateContractSelectable()", () => {
    it("passes when contract is active and user is owner", async () => {
      mockHttp.get.mockReturnValue(
        of({
          data: {
            status: "active",
            members: [{ userId: "user-111", role: "owner" }],
          },
        }),
      );

      await expect(
        service.validateContractSelectable("contract-aaa", "user-111"),
      ).resolves.toBeUndefined();

      console.log(
        "✓ validateContractSelectable passed for active contract with owner permission",
      );
    });

    it("passes when contract is paused and user is lead", async () => {
      mockHttp.get.mockReturnValue(
        of({
          data: {
            status: "paused",
            members: [{ userId: "user-222", role: "lead" }],
          },
        }),
      );

      await expect(
        service.validateContractSelectable("contract-bbb", "user-222"),
      ).resolves.toBeUndefined();

      console.log(
        "✓ validateContractSelectable passed for paused contract with lead permission",
      );
    });

    it("throws 409 when contract is disputed", async () => {
      mockHttp.get.mockReturnValue(
        of({
          data: { status: "disputed", members: [] },
        }),
      );

      await expect(
        service.validateContractSelectable("contract-ccc", "user-111"),
      ).rejects.toThrow(ConflictException);

      console.log(
        "✓ validateContractSelectable threw 409 for disputed contract",
      );
    });

    it("throws 409 when contract is expired", async () => {
      mockHttp.get.mockReturnValue(
        of({
          data: { status: "expired", members: [] },
        }),
      );

      await expect(
        service.validateContractSelectable("contract-ddd", "user-111"),
      ).rejects.toThrow(ConflictException);

      console.log(
        "✓ validateContractSelectable threw 409 for expired contract",
      );
    });

    it("throws 409 when contract is closed", async () => {
      mockHttp.get.mockReturnValue(
        of({
          data: { status: "closed", members: [] },
        }),
      );

      await expect(
        service.validateContractSelectable("contract-eee", "user-111"),
      ).rejects.toThrow(ConflictException);

      console.log("✓ validateContractSelectable threw 409 for closed contract");
    });

    it("throws 403 when user is not owner or lead", async () => {
      mockHttp.get.mockReturnValue(
        of({
          data: {
            status: "active",
            members: [{ userId: "user-111", role: "member" }],
          },
        }),
      );

      await expect(
        service.validateContractSelectable("contract-fff", "user-111"),
      ).rejects.toThrow(ForbiddenException);

      console.log(
        "✓ validateContractSelectable threw 403 for user without owner/lead role",
      );
    });
  });

  // ── populateFromContract ──────────────────────────────────────────────────

  describe("populateFromContract()", () => {
    it("copies budget, duration, NDA and contractId from the parent contract", async () => {
      mockHttp.get.mockReturnValue(
        of({
          data: {
            budgetAmountUsdCents: 500000,
            budgetFrequency: "per_week",
            durationMonths: 6,
            isOngoing: false,
            ndaEnabled: true,
            ndaDocumentId: "nda-doc-uuid",
            ndaScopeVisibility: "relevant_phases",
          },
        }),
      );
      mockRepo.update.mockResolvedValue(undefined);

      await service.populateFromContract("listing-123", "contract-aaa");

      expect(mockRepo.update).toHaveBeenCalledWith(
        "listing-123",
        expect.objectContaining({
          contractId: "contract-aaa",
          budgetAmountUsdCents: 500000,
          budgetFrequency: "per_week",
          durationMonths: 6,
          isOngoing: false,
          ndaEnabled: true,
          ndaDocumentId: "nda-doc-uuid",
          ndaScopeVisibility: "relevant_phases",
          inviteBalance: 0,
        }),
      );

      console.log(
        "✓ populateFromContract copied all contract fields to the listing",
      );
    });

    it("sets ndaDocumentId to null when contract has no NDA document", async () => {
      mockHttp.get.mockReturnValue(
        of({
          data: {
            budgetAmountUsdCents: 100000,
            budgetFrequency: "per_month",
            durationMonths: 3,
            isOngoing: false,
            ndaEnabled: false,
            ndaDocumentId: null,
            ndaScopeVisibility: "relevant_phases",
          },
        }),
      );
      mockRepo.update.mockResolvedValue(undefined);

      await service.populateFromContract("listing-456", "contract-bbb");

      expect(mockRepo.update).toHaveBeenCalledWith(
        "listing-456",
        expect.objectContaining({ ndaDocumentId: null }),
      );

      console.log(
        "✓ populateFromContract correctly sets ndaDocumentId to null when absent",
      );
    });
  });

  describe("update()", () => {
    it("persists uploaded brief metadata for edit hydration", async () => {
      const existingListing = {
        id: "listing-brief",
        contractType: "new",
        workType: "project",
        hiringType: "team",
        listingType: "project_team",
      };
      const updatedListing = {
        ...existingListing,
        briefR2Key: "briefs/listing-brief/scope.pdf",
        briefFilename: "scope.pdf",
        briefSizeBytes: 1048576,
      };

      mockRepo.findOne
        .mockResolvedValueOnce(existingListing)
        .mockResolvedValueOnce(updatedListing);
      mockRepo.update.mockResolvedValue({ affected: 1 });

      await service.update("user-111", "listing-brief", {
        briefR2Key: "briefs/listing-brief/scope.pdf",
        briefFilename: "scope.pdf",
        briefSizeBytes: 1048576,
      });

      expect(mockRepo.update).toHaveBeenCalledWith(
        "listing-brief",
        expect.objectContaining({
          briefR2Key: "briefs/listing-brief/scope.pdf",
          briefFilename: "scope.pdf",
          briefSizeBytes: 1048576,
        }),
      );
    });

    it("persists job listing draft fields used by edit hydration", async () => {
      const existingListing = {
        id: "listing-draft-fields",
        contractType: "new",
        workType: "project",
        hiringType: "team",
        listingType: "project_team",
      };
      const draftFields = {
        categorySelections: [
          { category: "Development", subCategories: ["Web Development"] },
        ],
        tags: ["website", "launch"],
        skills: ["React", "UX Design"],
        tools: ["Figma", "Next.js"],
        media: {
          featuredImageName: "hero.png",
          additionalImageNames: ["wireframe.png"],
          featuredVideo: "https://example.com/demo",
        },
      };

      mockRepo.findOne
        .mockResolvedValueOnce(existingListing)
        .mockResolvedValueOnce({ ...existingListing, ...draftFields });
      mockRepo.update.mockResolvedValue({ affected: 1 });

      await service.update("user-111", "listing-draft-fields", draftFields);

      expect(mockRepo.update).toHaveBeenCalledWith(
        "listing-draft-fields",
        expect.objectContaining(draftFields),
      );
    });
  });
});
