export function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof v === 'string' && v.trim()) {
    const s = v.trim();
    if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.map(String).map(x => x.trim()).filter(Boolean);
      } catch {}
    }
    if (s.includes(',')) return s.split(',').map(x => x.trim()).filter(Boolean);
    return [s];
  }
  return [];
}

export function normalizeExperienceLevel(val: unknown): string {
  if (!val) return 'Medior';
  if (Array.isArray(val)) return 'Medior';
  const s = String(val).trim();
  if (!s) return 'Medior';
  const lower = s.toLowerCase();
  if (lower.includes('senior') || lower.includes('lead') || lower.includes('expert')) return 'Senior';
  if (lower.includes('junior') || lower.includes('entry')) return 'Junior';
  if (lower.includes('guru')) return 'Guru';
  if (lower.includes('student')) return 'Student';
  return 'Medior';
}

export function normalizeN8nScope(raw: any[]): Array<{
  phaseName: string;
  order: number;
  tasks: Array<{
    title: string;
    roleName: string;
    experienceLevel: string;
    estimatedHours: number;
    location?: string[];
  }>;
}> {
  return raw.map((phase, i) => ({
    phaseName: (() => {
      const name = phase.phaseName ?? phase.phase_name ?? phase.name ?? phase.label ?? `Phase ${i + 1}`;
      return name.replace(/^phase\s*\d+\s*[:\-]\s*/i, '').trim() || name;
    })(),
    order: phase.order ?? i + 1,
    tasks: (phase.tasks ?? phase.steps ?? []).map((t: any) => ({
      title: t.title ?? t.taskName ?? t.task_name ?? t.name ?? t.description ?? t.label ?? 'Task',
      roleName: t.roleName ?? t.role_name ?? t.role ?? t.assignee ?? 'Developer',
      experienceLevel: normalizeExperienceLevel(
        t.experienceLevel ?? t.experience_level ?? t.experience ?? t.level,
      ),
      estimatedHours: Math.min(
        Number(t.estimatedHours ?? t.estimated_hours ?? t.hours ?? 0) || 0,
        40,
      ),
      ...(t.location != null
        ? { location: Array.isArray(t.location) ? t.location : [t.location] }
        : {}),
    })),
  }));
}

