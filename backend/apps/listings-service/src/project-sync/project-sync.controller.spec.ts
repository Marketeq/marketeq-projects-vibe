import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";

import { ProjectSyncController } from "./project-sync.controller";
import { ProjectSyncService } from "./project-sync.service";

describe("ProjectSyncController", () => {
  let app: INestApplication;

  const projectSyncServiceMock = {
    syncFromCms: jest.fn().mockResolvedValue({
      id: "db-row-1",
      payloadId: "123",
      action: "created",
    }),
    deleteByPayloadId: jest.fn().mockResolvedValue({ deleted: true }),
  };

  beforeAll(async () => {
    process.env.CMS_SYNC_TOKEN = "test-sync-token";

    const moduleRef = await Test.createTestingModule({
      controllers: [ProjectSyncController],
      providers: [
        {
          provide: ProjectSyncService,
          useValue: projectSyncServiceMock,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("accepts a valid sync payload and persists it", async () => {
    const validPayload = {
      id: 123,
      title: "Project from CMS",
      slug: "project-from-cms",
      shortDescription: "A valid project payload for sync",
      pricingModel: "biweekly",
      status: "published",
    };

    const response = await request(app.getHttpServer())
      .post("/internal/project-sync")
      .set("authorization", "Bearer test-sync-token")
      .send(validPayload)
      .expect(201);

    expect(projectSyncServiceMock.syncFromCms).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 123,
        title: "Project from CMS",
        slug: "project-from-cms",
      }),
    );
    expect(response.body).toEqual({
      status: "ok",
      id: "db-row-1",
      payloadId: "123",
      action: "created",
    });
  });

  it("rejects payloads that include non-whitelisted fields", async () => {
    const invalidPayload = {
      id: 456,
      title: "Invalid extra fields",
      slug: "invalid-extra-fields",
      shortDescription: "Should be rejected",
      adminNotes: "editorial-only field should not cross sync boundary",
    };

    await request(app.getHttpServer())
      .post("/internal/project-sync")
      .set("authorization", "Bearer test-sync-token")
      .send(invalidPayload)
      .expect(400);

    expect(projectSyncServiceMock.syncFromCms).not.toHaveBeenCalled();
  });

  it("rejects requests with an invalid bearer token", async () => {
    const validPayload = {
      id: 789,
      title: "Unauthorized request",
      slug: "unauthorized-request",
      shortDescription: "Token mismatch should fail",
    };

    await request(app.getHttpServer())
      .post("/internal/project-sync")
      .set("authorization", "Bearer wrong-token")
      .send(validPayload)
      .expect(401);

    expect(projectSyncServiceMock.syncFromCms).not.toHaveBeenCalled();
  });
});
