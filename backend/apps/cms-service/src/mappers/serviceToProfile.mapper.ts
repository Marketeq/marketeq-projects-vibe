/**
 * Maps a user-service profile updated event to a Payload CMS talent-profile document.
 */
export function mapServiceEventToProfile(event: any) {
  const data: Record<string, any> = {
    username: event.username,
    firstName: event.firstName || event.username || "Talent",
    lastName: event.lastName || "User",
    name:
      event.firstName && event.lastName
        ? `${event.firstName} ${event.lastName}`
        : event.firstName || event.lastName || event.username || "Talent User",
    location: event.location,
    country: event.country,
    status: (() => {
      const allowed = ["active", "inactive", "suspended"];
      return event.status && allowed.includes(event.status) ? event.status : undefined;
    })(),
    timezone: event.timezone,
    availability: (() => {
      const allowed = ["FULL_TIME", "PART_TIME", "CUSTOM"];
      // Handle numeric or invalid values from legacy data
      if (event.availability === "10" || event.availability === 10) return "FULL_TIME";
      if (event.availability === "20" || event.availability === 20) return "PART_TIME";
      return event.availability && allowed.includes(event.availability)
        ? event.availability
        : "FULL_TIME";
    })(),
    rate: event.rate,
  };

  // Handle overview/bio (Lexical)
  if (event.bio) {
    if (typeof event.bio === "string") {
      data.overview = {
        root: {
          children: [
            {
              children: [
                {
                  detail: 0,
                  format: 0,
                  mode: "normal",
                  style: "",
                  text: event.bio,
                  type: "text",
                  version: 1,
                },
              ],
              direction: "ltr",
              format: "",
              indent: 0,
              type: "paragraph",
              version: 1,
            },
          ],
          direction: "ltr",
          format: "",
          indent: 0,
          type: "root",
          version: 1,
        },
      };
    } else {
      data.overview = event.bio;
    }
  }

  // Map jobTitles — event.jobTitles may be string[] (User entity) or
  // { jobTitle, rate, saveAsDefault }[] (TalentProfile entity). Handle both.
  if (Array.isArray(event.jobTitles)) {
    const mapped = event.jobTitles
      .map((jt: any) => {
        if (typeof jt === 'string') {
          return { headline: jt.trim(), rate: 0, saveAsDefault: false };
        }
        return {
          headline: (jt.jobTitle ?? jt.headline ?? '').trim(),
          rate: typeof jt.rate === 'number' ? jt.rate : 0,
          saveAsDefault: !!jt.saveAsDefault,
        };
      })
      .filter((jt: any) => jt.headline.length > 0)
      .slice(0, 3);
    // Only set jobTitles if we have valid entries — omitting it on update
    // preserves existing CMS data rather than wiping it with an empty array.
    if (mapped.length > 0) {
      data.jobTitles = mapped;
    }
  }

  // Map customAvailability
  if (event.customAvailability) {
    // Service sends: { monday: { enabled: true, times: [...] }, ... }
    // Or it might send the flattened array: [{ day: 'Monday', times: [...] }, ...]
    // Looking at user-event.publisher, it sends user.customAvailability directly.
    // In user-service User entity, it's a JSONB field.
    // If it's the group-style { monday: ... }, we map it directly.
    if (typeof event.customAvailability === "object") {
      const ca = event.customAvailability;
      data.customAvail = {
        monday: mapDay(ca.monday),
        tuesday: mapDay(ca.tuesday),
        wednesday: mapDay(ca.wednesday),
        thursday: mapDay(ca.thursday),
        friday: mapDay(ca.friday),
        saturday: mapDay(ca.saturday),
        sunday: mapDay(ca.sunday),
      };
    }
  }

  // Map skills
  if (Array.isArray(event.skills)) {
    data.skills = event.skills.map((s: any) => ({
      name: typeof s === "string" ? s : s.name,
    }));
  }

  // Map languages
  if (Array.isArray(event.languages)) {
    data.languages = event.languages.map((l: any) => ({
      language: typeof l === "string" ? l : l.language,
    }));
  }

  // Map industryExpertise → CMS `industries` array (each entry: { name: string })
  if (Array.isArray(event.industryExpertise) && event.industryExpertise.length > 0) {
    data.industries = event.industryExpertise.map((i: any) => ({
      name: typeof i === "string" ? i : i.name ?? i.industry ?? String(i),
    }));
  }

  // Map certifications — normalise across old relational entity and TalentProfile JSONB variants
  if (Array.isArray(event.certifications)) {
    data.certifications = event.certifications.map((c: any) => ({
      title: c.title ?? c.name,                          // TalentProfile uses `title`, old table uses `name`
      organization: c.organization ?? c.issuer ?? null,  // TalentProfile uses `organization`, old uses `issuer`
      dateAwarded: c.dateAwarded ?? c.issueDate ?? null, // TalentProfile uses `dateAwarded`
      expirationDate: c.expirationDate ?? null,
      noExpiration: !!c.noExpiration,
      credentialsId: c.credentialsId ?? c.credentialId ?? null,
      credentialsUrl: c.credentialsUrl ?? c.credentialUrl ?? null,
      skills: Array.isArray(c.skills)
        ? c.skills.map((s: any) => ({ name: typeof s === "string" ? s : s.name }))
        : [],
    }));
  }

  // Map education
  if (Array.isArray(event.education)) {
    data.education = event.education.map((e: any) => ({
      institution: e.institution ?? e.school,   // old entity uses `school`
      degree: e.degree,
      graduationYear: e.graduationYear ?? e.endYear ?? null,
    }));
  }

  // Map workExperience
  if (Array.isArray(event.workExperience)) {
    data.workExperience = event.workExperience.map((w: any) => ({
      role: w.role ?? w.title,
      company: w.company,
      startDate: w.startDate ?? null,
      endDate: w.endDate ?? null,
      description: w.description ?? null,
      skills: Array.isArray(w.skills)
        ? w.skills.slice(0, 10).map((s: any) => ({ name: typeof s === 'string' ? s : s.name }))
        : [],
    }));
  }

  // Map portfolio
  if (Array.isArray(event.portfolio)) {
    data.portfolio = event.portfolio.map((p: any) => ({
      title: p.title ?? p.name,               // old entity uses `name`
      url: p.url ?? null,
      description: p.description ?? null,
    }));
  }

  return data;
}

function mapDay(dayData: any) {
  if (!dayData) return { enabled: false, times: [] };
  return {
    enabled: !!dayData.enabled,
    times: (dayData.times || []).map((t: any) => ({
      startTime: t.startTime?.replace(":", "_") || "09_00",
      startPeriod: t.startTimeDayPeriod || "AM",
      endTime: t.endTime?.replace(":", "_") || "05_00",
      endPeriod: t.endTimeDayPeriod || "PM",
    })),
  };
}
