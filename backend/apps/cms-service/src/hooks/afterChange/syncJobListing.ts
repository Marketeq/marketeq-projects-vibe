import { CollectionAfterChangeHook } from 'payload/types';

export const syncJobListing: CollectionAfterChangeHook = async ({ doc, req, operation }) => {
  if (req.context?.skipSync) return doc;

  const sourceId = doc.sourceId;
  if (!sourceId) {
    req.payload.logger.debug(`[syncJobListing] No sourceId for "${doc.title}" — skipping`);
    return doc;
  }

  const serviceUrl = process.env.LISTINGS_SERVICE_URL || 'http://localhost:3002';
  const token = process.env.INTERNAL_SERVICE_TOKEN;
  if (!token) {
    req.payload.logger.warn('[syncJobListing] INTERNAL_SERVICE_TOKEN not set — skipping sync');
    return doc;
  }

  try {
    const res = await fetch(
      `${serviceUrl.replace(/\/$/, '')}/internal/job-listings/${encodeURIComponent(sourceId)}/cms-sync`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-internal-token': token },
        body: JSON.stringify({
          title:      doc.title,
          jobType:    doc.jobType,
          ndaEnabled: doc.ndaEnabled,
          industries: doc.industries,
          languages:  doc.languages,
          teamMemberRows: (doc.teamMemberRows ?? []).map((r: any) => ({
            roleTitle:            r.roleTitle,
            location:             r.location             ?? null,
            experienceLevel:      r.experienceLevel      ?? null,
            workSchedule:         r.workSchedule         ?? 'full_time',
            customHours:          r.customHours          ?? null,
            customFrequency:      r.customFrequency      ?? null,
            contractLengthMonths: r.contractLengthMonths ?? null,
            assignedUsername:     r.assignedUsername     ?? null,
          })),
          roleDescriptions: (doc.teamMemberRows ?? []).map((r: any) => ({
            roleTitle:        r.roleTitle,
            overview:         r.description?.overview         ?? null,
            benefits:         r.description?.benefits         ?? null,
            responsibilities: r.description?.responsibilities ?? null,
            skills:           r.description?.skills           ?? [],
          })),
        }),
      },
    );
    if (!res.ok) {
      req.payload.logger.error(`[syncJobListing] ${res.status}: ${await res.text()}`);
    } else {
      req.payload.logger.info(`[syncJobListing] Synced "${doc.title}" (${operation})`);
    }
  } catch (err) {
    req.payload.logger.error({ err }, `[syncJobListing] Failed to sync "${doc.title}"`);
  }

  return doc;
};
