import {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
} from "payload/types";

type EntryType =
  | "skill"
  | "industry"
  | "language"
  | "certification"
  | "title"
  | "location";

async function submitAutocomplete(req: any, type: EntryType, value: string) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return;
  const base = (
    process.env.AUTOCOMPLETE_SERVICE_URL || "http://localhost:3016"
  ).replace(/\/$/, "");
  try {
    await fetch(`${base}/autocomplete/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type,
        value: trimmed,
        source: "cms-service:talent-profiles",
      }),
    });
  } catch (err) {
    req.payload.logger.warn(
      { err, type, value: trimmed },
      "Failed autocomplete submit",
    );
  }
}

async function syncTalentProfileAutocomplete(req: any, doc: any) {
  const tasks: Array<Promise<void>> = [];
  if (typeof doc?.headline === "string") {
    tasks.push(submitAutocomplete(req, "title", doc.headline));
  }
  if (typeof doc?.location === "string") {
    tasks.push(submitAutocomplete(req, "location", doc.location));
  }
  if (typeof doc?.country === "string") {
    tasks.push(submitAutocomplete(req, "location", doc.country));
  }

  const skills = Array.isArray(doc?.skills) ? doc.skills : [];
  for (const row of skills) {
    if (typeof row?.name === "string") {
      tasks.push(submitAutocomplete(req, "skill", row.name));
    }
  }

  const industries = Array.isArray(doc?.industries)
    ? doc.industries
    : Array.isArray(doc?.industryExpertise)
      ? doc.industryExpertise
      : [];
  for (const row of industries) {
    if (typeof row?.name === "string") {
      tasks.push(submitAutocomplete(req, "industry", row.name));
    }
  }

  const languages = Array.isArray(doc?.languages) ? doc.languages : [];
  for (const row of languages) {
    if (typeof row?.language === "string") {
      tasks.push(submitAutocomplete(req, "language", row.language));
    }
  }

  const certifications = Array.isArray(doc?.certifications)
    ? doc.certifications
    : [];
  for (const row of certifications) {
    if (typeof row?.title === "string") {
      tasks.push(submitAutocomplete(req, "certification", row.title));
    }
  }

  if (tasks.length > 0) await Promise.all(tasks);
}

/**
 * After a talent profile is created or updated, publish a `talent-profile.saved`
 * event to RabbitMQ so user-service can update its local copy.
 * Uses dynamic import to avoid bundling amqplib into the admin webpack build.
 */
export const syncTalentProfileToService: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  if (req.context?.skipSync) {
    req.payload.logger.info(
      `Skipping talent-profile sync for "${doc.username}" (skipSync context)`,
    );
    return doc;
  }

  await syncTalentProfileAutocomplete(req, doc);

  try {
    const { CmsEventPublisher } =
      await import("../../rabbitmq/cms-event.publisher");
    const { mapProfileToEvent } =
      await import("../../mappers/talentProfile.mapper");
    const publisher = CmsEventPublisher.getInstance();
    if (!publisher.isConnected()) {
      req.payload.logger.warn(
        "RabbitMQ not connected — skipping talent profile sync",
      );
      return doc;
    }

    // Ensure portfolio thumbnails are populated so we can map their URLs.
    // In afterChange, doc usually contains just IDs for relations.
    if (Array.isArray(doc.portfolio)) {
      for (let i = 0; i < doc.portfolio.length; i++) {
        const item = doc.portfolio[i];
        if (item.thumbnail && typeof item.thumbnail !== "object") {
          try {
            item.thumbnail = await req.payload.findByID({
              collection: "media",
              id: item.thumbnail,
              depth: 0,
            });
          } catch (e) {
            req.payload.logger.warn(`Failed to populate thumbnail ${item.thumbnail} for profile ${doc.username}`);
          }
        }
      }
    }

    await publisher.publishTalentProfileSaved(mapProfileToEvent(doc));

    req.payload.logger.info(
      `Published talent-profile.saved for "${doc.username}" (${operation})`,
    );
  } catch (err) {
    req.payload.logger.error(
      { err },
      `Failed to publish talent-profile.saved for "${doc.username}"`,
    );
  }

  return doc;
};

/**
 * After a talent profile is deleted, publish a `talent-profile.deleted` event.
 */
export const deleteTalentProfileFromService: CollectionAfterDeleteHook =
  async ({ doc, req }) => {
    try {
      const { CmsEventPublisher } =
        await import("../../rabbitmq/cms-event.publisher");
      const publisher = CmsEventPublisher.getInstance();
      if (!publisher.isConnected()) {
        req.payload.logger.warn(
          "RabbitMQ not connected — skipping talent profile delete sync",
        );
        return doc;
      }

      await publisher.publishTalentProfileDeleted({
        id: doc.uuid || String(doc.id),
        username: doc.username,
      });

      req.payload.logger.info(
        `Published talent-profile.deleted for "${doc.username}"`,
      );
    } catch (err) {
      req.payload.logger.error(
        { err },
        `Failed to publish talent-profile.deleted for "${doc.username}"`,
      );
    }

    return doc;
  };
