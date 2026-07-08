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

// Total calendar days for the project, derived the same way the frontend
// derives its phase-by-phase timeline: phases run sequentially, but within
// each phase, its distinct roles work in parallel (8hrs/day per person).
// Keeping this identical to the frontend calc is what matters — it's what
// keeps the stored duration and the on-page timeline from disagreeing.
export function projectDaysFromScope(scope: Array<{ tasks: Array<{ roleName: string; estimatedHours: number }> }>): number {
  let totalDays = 0;
  for (const phase of scope) {
    const tasks = phase.tasks ?? [];
    const phaseHours = tasks.reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);
    const teamSize = new Set(tasks.map((t) => t.roleName).filter(Boolean)).size || 1;
    totalDays += Math.max(1, Math.ceil(phaseHours / (8 * teamSize)));
  }
  return totalDays;
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

