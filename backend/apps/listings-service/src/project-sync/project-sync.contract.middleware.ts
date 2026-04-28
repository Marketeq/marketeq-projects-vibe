import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

const PROJECT_SYNC_ALLOWED_KEYS = new Set([
  "id",
  "title",
  "slug",
  "shortDescription",
  "fullDescription",
  "deliverables",
  "faqQuestions",
  "categories",
  "subcategories",
  "tags",
  "projectSkills",
  "programmingLanguages",
  "developmentTechnologies",
  "totalEstimatedHours",
  "timelineValue",
  "timelineUnit",
  "priceRangeMin",
  "priceRangeMax",
  "pricingModel",
  "priceViewMode",
  "projectType",
  "klarnaPaymentEnabled",
  "recentQuestions",
  "chatEnabled",
  "reportButtonEnabled",
  "shareButtonEnabled",
  "helpButtonEnabled",
  "featured",
  "_status",
  "status",
  "thumbnailUrl",
  "galleryUrls",
  "videoUrl",
  "scope",
  "industries",
  "relatedProjects",
  "datePublished",
  "projectDurationLabel",
  "ownerId",
]);

@Injectable()
export class ProjectSyncContractMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const body = req.body;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      next();
      return;
    }

    const unknownKeys = Object.keys(body).filter(
      (key) => !PROJECT_SYNC_ALLOWED_KEYS.has(key),
    );

    if (unknownKeys.length === 0) {
      next();
      return;
    }

    res.status(422).json({
      message: unknownKeys.map((key) => `property ${key} should not exist`),
      error: "Unprocessable Entity",
      statusCode: 422,
    });
  }
}
