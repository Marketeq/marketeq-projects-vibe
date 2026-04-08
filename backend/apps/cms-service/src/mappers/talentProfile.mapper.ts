/**
 * Maps a Payload CMS talent-profile document to the RabbitMQ event payload.
 * Single source of truth — used by both afterChange hook and reconcile plugin.
 */
export function mapProfileToEvent(doc: any) {
  const id = doc.uuid || String(doc.id);
  const username = doc.username;
  const name = doc.name;

  if (!id || id === 'undefined' || !username || !name) {
    throw new Error(`Profile missing required fields: id=${id}, username=${username}, name=${name}`);
  }

  return {
    id,
    sourceId: doc.sourceId || null,
    username,
    name,
    headline: doc.headline || null,
    availability: doc.availability || null,
    isAvailable: doc.isAvailable ?? true,
    location: doc.location || null,
    country: doc.country || null,
    timezone: doc.timezone || null,
    rateMin: doc.rateMin ?? null,
    rateMax: doc.rateMax ?? null,
    overview: doc.overview || null,
    skills: (doc.skills || []).map((s: any) => s.name),
    industryExpertise: (doc.industryExpertise || []).map((i: any) => i.name),
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
      thumbnailId: typeof p.thumbnail === 'object' && p.thumbnail ? p.thumbnail.id : null,
      description: p.description,
    })),
    status: doc.status || 'active',
  };
}
