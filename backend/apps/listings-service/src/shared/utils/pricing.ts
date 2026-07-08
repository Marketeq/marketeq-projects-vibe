export function hourlyRateForTask(input: {
  roleName: string;
  experienceLevel: string;
  location?: string | string[];
}): number {
  const role = (input.roleName || '').toLowerCase();
  const exp = (input.experienceLevel || 'Medior').toLowerCase();
  const locRaw = Array.isArray(input.location)
    ? (input.location[0] ?? '')
    : (input.location ?? '');
  const loc = locRaw.toLowerCase();

  let base = 20;
  if (role.includes('architect')) base = 35;
  else if (role.includes('machine learning') || role.includes('data scientist')) base = 32;
  else if (role.includes('devops') || role.includes('site reliability')) base = 30;
  else if (role.includes('security')) base = 30;
  else if (role.includes('backend')) base = 25;
  else if (role.includes('full stack') || role.includes('fullstack')) base = 28;
  else if (role.includes('frontend')) base = 24;
  else if (role.includes('mobile')) base = 25;
  else if (role.includes('qa')) base = 18;
  else if (role.includes('ui/ux') || role.includes('designer') || role.includes('design')) base = 21;
  else if (role.includes('research')) base = 20;

  const expMult =
    exp === 'student' ? 0.5
    : exp === 'junior' ? 0.75
    : exp === 'senior' ? 1.25
    : exp === 'guru' ? 1.5
    : 1.0;

  let locMult = 0.85;
  if (loc.includes('united states') || loc.includes('canada') || loc.includes('united kingdom') || loc.includes('australia') || loc.includes('australia / nz')) locMult = 1.0;
  else if (loc.includes('western europe') || loc.includes('germany') || loc.includes('netherlands') || loc.includes('france') || loc.includes('sweden') || loc.includes('norway') || loc.includes('denmark')) locMult = 0.95;
  else if (loc.includes('eastern europe') || loc.includes('poland') || loc.includes('romania') || loc.includes('ukraine') || loc.includes('bulgaria')) locMult = 0.7;
  else if (loc.includes('south asia') || loc.includes('india') || loc.includes('pakistan') || loc.includes('bangladesh') || loc.includes('sri lanka')) locMult = 0.5;
  else if (loc.includes('southeast asia') || loc.includes('east asia') || loc.includes('middle east')) locMult = 0.6;
  else if (loc.includes('latin america') || loc.includes('brazil') || loc.includes('mexico') || loc.includes('argentina') || loc.includes('colombia')) locMult = 0.65;
  else if (loc.includes('africa')) locMult = 0.55;

  return Math.round(base * expMult * locMult);
}

export function budgetFromScope(scope: Array<{
  tasks: Array<{
    roleName: string;
    experienceLevel: string;
    estimatedHours: number;
    location?: string | string[];
  }>;
}>): { budget: number | null; totalHours: number } {
  const tasks = scope.flatMap((p) => p.tasks);
  const totalHours = tasks.reduce(
    (acc, t) => acc + (Number.isFinite(t.estimatedHours) ? Number(t.estimatedHours) : 0),
    0,
  );
  if (tasks.length === 0 || totalHours <= 0) return { budget: null, totalHours: 0 };
  const totalCost = tasks.reduce((acc, t) => {
    const hours = Number.isFinite(t.estimatedHours) ? Number(t.estimatedHours) : 0;
    if (hours <= 0) return acc;
    return acc + hours * hourlyRateForTask({
      roleName: t.roleName,
      experienceLevel: t.experienceLevel,
      location: t.location,
    });
  }, 0);
  return { budget: Math.round(totalCost * 100) / 100, totalHours };
}
