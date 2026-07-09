import { MigrationInterface, QueryRunner } from 'typeorm';

// Inline the pricing logic so the migration is self-contained and won't
// break if the utility functions change in the future.

const POPULAR_REGION: Record<string, string> = {
  architect: 'Eastern Europe',
  'machine learning': 'South Asia',
  'data scientist': 'South Asia',
  'data engineer': 'South Asia',
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
  'product manager': 'Latin America',
  'project manager': 'Latin America',
  'business analyst': 'Eastern Europe',
  consultant: 'Eastern Europe',
};

function regionForRole(roleName: string): string {
  const r = (roleName || '').toLowerCase();
  for (const [kw, region] of Object.entries(POPULAR_REGION)) {
    if (r.includes(kw)) return region;
  }
  return 'Eastern Europe';
}

function rateForTask(roleName: string, experienceLevel: string, location?: string): number {
  const role = (roleName || '').toLowerCase();
  const exp = (experienceLevel || 'medior').toLowerCase();
  const loc = (location || regionForRole(roleName)).toLowerCase();

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
  if (loc.includes('united states') || loc.includes('canada') || loc.includes('united kingdom') || loc.includes('australia')) locMult = 1.0;
  else if (loc.includes('western europe') || loc.includes('germany') || loc.includes('netherlands') || loc.includes('france') || loc.includes('sweden') || loc.includes('norway') || loc.includes('denmark')) locMult = 0.85;
  else if (loc.includes('eastern europe') || loc.includes('poland') || loc.includes('romania') || loc.includes('ukraine') || loc.includes('bulgaria')) locMult = 0.40;
  else if (loc.includes('south asia') || loc.includes('india') || loc.includes('pakistan') || loc.includes('bangladesh') || loc.includes('sri lanka')) locMult = 0.25;
  else if (loc.includes('southeast asia') || loc.includes('east asia') || loc.includes('middle east')) locMult = 0.30;
  else if (loc.includes('latin america') || loc.includes('brazil') || loc.includes('mexico') || loc.includes('argentina') || loc.includes('colombia')) locMult = 0.35;
  else if (loc.includes('africa')) locMult = 0.25;

  return Math.round(base * expMult * locMult);
}

interface ScopeTask {
  title: string;
  roleName: string;
  experienceLevel: string;
  estimatedHours: number;
  location?: string[];
}

interface ScopePhase {
  phaseName: string;
  order: number;
  tasks: ScopeTask[];
}

export class RecalculateProjectBudgets1792000000000 implements MigrationInterface {
  name = 'RecalculateProjectBudgets1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const projects: Array<{ id: string; scope: ScopePhase[] }> = await queryRunner.query(
      `SELECT id, scope FROM listings.project WHERE scope IS NOT NULL AND scope != '[]'::jsonb`,
    );

    let updated = 0;
    for (const project of projects) {
      const scope = project.scope;
      if (!Array.isArray(scope) || scope.length === 0) continue;

      let scopeChanged = false;
      let totalCost = 0;

      for (const phase of scope) {
        if (!Array.isArray(phase.tasks)) continue;
        for (const task of phase.tasks) {
          // If the task has no location, assign the most popular
          // sourcing region for this role type.
          if (!task.location || (Array.isArray(task.location) && task.location.length === 0)) {
            task.location = [regionForRole(task.roleName)];
            scopeChanged = true;
          }

          const hours = Number.isFinite(task.estimatedHours) ? Number(task.estimatedHours) : 0;
          if (hours <= 0) continue;
          const loc = Array.isArray(task.location) ? task.location[0] : undefined;
          totalCost += hours * rateForTask(task.roleName, task.experienceLevel, loc);
        }
      }

      const budget = Math.round(totalCost * 100) / 100;

      if (scopeChanged) {
        // Update both scope (with locations) and budget
        await queryRunner.query(
          `UPDATE listings.project SET scope = $1, budget = $2 WHERE id = $3`,
          [JSON.stringify(scope), budget, project.id],
        );
      } else {
        // Only update budget (tasks already had locations)
        await queryRunner.query(
          `UPDATE listings.project SET budget = $1 WHERE id = $2`,
          [budget, project.id],
        );
      }
      updated++;
    }

    // eslint-disable-next-line no-console
    console.log(`RecalculateProjectBudgets: updated ${updated} of ${projects.length} projects`);
  }

  public async down(): Promise<void> {
    // Budget values before this migration are not stored — cannot revert.
    // The old rates produced inflated budgets that were not realistic.
  }
}
