import { HttpException, NotFoundException } from "@nestjs/common";
import { JobListingInviteService } from "./job-listing-invite.service";

describe("JobListingInviteService", () => {
  const repo = {
    findOne: jest.fn(),
    increment: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const publisher = { emit: jest.fn() };

  const createQueryBuilder = (affected = 1) => {
    const builder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected }),
    };
    repo.createQueryBuilder.mockReturnValue(builder);
    return builder;
  };

  let service: JobListingInviteService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new JobListingInviteService(repo as any, publisher as any);
  });

  it("deduplicates invite IDs before consuming balance", async () => {
    repo.findOne.mockResolvedValue({
      id: "listing-1",
      inviteBalance: 3,
      invitesSent: 0,
      clientUserId: "client-1",
    });

    const builder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    repo.createQueryBuilder.mockReturnValue(builder);

    await service.send("listing-1", {
      talentUserIds: ["talent-1", "talent-1", "talent-2"],
    });

    expect(builder.andWhere).toHaveBeenCalledWith(
      '"invite_balance" >= :count',
      {
        count: 2,
      },
    );
    expect(publisher.emit).toHaveBeenCalledTimes(2);
  });

  it("rejects invite send when balance is insufficient", async () => {
    repo.findOne.mockResolvedValue({
      id: "listing-1",
      inviteBalance: 1,
      invitesSent: 0,
      clientUserId: "client-1",
    });

    await expect(
      service.send("listing-1", {
        talentUserIds: ["talent-1", "talent-2"],
      }),
    ).rejects.toThrow(HttpException);
  });

  it("credits a checkout session only once", async () => {
    repo.findOne.mockResolvedValueOnce({
      id: "listing-1",
      inviteBalance: 10,
      clientUserId: "client-1",
      processedInviteCheckoutSessionIds: [],
    });
    createQueryBuilder(1);

    await expect(
      service.creditPurchasedInvites("listing-1", 100, "cs_test_123"),
    ).resolves.toEqual({ inviteBalance: 110 });

    expect(repo.increment).not.toHaveBeenCalled();
    expect(publisher.emit).toHaveBeenCalledWith(
      "job_listing.invites_purchased",
      expect.objectContaining({
        checkoutSessionId: "cs_test_123",
        inviteCount: 100,
      }),
    );
  });

  it("does not credit an already processed checkout session again", async () => {
    repo.findOne.mockResolvedValue({
      id: "listing-1",
      inviteBalance: 110,
      clientUserId: "client-1",
      processedInviteCheckoutSessionIds: ["cs_test_123"],
    });

    await expect(
      service.creditPurchasedInvites("listing-1", 100, "cs_test_123"),
    ).resolves.toEqual({ inviteBalance: 110 });

    expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    expect(repo.increment).not.toHaveBeenCalled();
    expect(publisher.emit).not.toHaveBeenCalled();
  });

  it("throws when listing is missing", async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(
      service.creditPurchasedInvites("missing", 100, "cs_test_123"),
    ).rejects.toThrow(NotFoundException);
  });
});
