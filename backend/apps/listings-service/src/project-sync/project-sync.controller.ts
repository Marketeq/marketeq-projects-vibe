import {
  Controller,
  Post,
  Delete,
  Body,
  Headers,
  Param,
  UnauthorizedException,
  Logger,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { ProjectSyncService } from "./project-sync.service";
import { ProjectSyncDto } from "./dto/project-sync.dto";
import { DeriveDeliverablesDto } from "./dto/derive-deliverables.dto";

type DeliverableGroup = { phaseLabel: string; phaseName: string; items: string[] };

function lexicalFromDeliverables(groups: DeliverableGroup[]) {
  const children: any[] = [];
  const safeText = (s: unknown) => (typeof s === "string" ? s : "").trim();

  for (const g of groups) {
    const phaseName = safeText(g.phaseName) || "Deliverables";
    const items = Array.isArray(g.items)
      ? g.items.map((i) => safeText(i)).filter(Boolean)
      : [];
    if (items.length === 0) continue;

    children.push({
      type: "heading",
      tag: "h2",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      children: [{ type: "text", text: phaseName, version: 1 }],
    });

    children.push({
      type: "list",
      listType: "bullet",
      start: 1,
      tag: "ul",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      children: items.map((text) => ({
        type: "listitem",
        value: 1,
        format: "",
        indent: 0,
        version: 1,
        direction: "ltr",
        children: [
          {
            type: "paragraph",
            format: "",
            indent: 0,
            version: 1,
            direction: "ltr",
            children: [{ type: "text", text, version: 1 }],
          },
        ],
      })),
    });
  }

  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      children,
    },
  };
}

/**
 * Internal sync endpoint called by the cms-service Payload afterChange
 * and afterDelete hooks for the `projects` collection. Bearer-authed via
 * the shared CMS_SYNC_TOKEN env var.
 */
@Controller("internal/project-sync")
export class ProjectSyncController {
  private readonly logger = new Logger(ProjectSyncController.name);

  constructor(private readonly projectSyncService: ProjectSyncService) {}

  @Post("derive-deliverables")
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  async deriveDeliverables(
    @Body() body: DeriveDeliverablesDto,
    @Headers("authorization") authHeader: string,
  ) {
    this.assertAuthorized(authHeader);
    const deliverables = await this.projectSyncService.deriveDeliverablesFromScope(
      body.scope as any,
    );
    return {
      status: "ok",
      deliverables,
      deliverablesLexical: lexicalFromDeliverables(deliverables as any),
    };
  }

  @Post()
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  async syncProject(
    @Body() projectData: ProjectSyncDto,
    @Headers("authorization") authHeader: string,
  ) {
    this.assertAuthorized(authHeader);
    try {
      const result = await this.projectSyncService.syncFromCms(projectData);
      return { status: "ok", ...result };
    } catch (error) {
      this.logger.error(
        `Failed to sync project ${projectData?.id}: ${
          (error as Error).message
        }`,
      );
      throw error;
    }
  }

  @Delete(":payloadId")
  async deleteProject(
    @Param("payloadId") payloadId: string,
    @Headers("authorization") authHeader: string,
  ) {
    this.assertAuthorized(authHeader);
    try {
      const result = await this.projectSyncService.deleteByPayloadId(payloadId);
      return { status: "ok", ...result };
    } catch (error) {
      this.logger.error(
        `Failed to delete project ${payloadId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  private assertAuthorized(authHeader: string | undefined): void {
    const expectedToken = process.env.CMS_SYNC_TOKEN;
    if (!expectedToken) {
      this.logger.error("CMS_SYNC_TOKEN not configured");
      throw new UnauthorizedException("Sync token not configured");
    }
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    if (token !== expectedToken) {
      this.logger.warn("Invalid sync token received");
      throw new UnauthorizedException("Invalid sync token");
    }
  }
}
