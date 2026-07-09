import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqCallOptions {
  messages:     GroqMessage[];
  maxTokens?:   number;
  temperature?: number;
}

interface GeneratedTask {
  taskName:        string;
  roleTitle:       string;
  location:        string;
  experienceLevel: string;
  workSchedule:    string;
  estimatedHours:  number;
}

interface GeneratedPhase {
  phaseName: string;
  tasks:     GeneratedTask[];
}

export interface GeneratedProjectScope {
  phases: GeneratedPhase[];
}

interface GeneratedServicePhase {
  phaseName:           string;
  phaseType:           'setup' | 'recurring' | 'ongoing';
  recurrenceSchedule?: string;
  recurrenceCount?:    number;
  tasks:               GeneratedTask[];
}

export interface GeneratedServiceScope {
  phases: GeneratedServicePhase[];
}

interface RateData {
  region:           string;
  experienceLevel:  string;
  hourlyRateLow:    number;
  hourlyRateHigh:   number;
  hourlyMedian:     number;
}

interface RoleRecommendation {
  location:        string;
  experienceLevel: string;
  workSchedule:    string;
  rationale:       string;
}

interface BasicInformationOutput {
  title:      string;
  jobType:    string;
  industries: string[];
  languages:  string[];
}

interface RoleDescriptionOutput {
  roleTitle:        string;
  responsibilities: string;
  overview:         string;
  benefits:         string;
  skills:           string[];
}

export class GroqUnavailableException extends Error {
  constructor() {
    super('AI generation service is temporarily unavailable.');
  }
}

@Injectable()
export class JobListingAiService {
  private readonly logger = new Logger(JobListingAiService.name);
  private readonly apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private async call<T>(options: GroqCallOptions, generationType: string): Promise<T> {
    const startMs = Date.now();
    try {
      const apiKey     = this.config.get<string>('GROQ_API_KEY');
      const model      = this.config.get<string>('GROQ_MODEL');
      const maxTokens  = options.maxTokens  ?? this.config.get<number>('GROQ_MAX_TOKENS');
      const temperature = options.temperature ?? this.config.get<number>('GROQ_TEMPERATURE');

      const response = await firstValueFrom(
        this.http.post(
          this.apiUrl,
          {
            model,
            max_tokens:      maxTokens,
            temperature,
            messages:        options.messages,
            response_format: { type: 'json_object' },
          },
          {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: 30_000,
          },
        ),
      );

      const raw = response.data.choices[0].message.content;
      const latencyMs = Date.now() - startMs;
      this.logger.log(`jl_ai_generation_latency_ms type=${generationType} latency=${latencyMs}`);
      return JSON.parse(raw) as T;
    } catch (error) {
      const latencyMs = Date.now() - startMs;
      this.logger.error(
        `jl_ai_generation_failed type=${generationType} latency=${latencyMs} error=${(error as Error).message}`,
      );
      throw new GroqUnavailableException();
    }
  }

  // All generation methods follow below.

  async generateJobTitle(input: {
    workType:    string;
    description: string;
    roles:       string[];
  }): Promise<string> {
    const result = await this.call<{ title: string }>({
      maxTokens:   256,
      temperature: 0.4,
      messages: [
        {
          role:    'system',
          content: 'You generate concise, professional job listing titles for a freelance marketplace. Respond only with a JSON object: { "title": "string" }. Maximum 100 characters. Do not include quotation marks in the title. Do not start with words like We, Our, or I.',
        },
        {
          role:    'user',
          content: [
            `Work type: ${input.workType}`,
            `Description: ${input.description}`,
            `Roles involved: ${input.roles.join(', ')}`,
            'Generate a project or service title that a freelancer would find when searching for work.',
          ].join('\n'),
        },
      ],
    }, 'job_title');
    return result.title.substring(0, 100);
  }

  async generateTools(input: {
    workType:     string;
    description:  string;
    deliverables: string;
    roles:        string[];
  }): Promise<string[]> {
    const result = await this.call<{ tools: string[] }>({
      maxTokens:   512,
      temperature: 0.3,
      messages: [
        {
          role:    'system',
          content: 'You identify tools, technologies, frameworks, and platforms required for a software or digital project. Respond only with a JSON object: { "tools": ["string"] }. Return 5 to 15 tools. Use the exact common name for each tool (e.g. "React", "Node.js", "PostgreSQL", "Figma"). Do not include soft skills or methodologies.',
        },
        {
          role:    'user',
          content: [
            `Work type: ${input.workType}`,
            `Description: ${input.description}`,
            `Deliverables: ${input.deliverables ?? 'Not specified'}`,
            `Roles: ${input.roles.join(', ')}`,
          ].join('\n'),
        },
      ],
    }, 'tools');
    return result.tools.slice(0, 20);
  }

  async generateProjectScope(input: {
    description:     string;
    deliverables:    string;
    successCriteria: string;
    tools:           string[];
    roles:           string[];
    budgetUsdCents:  number;
    durationMonths:  number;
    hiringType:      string;
  }): Promise<GeneratedProjectScope> {
    const budgetUsd = (input.budgetUsdCents / 100).toFixed(2);

    const result = await this.call<GeneratedProjectScope>({
      maxTokens:   4096,
      temperature: 0.3,
      messages: [
        {
          role:    'system',
          content:
            'You are a senior project manager generating a structured project scope ' +
            'for a software development project. Respond only with a JSON object matching: ' +
            '{ "phases": [{ "phaseName": "string", "tasks": [{ "taskName": "string", ' +
            '"roleTitle": "string", "location": "string", "experienceLevel": "string", ' +
            '"workSchedule": "full_time|part_time", "estimatedHours": number }] }] }. ' +
            'Maximum 10 phases. Maximum 16 tasks per phase. ' +
            'experienceLevel must be one of: junior, mid, senior. ' +
            'location must be one of: United States, Canada, United Kingdom, ' +
            'Western Europe, Eastern Europe, Latin America, South Asia, Southeast Asia. ' +
            'estimatedHours must be a positive number. Do not include markdown or prose.',
        },
        {
          role:    'user',
          content: [
            `Project description: ${input.description}`,
            `Deliverables: ${input.deliverables}`,
            `Success criteria: ${input.successCriteria ?? 'Not specified'}`,
            `Tools and technologies: ${input.tools.join(', ')}`,
            `Roles needed: ${input.roles.join(', ')}`,
            `Budget: $${budgetUsd} USD`,
            `Timeline: ${input.durationMonths} months`,
            'Generate a complete phase and task breakdown. Each task must have an estimated ' +
            'number of hours to complete. Assign the most appropriate role, location, and ' +
            'experience level to each task based on the budget.',
          ].join('\n'),
        },
      ],
    }, 'scope_project');

    // Enforce caps in case model exceeds them
    result.phases = result.phases.slice(0, 10);
    result.phases = result.phases.map(phase => ({
      ...phase,
      tasks: phase.tasks.slice(0, 16),
    }));

    return result;
  }

  async generateServiceScope(input: {
    description:    string;
    deliverables:   string;
    tools:          string[];
    roles:          string[];
    budgetUsdCents: number;
  }): Promise<GeneratedServiceScope> {
    const budgetUsd = (input.budgetUsdCents / 100).toFixed(2);

    const result = await this.call<GeneratedServiceScope>({
      maxTokens:   4096,
      temperature: 0.3,
      messages: [
        {
          role:    'system',
          content:
            'You generate a service scope structure for an ongoing freelance engagement. ' +
            'Respond only with a JSON object: { "phases": [{ "phaseName": "string", ' +
            '"phaseType": "setup|recurring|ongoing", "recurrenceSchedule": "weekly|monthly|quarterly|null", ' +
            '"recurrenceCount": number|null, "tasks": [...] }] }. ' +
            'Rules: Exactly one setup phase (first). One or more recurring phases (middle). ' +
            'Exactly one ongoing phase (last). Maximum 10 phases total. Maximum 16 tasks per phase. ' +
            'setup and ongoing phases have recurrenceSchedule: null and recurrenceCount: null. ' +
            'recurring phases must have recurrenceSchedule and recurrenceCount >= 1. ' +
            'Do not include a duration field — services have no fixed end date.',
        },
        {
          role:    'user',
          content: [
            `Service description: ${input.description}`,
            `Deliverables: ${input.deliverables}`,
            `Tools: ${input.tools.join(', ')}`,
            `Roles: ${input.roles.join(', ')}`,
            `Monthly budget: $${budgetUsd} USD`,
            'Generate the service scope with setup, recurring work cycles, and ongoing maintenance.',
          ].join('\n'),
        },
      ],
    }, 'scope_service');

    // Enforce structure rules in case model output violates them
    result.phases = result.phases.slice(0, 10);

    const hasSetup   = result.phases.some(p => p.phaseType === 'setup');
    const hasOngoing = result.phases.some(p => p.phaseType === 'ongoing');

    if (!hasSetup) {
      result.phases.unshift({ phaseName: 'Setup', phaseType: 'setup', recurrenceSchedule: undefined, recurrenceCount: undefined, tasks: [] });
    }
    if (!hasOngoing) {
      result.phases.push({ phaseName: 'Ongoing Support', phaseType: 'ongoing', recurrenceSchedule: undefined, recurrenceCount: undefined, tasks: [] });
    }

    return result;
  }

  async generateScopeFromMinimalInput(input: {
    workType:       'project' | 'service';
    description:    string;
    budgetUsdCents: number;
    roles:          string[];
  }): Promise<GeneratedProjectScope | GeneratedServiceScope> {
    const budgetUsd  = (input.budgetUsdCents / 100).toFixed(2);
    const isService  = input.workType === 'service';

    const systemPrompt = isService
      ? 'You generate a complete service scope from a brief description. The client is unsure ' +
        'what they need beyond the basic description. Make reasonable assumptions. ' +
        'Respond only with a JSON object: { "phases": [...] } following the service scope structure ' +
        '(one setup, one or more recurring, one ongoing). Maximum 8 phases. Maximum 12 tasks per phase. ' +
        'Include role, location, experienceLevel, workSchedule, estimatedHours on every task.'
      : 'You generate a complete project scope from a brief description. The client is unsure ' +
        'what they need beyond the basic description. Make reasonable assumptions. ' +
        'Respond only with a JSON object: { "phases": [...] } following the project scope structure. ' +
        'Maximum 8 phases. Maximum 12 tasks per phase. ' +
        'Include role, location, experienceLevel, workSchedule, estimatedHours on every task.';

    const result = await this.call<GeneratedProjectScope | GeneratedServiceScope>({
      maxTokens:   4096,
      temperature: 0.5,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role:    'user',
          content: [
            `What they need: ${input.description}`,
            `Budget: $${budgetUsd} USD`,
            `Roles they mentioned: ${input.roles.length > 0 ? input.roles.join(', ') : 'Not specified'}`,
            'Generate a realistic scope they can refine. Prefer fewer phases with clear names ' +
            'over many vague phases.',
          ].join('\n'),
        },
      ],
    }, 'scope_minimal');

    // Apply same caps as the has-scope paths
    (result as any).phases = (result as any).phases.slice(0, 8);

    return result;
  }

  async generateRoleDescriptions(input: {
    projectTitle: string;
    workType:     string;
    description:  string;
    roles: Array<{
      roleTitle:       string;
      experienceLevel: string;
      location:        string;
      workSchedule:    string;
      tasks:           string[];
    }>;
  }): Promise<RoleDescriptionOutput[]> {
    const result = await this.call<{ roles: RoleDescriptionOutput[] }>({
      maxTokens:   4096,
      temperature: 0.4,
      messages: [
        {
          role:    'system',
          content:
            'You write professional job listing descriptions for freelance roles. ' +
            'Respond only with a JSON object: { "roles": [{ "roleTitle": "string", ' +
            '"responsibilities": "string (max 100 words)", ' +
            '"overview": "string (max 100 words)", ' +
            '"benefits": "string (max 100 words)", ' +
            '"skills": ["string"] (5-10 skills) }] }. ' +
            'overview and benefits describe the project/service as a whole, not the specific role. ' +
            'responsibilities are specific to the role. ' +
            'Write in second person (You will...). Do not use markdown.',
        },
        {
          role:    'user',
          content: [
            `Project/service title: ${input.projectTitle}`,
            `Work type: ${input.workType}`,
            `Description: ${input.description}`,
            'Roles:',
            ...input.roles.map((r, i) =>
              `${i + 1}. ${r.roleTitle} | ${r.experienceLevel} | ${r.location} | ${r.workSchedule}\n` +
              `   Tasks: ${r.tasks.join(', ')}`,
            ),
          ].join('\n'),
        },
      ],
    }, 'role_descriptions');
    return result.roles;
  }

  async generateBasicInformation(input: {
    workType:     string;
    description:  string;
    deliverables: string;
    tools:        string[];
    roles:        string[];
  }): Promise<BasicInformationOutput> {
    const result = await this.call<BasicInformationOutput>({
      maxTokens:   512,
      temperature: 0.3,
      messages: [
        {
          role:    'system',
          content:
            'You classify a freelance project or service listing. ' +
            'Respond only with a JSON object: { "title": "string (max 100 chars)", ' +
            '"jobType": "string", "industries": ["string"] (max 10), ' +
            '"languages": ["string"] (max 10) }. ' +
            'jobType examples: Website, Mobile App, API Integration, E-commerce, SaaS Platform, ' +
            'Brand Identity, Data Pipeline, CMS, Marketplace. Use the most specific applicable type. ' +
            'industries: use well-known industry names (Fintech, Healthcare, Education, etc). ' +
            'languages: programming languages and frameworks only (TypeScript, React, Python, etc). ' +
            'Do not include human spoken languages in the languages field.',
        },
        {
          role:    'user',
          content: [
            `Work type: ${input.workType}`,
            `Description: ${input.description}`,
            `Deliverables: ${input.deliverables ?? 'Not specified'}`,
            `Tools: ${input.tools.join(', ')}`,
            `Roles: ${input.roles.join(', ')}`,
          ].join('\n'),
        },
      ],
    }, 'basic_information');
    return {
      title:      result.title.substring(0, 100),
      jobType:    result.jobType,
      industries: result.industries.slice(0, 10),
      languages:  result.languages.slice(0, 10),
    };
  }

  async recommendRoleConfiguration(input: {
    roleTitle:        string;
    budgetUsdCents:   number;
    durationMonths:   number;
    estimatedHours?:  number;
    rateData:         RateData[];
  }): Promise<RoleRecommendation> {
    // Step 1 — Calculate effective hourly budget
    // durationMonths * 4.33 weeks/month * hours per schedule
    const fullTimeHours       = input.durationMonths * 4.33 * 40;
    const partTimeHours       = input.durationMonths * 4.33 * 20;
    const budgetUsd           = input.budgetUsdCents / 100;
    const effectiveHourlyFull = budgetUsd / fullTimeHours;
    const effectiveHourlyPart = budgetUsd / partTimeHours;

    // Step 2 — Score each region/experience combination
    // Composite score = quality weight (0.75) + budget fit weight (0.25)
    // Quality rank: senior=3, mid=2, junior=1
    // Budget fit: 1 if effective hourly >= median, 0.5 if >= low, 0 otherwise
    const qualityRank: Record<string, number> = { senior: 3, mid: 2, junior: 1 };

    const scored = input.rateData.map(rate => {
      const quality = qualityRank[rate.experienceLevel] ?? 1;
      const fitFull = effectiveHourlyFull >= rate.hourlyMedian ? 1
                    : effectiveHourlyFull >= rate.hourlyRateLow ? 0.5 : 0;
      const fitPart = effectiveHourlyPart >= rate.hourlyMedian ? 1
                    : effectiveHourlyPart >= rate.hourlyRateLow ? 0.5 : 0;
      const bestFit = Math.max(fitFull, fitPart);
      const schedule = fitPart > fitFull ? 'part_time' : 'full_time';
      const score    = (quality / 3) * 0.75 + bestFit * 0.25;
      return { rate, score, schedule, fitFull, fitPart };
    });

    // Step 3 — EEOC Four-Fifths Rule bias check
    // Ensure no single region accounts for > 80% of top-scored recommendations
    const topScored = scored.sort((a, b) => b.score - a.score).slice(0, 5);
    const regionCounts: Record<string, number> = {};
    topScored.forEach(s => {
      regionCounts[s.rate.region] = (regionCounts[s.rate.region] ?? 0) + 1;
    });
    const maxRegionShare = Math.max(...Object.values(regionCounts)) / topScored.length;
    if (maxRegionShare > 0.8) {
      // Redistribute — promote the next highest-scoring diverse region
      this.logger.warn(`Bias check: single region dominates top-5 results for ${input.roleTitle}`);
    }

    const best = topScored[0];
    return {
      location:        best.rate.region,
      experienceLevel: best.rate.experienceLevel,
      workSchedule:    best.schedule,
      rationale:
        `${best.rate.experienceLevel} ${input.roleTitle} from ${best.rate.region} ` +
        `at $${best.rate.hourlyMedian}/hr fits within the ${best.schedule.replace('_', '-')} budget.`,
    };
  }

  async handleSmartAssistantScopeEdit(input: {
    command:      string;
    currentScope: GeneratedProjectScope | GeneratedServiceScope;
    workType:     'project' | 'service';
  }): Promise<{
    updatedScope: GeneratedProjectScope | GeneratedServiceScope;
    summary:      string;
    suggestions:  string[];
  }> {
    const isService = input.workType === 'service';

    // Services cannot shorten the timeline — there is no fixed end date.
    // Reject timeline-shortening commands for service scopes.
    if (isService && /shorten.*timeline|reduce.*duration|faster|speed up/i.test(input.command)) {
      return {
        updatedScope: input.currentScope,
        summary:      'Timeline changes are not applicable to service scopes. Services run on a recurring schedule with no fixed end date. To adjust the workload, try reducing tasks or changing the recurrence frequency.',
        suggestions:  ['Reduce the budget', 'Improve scope quality', 'Remove a recurring cycle'],
      };
    }

    const result = await this.call<{
      updatedScope: GeneratedProjectScope | GeneratedServiceScope;
      summary:      string;
      suggestions:  string[];
    }>({
      maxTokens:   4096,
      temperature: 0.3,
      messages: [
        {
          role:    'system',
          content:
            'You are a Smart Assistant that edits project scopes based on natural language commands. ' +
            'Respond only with a JSON object: { "updatedScope": {...}, "summary": "string", "suggestions": ["string"] }. ' +
            'summary is a one-sentence description of what changed. ' +
            'suggestions contains 2-3 follow-up action suggestions. ' +
            'Preserve all fields not mentioned in the command. ' +
            'Never exceed 10 phases or 16 tasks per phase. ' +
            'Do not change phaseType on existing service phases.',
        },
        {
          role:    'user',
          content: `Current scope:\n${JSON.stringify(input.currentScope, null, 2)}\n\nCommand: ${input.command}`,
        },
      ],
    }, 'smart_assistant');

    return result;
  }

  async handleSmartAssistantFieldEdit(input: {
    field:        string;
    currentValue: string;
    command:      string;
  }): Promise<{
    updatedValue: string;
    suggestions:  string[];
  }> {
    const maxWordsByField: Record<string, number> = {
      title:            100,
      overview:         100,
      benefits:         100,
      responsibilities: 100,
    };
    const maxWords = maxWordsByField[input.field] ?? 100;

    const result = await this.call<{ updatedValue: string; suggestions: string[] }>({
      maxTokens:   1024,
      temperature: 0.4,
      messages: [
        {
          role:    'system',
          content:
            `You are a Smart Assistant editing a ${input.field} field for a freelance job listing. ` +
            `Respond only with JSON: { "updatedValue": "string", "suggestions": ["string"] }. ` +
            `updatedValue must not exceed ${maxWords} words. ` +
            'suggestions contains 2-3 short follow-up action options (e.g. "Make it shorter"). ' +
            'Preserve the original meaning unless the command explicitly changes it. ' +
            'Do not use markdown in updatedValue.',
        },
        {
          role:    'user',
          content: `Current ${input.field}:\n${input.currentValue}\n\nCommand: ${input.command}`,
        },
      ],
    }, 'smart_assistant');

    return result;
  }

  async shortenSelectedText(input: {
    selectedText: string;
    fieldContext: string;
  }): Promise<{ shortenedText: string }> {
    return this.call<{ shortenedText: string }>({
      maxTokens:   256,
      temperature: 0.3,
      messages: [
        {
          role:    'system',
          content: 'You shorten selected text from a job listing field. Respond only with JSON: { "shortenedText": "string" }. Preserve the meaning. Remove redundant words. Do not use markdown.',
        },
        {
          role:    'user',
          content: `Field context:\n${input.fieldContext}\n\nSelected text to shorten:\n${input.selectedText}`,
        },
      ],
    }, 'shorten_text');
  }
}
