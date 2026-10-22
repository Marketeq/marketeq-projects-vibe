const POPULAR_REGION_FOR_ROLE: Record<string, string> = {
  architect: 'Eastern Europe',
  'machine learning': 'South Asia',
  'data scientist': 'South Asia',
  devops: 'Eastern Europe',
  'site reliability': 'Eastern Europe',
  security: 'Eastern Europe',
  backend: 'Eastern Europe',
  'full stack': 'Eastern Europe',
  fullstack: 'Eastern Europe',
  frontend: 'Latin America',
  mobile: 'South Asia',
  qa: 'South Asia',
  'ui/ux': 'Latin America',
  designer: 'Latin America',
  design: 'Latin America',
  research: 'South Asia',
};

export function popularRegionForRole(roleName: string): string {
  const role = (roleName || '').toLowerCase();
  for (const [keyword, region] of Object.entries(POPULAR_REGION_FOR_ROLE)) {
    if (role.includes(keyword)) return region;
  }
  return 'Eastern Europe';
}

export function staticHourlyRate(input: {
  roleName: string;
  experienceLevel?: string | null;
  location?: string | null;
}): number {
  const role = (input.roleName || '').toLowerCase();
  const exp = (input.experienceLevel || 'Medior').toLowerCase();
  const loc = (
    input.location || popularRegionForRole(input.roleName)
  ).toLowerCase();

  let base = 85;
  if (role.includes('architect')) base = 140;
  else if (role.includes('machine learning') || role.includes('data scientist')) base = 135;
  else if (role.includes('devops') || role.includes('site reliability')) base = 120;
  else if (role.includes('security')) base = 125;
  else if (role.includes('backend')) base = 105;
  else if (role.includes('full stack') || role.includes('fullstack')) base = 110;
  else if (role.includes('frontend')) base = 100;
  else if (role.includes('mobile')) base = 105;
  else if (role.includes('qa')) base = 70;
  else if (role.includes('ui/ux') || role.includes('designer') || role.includes('design')) base = 90;
  else if (role.includes('research')) base = 85;

  const expMult =
    exp === 'student' ? 0.5
    : exp === 'junior' ? 0.75
    : exp === 'senior' ? 1.25
    : exp === 'guru' ? 1.5
    : 1.0;

  let locMult = 0.40;
  if (loc.includes('united states') || /\busa\b/.test(loc) || loc.includes('canada') || loc.includes('united kingdom') || loc.includes('australia') || loc.includes('australia / nz')) locMult = 1.0;
  else if (loc.includes('western europe') || loc.includes('germany') || loc.includes('netherlands') || loc.includes('france') || loc.includes('sweden') || loc.includes('norway') || loc.includes('denmark')) locMult = 0.85;
  else if (loc.includes('eastern europe') || loc.includes('poland') || loc.includes('romania') || loc.includes('ukraine') || loc.includes('bulgaria')) locMult = 0.40;
  else if (loc.includes('south asia') || loc.includes('india') || loc.includes('pakistan') || loc.includes('bangladesh') || loc.includes('sri lanka')) locMult = 0.25;
  else if (loc.includes('southeast asia') || loc.includes('east asia') || loc.includes('middle east')) locMult = 0.30;
  else if (loc.includes('latin america') || loc.includes('brazil') || loc.includes('mexico') || loc.includes('argentina') || loc.includes('colombia')) locMult = 0.35;
  else if (loc.includes('africa')) locMult = 0.25;

  return Math.round(base * expMult * locMult);
}
