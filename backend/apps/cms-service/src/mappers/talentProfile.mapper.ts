/**
 * Maps a Payload CMS talent-profile document to the RabbitMQ event payload.
 * Single source of truth — used by both afterChange hook and reconcile plugin.
 */
export function mapProfileToEvent(doc: any) {
  const id = doc.uuid || String(doc.id);
  const username = doc.username;
  const firstName = doc.firstName || "";
  const lastName = doc.lastName || "";
  const name = [firstName, lastName].filter(Boolean).join(" ");

  if (!id || id === "undefined" || !username || !name) {
    throw new Error(
      `Profile missing required fields: id=${id}, username=${username}, firstName=${firstName}, lastName=${lastName}`,
    );
  }

  const result = {
    id,
    sourceId: doc.sourceId || null,
    username,
    name,
    headline: doc.jobTitles?.[0]?.headline || null,
    jobTitles: (doc.jobTitles || []).map((jt: any) => ({
      headline: jt.headline,
      rate: jt.rate,
    })),
    availability: doc.availability || null,
    rate: doc.jobTitles?.[0]?.rate ?? null,
    rateMin: doc.jobTitles?.length
      ? Math.min(...doc.jobTitles.map((jt: any) => jt.rate))
      : null,
    rateMax: doc.jobTitles?.length
      ? Math.max(...doc.jobTitles.map((jt: any) => jt.rate))
      : null,
    overview: doc.overview || null,
    skills: (doc.skills || []).map((s: any) => s.name),
    industryExpertise: (doc.industries || doc.industryExpertise || []).map(
      (i: any) => i.name,
    ),
    languages: (doc.languages || []).map((l: any) => ({
      language: l.language,
      fluency: l.fluency,
    })),
    certifications: (doc.certifications || []).map((c: any) => ({
      title: c.title,
      organization: c.organization,
      dateAwarded: c.dateAwarded,
    })),
    education: (doc.education || []).map((e: any) => ({
      institution: e.institution,
      degree: e.degree,
      graduationYear: e.graduationYear,
    })),
    workExperience: (doc.workExperience || []).map((w: any) => ({
      role: w.role,
      company: w.company,
      startDate: w.startDate,
      endDate: w.endDate,
      description: w.description,
    })),
    portfolio: (doc.portfolio || []).map((p: any) => ({
      title: p.title,
      url: p.url,
      thumbnailId:
        typeof p.thumbnail === "object" && p.thumbnail ? p.thumbnail.id : null,
      thumbnailUrl:
        typeof p.thumbnail === "object" && p.thumbnail ? p.thumbnail.url : null,
      description: p.description,
    })),
    location: doc.location || null,
    country: doc.country || null,
    status: doc.status || "active",
  };

  console.log(`[DEBUG] Mapping profile ${username}: headline=${result.headline}, rate=${result.rate}, jobTitlesCount=${result.jobTitles.length}`);
  return result;
}
