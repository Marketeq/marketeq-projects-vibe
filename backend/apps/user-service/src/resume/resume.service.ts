import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Education } from '../education/education.entity';
import { Experience } from '../experience/experience.entity';
import { Certification } from '../certifications/certifications.entity';
import { Skill } from '../skills/skills.entity';
import { Industry } from '../industries/industries.entity';
import { R2Service } from '../storage/r2.service';
import { Resume } from './entities/resume.entity';
import { ResumeVersion } from './entities/resume-version.entity';
import { ParseResult } from './entities/parse-result.entity';
import { SyncAudit } from './entities/sync-audit.entity';
import { ApplyResumeDto } from './dto/apply-resume.dto';
import * as FormData from 'form-data';
import axios from 'axios';

const MAX_VERSIONS = 4;
const SKILLS_PROFILE_LIMIT = 100;
const CONFIDENCE_THRESHOLD = 0.7;

export interface ConflictEntry {
  type: 'education' | 'work' | 'certification';
  existingId: string;
  existing: { label: string; detail: string };
  incoming: { label: string; detail: string; company?: string; startDate?: string; endDate?: string; degree?: string; fieldOfStudy?: string; issuer?: string };
}

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);
  private readonly parsingServiceUrl: string;
  private readonly parsingServiceToken: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Education)
    private readonly educationRepo: Repository<Education>,
    @InjectRepository(Experience)
    private readonly experienceRepo: Repository<Experience>,
    @InjectRepository(Certification)
    private readonly certificationRepo: Repository<Certification>,
    @InjectRepository(Skill)
    private readonly skillRepo: Repository<Skill>,
    @InjectRepository(Resume)
    private readonly resumeRepo: Repository<Resume>,
    @InjectRepository(ResumeVersion)
    private readonly versionRepo: Repository<ResumeVersion>,
    @InjectRepository(ParseResult)
    private readonly parseResultRepo: Repository<ParseResult>,
    @InjectRepository(SyncAudit)
    private readonly syncAuditRepo: Repository<SyncAudit>,
    @InjectRepository(Industry)
    private readonly industryRepo: Repository<Industry>,
    private readonly r2Service: R2Service,
  ) {
    this.parsingServiceUrl =
      process.env.RESUME_PARSING_SERVICE_URL || 'http://localhost:3028';
    this.parsingServiceToken = process.env.SERVICE_AUTH_TOKEN || '';
  }

  private getUserId(user: any): string {
    return user?.userId || user?.sub || user?.id;
  }

  // ──────────────────────────────────────────────
  // Upload + Parse
  // ──────────────────────────────────────────────
  async uploadAndParse(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const ext = file.originalname
      .substring(file.originalname.lastIndexOf('.'))
      .toLowerCase();
    const allowedExts = ['.pdf', '.doc', '.docx'];
    if (!allowedExts.includes(ext)) {
      throw new BadRequestException(
        'Unsupported file type. Only PDF, DOC, and DOCX are accepted.',
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Uploaded file exceeds the size limit of 5MB.');
    }

    // Get or create resume record (one per user)
    let resume = await this.resumeRepo.findOne({ where: { userId } });
    if (!resume) {
      resume = await this.resumeRepo.save(
        this.resumeRepo.create({ userId, status: 'uploading' }),
      );
    } else {
      await this.resumeRepo.update(resume.id, { status: 'uploading' });
    }

    // Upload to R2
    const storageKey = `resumes/${userId}/${Date.now()}${ext}`;
    await this.r2Service.uploadBuffer(storageKey, file.buffer, file.mimetype);

    // Determine version number
    const existingVersions = await this.versionRepo.find({
      where: { resumeId: resume.id },
      order: { versionNumber: 'DESC' },
    });
    const nextVersion = existingVersions.length > 0
      ? existingVersions[0].versionNumber + 1
      : 1;

    // Create version record
    const version = await this.versionRepo.save(
      this.versionRepo.create({
        resumeId: resume.id,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        storageKey,
        versionNumber: nextVersion,
      }),
    );

    // Enforce max versions (keep 4 most recent)
    if (existingVersions.length >= MAX_VERSIONS) {
      const toDelete = existingVersions.slice(MAX_VERSIONS - 1);
      for (const old of toDelete) {
        await this.versionRepo.remove(old);
      }
    }

    // Update resume to point to new version
    await this.resumeRepo.update(resume.id, {
      currentVersionId: version.id,
      status: 'parsing',
    });

    // Call resume-parsing-service
    let parseResponse: any;
    try {
      parseResponse = await this.callParsingService(file, userId);
    } catch (err) {
      this.logger.error(`Parsing service call failed: ${err instanceof Error ? err.message : err}`);
      await this.resumeRepo.update(resume.id, { status: 'parse_failed' });
      throw new HttpException(
        'We couldn\'t read your resume just now. Your profile hasn\'t been changed.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const result = parseResponse.result;
    const meta = parseResponse.meta;

    // Store parse result
    const parseResult = await this.parseResultRepo.save(
      this.parseResultRepo.create({
        versionId: version.id,
        userId,
        documentType: result.document_type,
        isResume: result.is_resume,
        confidence: result.confidence,
        extractedName: result.name,
        jobTitles: result.job_titles || [],
        skills: result.skills || [],
        workExperience: result.work_experience || [],
        education: result.education || [],
        certifications: result.certifications || [],
        processingMs: meta?.processingMs,
        modelAttempts: meta?.modelAttempts,
        truncated: meta?.truncated || false,
        reviewStatus: 'pending',
      }),
    );

    // Classification gate
    if (!result.is_resume || result.confidence < CONFIDENCE_THRESHOLD) {
      await this.resumeRepo.update(resume.id, { status: 'not_a_resume' });
      return {
        status: 'not_a_resume',
        documentType: result.document_type,
        confidence: result.confidence,
        parseResultId: parseResult.id,
        resumeId: resume.id,
      };
    }

    // Check if nothing was extracted
    const hasContent =
      (result.skills?.length || 0) > 0 ||
      (result.work_experience?.length || 0) > 0 ||
      (result.education?.length || 0) > 0 ||
      (result.certifications?.length || 0) > 0 ||
      (result.job_titles?.length || 0) > 0;

    if (!hasContent) {
      await this.resumeRepo.update(resume.id, { status: 'nothing_found' });
      return {
        status: 'nothing_found',
        parseResultId: parseResult.id,
        resumeId: resume.id,
        fileName: file.originalname,
        uploadedAt: version.uploadedAt,
      };
    }

    // Name mismatch detection
    const user = await this.userRepo.findOne({ where: { id: userId } });
    let nameMismatch = false;
    if (result.name && user) {
      const profileName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
      const extractedName = result.name.trim().toLowerCase();
      // Check if the extracted name shares at least one word with the profile name
      const profileWords = profileName.split(/\s+/).filter((w: string) => w.length > 1);
      const extractedWords = extractedName.split(/\s+/).filter((w: string) => w.length > 1);
      const hasOverlap = profileWords.some((pw: string) => extractedWords.some((ew: string) => ew === pw));
      nameMismatch = !hasOverlap;
    }

    // Detect conflicts
    const conflicts = await this.detectConflicts(userId, result);

    // Build summary of additions (non-conflicting items)
    const additions = this.buildAdditionsSummary(result, conflicts);

    await this.resumeRepo.update(resume.id, { status: 'ready_for_review' });
    await this.parseResultRepo.update(parseResult.id, { reviewStatus: 'pending' });

    return {
      status: 'ready_for_review',
      parseResultId: parseResult.id,
      resumeId: resume.id,
      fileName: file.originalname,
      uploadedAt: version.uploadedAt,
      extractedName: result.name,
      nameMismatch,
      additions,
      conflicts,
      jobTitles: result.job_titles || [],
      confidence: result.confidence,
    };
  }

  // ──────────────────────────────────────────────
  // Call resume-parsing-service
  // ──────────────────────────────────────────────
  private async callParsingService(
    file: Express.Multer.File,
    correlationId: string,
  ): Promise<any> {
    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const headers: Record<string, string> = {
      ...form.getHeaders(),
      'x-correlation-id': correlationId,
      'x-idempotency-key': `${correlationId}-${Date.now()}`,
    };

    if (this.parsingServiceToken) {
      headers['authorization'] = `Bearer ${this.parsingServiceToken}`;
    }

    const response = await axios.post(
      `${this.parsingServiceUrl}/v1/parse`,
      form,
      {
        headers,
        timeout: 120000,
        maxContentLength: 10 * 1024 * 1024,
      },
    );

    return response.data;
  }

  // ──────────────────────────────────────────────
  // Conflict Detection
  // ──────────────────────────────────────────────
  async detectConflicts(
    userId: string,
    parsed: any,
  ): Promise<ConflictEntry[]> {
    const conflicts: ConflictEntry[] = [];

    // Work experience: company + title + start date
    if (parsed.work_experience?.length) {
      const existingExp = await this.experienceRepo.find({ where: { userId } });
      for (const newExp of parsed.work_experience) {
        if (!newExp.job_title && !newExp.company) continue;
        const match = existingExp.find((e) => {
          const titleMatch =
            (e.title || '').toLowerCase() === (newExp.job_title || '').toLowerCase();
          const companyMatch =
            (e.company || '').toLowerCase() === (newExp.company || '').toLowerCase();
          return titleMatch && companyMatch;
        });
        if (match) {
          conflicts.push({
            type: 'work',
            existingId: match.id,
            existing: {
              label: match.title,
              detail: `${match.company}${match.startDate ? ' - ' + this.formatDate(match.startDate) : ''}`,
            },
            incoming: {
              label: newExp.job_title || '',
              detail: `${newExp.company || ''}${newExp.start_date ? ' - ' + newExp.start_date : ''}`,
              company: newExp.company || '',
              startDate: newExp.start_date || undefined,
              endDate: newExp.end_date || undefined,
            },
          });
        }
      }
    }

    // Education: institution + degree + field
    if (parsed.education?.length) {
      const existingEdu = await this.educationRepo.find({ where: { userId } });
      for (const newEdu of parsed.education) {
        if (!newEdu.institution && !newEdu.degree) continue;
        const match = existingEdu.find((e) => {
          const instMatch =
            (e.school || '').toLowerCase() === (newEdu.institution || '').toLowerCase();
          const degreeMatch =
            (e.degree || '').toLowerCase() === (newEdu.degree || '').toLowerCase();
          return instMatch && degreeMatch;
        });
        if (match) {
          conflicts.push({
            type: 'education',
            existingId: match.id,
            existing: {
              label: match.school,
              detail: `${match.degree}${match.fieldOfStudy ? ' - ' + match.fieldOfStudy : ''}`,
            },
            incoming: {
              label: newEdu.institution || '',
              detail: `${newEdu.degree || ''}${newEdu.field_of_study ? ' - ' + newEdu.field_of_study : ''}`,
              degree: newEdu.degree || undefined,
              fieldOfStudy: newEdu.field_of_study || undefined,
            },
          });
        }
      }
    }

    // Certifications: name
    if (parsed.certifications?.length) {
      const existingCerts = await this.certificationRepo.find({ where: { userId } });
      for (const newCert of parsed.certifications) {
        if (!newCert.name) continue;
        const match = existingCerts.find(
          (c) => (c.name || '').toLowerCase() === newCert.name.toLowerCase(),
        );
        if (match) {
          conflicts.push({
            type: 'certification',
            existingId: match.id,
            existing: {
              label: match.name,
              detail: match.issuer || '',
            },
            incoming: {
              label: newCert.name,
              detail: newCert.issuing_body || '',
              issuer: newCert.issuing_body || undefined,
            },
          });
        }
      }
    }

    return conflicts;
  }

  // ──────────────────────────────────────────────
  // Apply Resume Data (additions + per-entry conflicts)
  // ──────────────────────────────────────────────
  async applyResumeData(userId: string, dto: ApplyResumeDto) {
    const counts = {
      skills: 0,
      education: 0,
      workExperience: 0,
      certifications: 0,
      jobTitle: false,
    };

    const parseResultId = dto.parseResultId;
    let parseResult: ParseResult | null = null;
    if (parseResultId) {
      parseResult = await this.parseResultRepo.findOne({
        where: { id: parseResultId, userId },
      });
    }

    // Build set of conflict resolutions for per-entry control
    const resolutions = new Map<string, boolean>();
    if (dto.conflictResolutions?.length) {
      for (const cr of dto.conflictResolutions) {
        resolutions.set(cr.existingId, cr.applyUpdate);
      }
    }

    // ── Skills (deduplicated, up to profile limit of 100) ──
    if (dto.skills?.length) {
      const existingSkills = await this.skillRepo.find({ where: { userId } });
      const existingNames = new Set(
        existingSkills.map((s) => s.name.toLowerCase().trim()),
      );
      const currentCount = existingSkills.length;
      let added = 0;

      for (const skill of dto.skills) {
        const normalizedName = skill.name.toLowerCase().trim();
        if (existingNames.has(normalizedName)) continue;
        if (currentCount + added >= SKILLS_PROFILE_LIMIT) break;

        const saved = await this.skillRepo.save(
          this.skillRepo.create({
            name: skill.name.trim(),
            proficiency: skill.proficiency,
            userId,
          }),
        );

        if (parseResultId) {
          await this.createAuditEntry(userId, parseResultId, 'skill', 'added', saved.id, null, {
            name: skill.name,
          });
        }

        existingNames.add(normalizedName);
        added++;
        counts.skills++;
      }
    }

    // ── Education ──
    if (dto.education?.length) {
      const existingEdu = await this.educationRepo.find({ where: { userId } });

      for (const edu of dto.education) {
        // Find conflict
        const conflict = existingEdu.find(
          (e) =>
            e.school.toLowerCase() === edu.school.toLowerCase() &&
            e.degree.toLowerCase() === edu.degree.toLowerCase(),
        );

        if (conflict) {
          // Per-entry resolution or replaceConflicts flag
          const shouldReplace =
            resolutions.get(conflict.id) ?? dto.replaceConflicts ?? false;

          if (shouldReplace) {
            const previousData = { ...conflict };
            await this.educationRepo.update(conflict.id, {
              fieldOfStudy: edu.fieldOfStudy || conflict.fieldOfStudy,
              startYear: edu.startYear || conflict.startYear,
              endYear: edu.endYear ?? conflict.endYear,
              startMonth: edu.startMonth ?? conflict.startMonth,
              endMonth: edu.endMonth ?? conflict.endMonth,
              currentlyStudying: edu.currentlyStudying ?? conflict.currentlyStudying,
            });
            if (parseResultId) {
              await this.createAuditEntry(
                userId, parseResultId, 'education', 'replaced',
                conflict.id, previousData, edu,
              );
            }
            counts.education++;
          } else {
            if (parseResultId) {
              await this.createAuditEntry(
                userId, parseResultId, 'education', 'kept',
                conflict.id, null, null,
              );
            }
          }
        } else {
          // Addition: apply immediately
          const saved = await this.educationRepo.save(
            this.educationRepo.create({
              school: edu.school,
              degree: edu.degree,
              fieldOfStudy: edu.fieldOfStudy || '',
              startYear: edu.startYear || new Date().getFullYear(),
              startMonth: edu.startMonth,
              endYear: edu.endYear,
              endMonth: edu.endMonth,
              currentlyStudying: edu.currentlyStudying || false,
              userId,
            }),
          );
          if (parseResultId) {
            await this.createAuditEntry(
              userId, parseResultId, 'education', 'added',
              saved.id, null, edu,
            );
          }
          counts.education++;
        }
      }
    }

    // ── Work Experience ──
    if (dto.workExperience?.length) {
      const existingExp = await this.experienceRepo.find({ where: { userId } });

      for (const exp of dto.workExperience) {
        // Match on: exact company+title, same company with overlapping dates,
        // OR same company with identical description
        const conflict = existingExp.find((e) => {
          const sameCompany = e.company.toLowerCase() === exp.company.toLowerCase();
          if (!sameCompany) return false;

          // Exact title match is always a conflict
          if (e.title.toLowerCase() === exp.title.toLowerCase()) return true;

          // Same company, same description = duplicate role the LLM split
          if (e.description && exp.description &&
              e.description.trim().toLowerCase() === exp.description.trim().toLowerCase()) {
            return true;
          }

          // Same company, different title: check if dates overlap or are within 1 year
          const existingStart = e.startDate ? new Date(e.startDate).getTime() : 0;
          const existingEnd = e.endDate ? new Date(e.endDate).getTime() : Date.now();
          const newStart = exp.startDate ? new Date(exp.startDate).getTime() : 0;
          const newEnd = exp.endDate ? new Date(exp.endDate).getTime() : Date.now();
          const ONE_YEAR = 365 * 24 * 60 * 60 * 1000;

          // Overlap: one starts before the other ends (with 1-year buffer)
          return existingStart <= newEnd + ONE_YEAR && newStart <= existingEnd + ONE_YEAR;
        });

        if (conflict) {
          const shouldReplace =
            resolutions.get(conflict.id) ?? dto.replaceConflicts ?? false;

          // Always backfill description if the existing entry has none
          const needsDescriptionBackfill = !conflict.description && exp.description;

          if (shouldReplace || needsDescriptionBackfill) {
            const previousData = { ...conflict };
            const updateFields: any = {};
            if (shouldReplace) {
              updateFields.location = exp.location || conflict.location;
              updateFields.startDate = exp.startDate ? new Date(exp.startDate) : conflict.startDate;
              updateFields.endDate = exp.endDate ? new Date(exp.endDate) : conflict.endDate;
              updateFields.isCurrentRole = exp.isCurrentRole ?? conflict.isCurrentRole;
              updateFields.description = exp.description || conflict.description;
            } else {
              // Only backfill the description
              updateFields.description = exp.description;
            }
            await this.experienceRepo.update(conflict.id, updateFields);
            if (parseResultId) {
              await this.createAuditEntry(
                userId, parseResultId, 'experience',
                shouldReplace ? 'replaced' : 'backfilled',
                conflict.id, previousData, exp,
              );
            }
            counts.workExperience++;
          } else {
            if (parseResultId) {
              await this.createAuditEntry(
                userId, parseResultId, 'experience', 'kept',
                conflict.id, null, null,
              );
            }
          }
        } else {
          const saved = await this.experienceRepo.save(
            this.experienceRepo.create({
              title: exp.title,
              company: exp.company,
              location: exp.location,
              startDate: exp.startDate ? new Date(exp.startDate) : new Date(),
              endDate: exp.endDate ? new Date(exp.endDate) : undefined,
              isCurrentRole: exp.isCurrentRole || false,
              description: exp.description,
              userId,
            }),
          );
          if (parseResultId) {
            await this.createAuditEntry(
              userId, parseResultId, 'experience', 'added',
              saved.id, null, exp,
            );
          }
          counts.workExperience++;
        }
      }
    }

    // ── Certifications ──
    if (dto.certifications?.length) {
      const existingCerts = await this.certificationRepo.find({
        where: { userId },
      });

      for (const cert of dto.certifications) {
        const conflict = existingCerts.find(
          (c) => c.name.toLowerCase() === cert.name.toLowerCase(),
        );

        if (conflict) {
          const shouldReplace =
            resolutions.get(conflict.id) ?? dto.replaceConflicts ?? false;

          if (shouldReplace) {
            const previousData = { ...conflict };
            await this.certificationRepo.update(conflict.id, {
              issuer: cert.issuer || conflict.issuer,
              issueDate: cert.issueDate
                ? new Date(cert.issueDate)
                : conflict.issueDate,
            });
            if (parseResultId) {
              await this.createAuditEntry(
                userId, parseResultId, 'certification', 'replaced',
                conflict.id, previousData, cert,
              );
            }
            counts.certifications++;
          } else {
            if (parseResultId) {
              await this.createAuditEntry(
                userId, parseResultId, 'certification', 'kept',
                conflict.id, null, null,
              );
            }
          }
        } else {
          const saved = await this.certificationRepo.save(
            this.certificationRepo.create({
              name: cert.name,
              issuer: cert.issuer || '',
              issueDate: cert.issueDate
                ? new Date(cert.issueDate)
                : new Date(),
              userId,
            }),
          );
          if (parseResultId) {
            await this.createAuditEntry(
              userId, parseResultId, 'certification', 'added',
              saved.id, null, cert,
            );
          }
          counts.certifications++;
        }
      }
    }

    // ── Industries (deduplicated) ──
    if (dto.industries?.length) {
      const existingIndustries = await this.industryRepo.find({ where: { userId } });
      const existingNames = new Set(
        existingIndustries.map((i) => i.industry.toLowerCase().trim()),
      );

      for (const ind of dto.industries) {
        const normalizedName = ind.name.toLowerCase().trim();
        if (existingNames.has(normalizedName)) continue;

        const saved = await this.industryRepo.save(
          this.industryRepo.create({
            industry: ind.name.trim(),
            userId,
          }),
        );

        if (parseResultId) {
          await this.createAuditEntry(userId, parseResultId, 'industry', 'added', saved.id, null, {
            name: ind.name,
          });
        }

        existingNames.add(normalizedName);
      }
    }

    // ── Job Title: most recent only, one empty slot, never overwrite ──
    if (parseResult?.jobTitles?.length) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (user) {
        const currentTitles: any[] = user.jobTitles || [];
        // Find first empty slot (up to 3 slots)
        const emptySlotIndex = currentTitles.findIndex(
          (t) => !t || !t.title || t.title.trim() === '',
        );
        if (emptySlotIndex >= 0 || currentTitles.length < 3) {
          const mostRecentTitle = parseResult.jobTitles[0];
          if (emptySlotIndex >= 0) {
            currentTitles[emptySlotIndex] = {
              ...currentTitles[emptySlotIndex],
              title: mostRecentTitle,
            };
          } else {
            currentTitles.push({ title: mostRecentTitle });
          }
          await this.userRepo.update(userId, { jobTitles: currentTitles });
          counts.jobTitle = true;

          if (parseResultId) {
            await this.createAuditEntry(
              userId, parseResultId, 'job_title', 'added',
              null, null, { title: mostRecentTitle },
            );
          }
        }
      }
    }

    // Mark parse result as applied
    if (parseResultId) {
      await this.parseResultRepo.update(parseResultId, { reviewStatus: 'applied' });
      // Update resume status
      const resume = await this.resumeRepo.findOne({ where: { userId } });
      if (resume) {
        await this.resumeRepo.update(resume.id, { status: 'applied' });
      }
    }

    return { applied: counts };
  }

  // ──────────────────────────────────────────────
  // Undo (reverse all sync actions from a parse result)
  // ──────────────────────────────────────────────
  async undoImport(userId: string, parseResultId: string) {
    const audits = await this.syncAuditRepo.find({
      where: { userId, parseResultId },
      order: { createdAt: 'DESC' },
    });

    if (audits.length === 0) {
      throw new NotFoundException('No import to undo');
    }

    let undoneCount = 0;

    for (const audit of audits) {
      if (audit.action === 'undone' || audit.action === 'kept') continue;

      if (audit.action === 'added' && audit.entityId) {
        // Remove the added entity
        switch (audit.entityType) {
          case 'skill':
            await this.skillRepo.delete(audit.entityId);
            break;
          case 'education':
            await this.educationRepo.delete(audit.entityId);
            break;
          case 'experience':
            await this.experienceRepo.delete(audit.entityId);
            break;
          case 'certification':
            await this.certificationRepo.delete(audit.entityId);
            break;
          case 'job_title':
            // Revert job title by removing it
            const user = await this.userRepo.findOne({ where: { id: userId } });
            if (user && audit.newData) {
              const titles: any[] = user.jobTitles || [];
              const idx = titles.findIndex(
                (t) => t?.title === (audit.newData as any)?.title,
              );
              if (idx >= 0) {
                titles[idx] = { ...titles[idx], title: '' };
                await this.userRepo.update(userId, { jobTitles: titles });
              }
            }
            break;
        }
        undoneCount++;
      } else if (audit.action === 'replaced' && audit.entityId && audit.previousData) {
        // Restore previous data
        switch (audit.entityType) {
          case 'education':
            await this.educationRepo.update(audit.entityId, audit.previousData);
            break;
          case 'experience':
            await this.experienceRepo.update(audit.entityId, audit.previousData);
            break;
          case 'certification':
            await this.certificationRepo.update(audit.entityId, audit.previousData);
            break;
        }
        undoneCount++;
      }

      // Mark audit entry as undone
      await this.syncAuditRepo.update(audit.id, { action: 'undone' });
    }

    // Update statuses
    await this.parseResultRepo.update(parseResultId, { reviewStatus: 'undone' });
    const resume = await this.resumeRepo.findOne({ where: { userId } });
    if (resume) {
      await this.resumeRepo.update(resume.id, { status: 'applied' });
    }

    return { undone: undoneCount };
  }

  // ──────────────────────────────────────────────
  // Get Resume Status
  // ──────────────────────────────────────────────
  async getResumeStatus(userId: string) {
    const resume = await this.resumeRepo.findOne({ where: { userId } });
    if (!resume) {
      return { status: 'none' };
    }

    const currentVersion = resume.currentVersionId
      ? await this.versionRepo.findOne({ where: { id: resume.currentVersionId } })
      : null;

    const parseResult = currentVersion
      ? await this.parseResultRepo.findOne({
          where: { versionId: currentVersion.id },
        })
      : null;

    return {
      status: resume.status,
      resumeId: resume.id,
      fileName: currentVersion?.fileName,
      fileSize: currentVersion?.fileSize,
      uploadedAt: currentVersion?.uploadedAt,
      versionNumber: currentVersion?.versionNumber,
      parseResultId: parseResult?.id,
      reviewStatus: parseResult?.reviewStatus,
      extractedName: parseResult?.extractedName,
      confidence: parseResult?.confidence,
    };
  }

  // ──────────────────────────────────────────────
  // Get pending parse result for review re-entry
  // ──────────────────────────────────────────────
  async getPendingReview(userId: string) {
    const resume = await this.resumeRepo.findOne({ where: { userId } });
    if (!resume || !resume.currentVersionId) return null;

    const parseResult = await this.parseResultRepo.findOne({
      where: { userId, reviewStatus: 'pending' },
      order: { parsedAt: 'DESC' },
    });

    if (!parseResult) return null;

    const conflicts = await this.detectConflicts(userId, {
      work_experience: parseResult.workExperience,
      education: parseResult.education,
      certifications: parseResult.certifications,
    });

    const additions = this.buildAdditionsSummary(
      {
        skills: parseResult.skills,
        work_experience: parseResult.workExperience,
        education: parseResult.education,
        certifications: parseResult.certifications,
        job_titles: parseResult.jobTitles,
      },
      conflicts,
    );

    return {
      parseResultId: parseResult.id,
      extractedName: parseResult.extractedName,
      additions,
      conflicts,
      jobTitles: parseResult.jobTitles,
      confidence: parseResult.confidence,
    };
  }

  // ──────────────────────────────────────────────
  // View / Download resume
  // ──────────────────────────────────────────────
  async getResumeViewUrl(userId: string): Promise<string> {
    const resume = await this.resumeRepo.findOne({ where: { userId } });
    if (!resume?.currentVersionId) {
      throw new NotFoundException('No resume found');
    }
    const version = await this.versionRepo.findOne({
      where: { id: resume.currentVersionId },
    });
    if (!version) throw new NotFoundException('Resume version not found');

    return this.r2Service.getReadUrl(version.storageKey);
  }

  async getResumeDownloadUrl(userId: string): Promise<{ url: string; fileName: string }> {
    const resume = await this.resumeRepo.findOne({ where: { userId } });
    if (!resume?.currentVersionId) {
      throw new NotFoundException('No resume found');
    }
    const version = await this.versionRepo.findOne({
      where: { id: resume.currentVersionId },
    });
    if (!version) throw new NotFoundException('Resume version not found');

    const url = await this.r2Service.getReadUrl(version.storageKey);
    return { url, fileName: version.fileName };
  }

  // ──────────────────────────────────────────────
  // Delete Resume
  // ──────────────────────────────────────────────
  async deleteResume(userId: string): Promise<void> {
    const resume = await this.resumeRepo.findOne({ where: { userId } });
    if (!resume) {
      this.logger.log(`No resume to delete for user ${userId}`);
      return;
    }

    // Delete all versions from R2
    const versions = await this.versionRepo.find({
      where: { resumeId: resume.id },
    });
    for (const version of versions) {
      try {
        await this.r2Service.deleteObject(version.storageKey);
      } catch (err) {
        this.logger.warn(`Failed to delete R2 object ${version.storageKey}: ${err}`);
      }
    }

    // Cascade deletes will handle versions, parse results, and sync audits
    await this.resumeRepo.remove(resume);
    this.logger.log(`Resume deleted for user ${userId}`);
  }

  // ──────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────
  private buildAdditionsSummary(parsed: any, conflicts: ConflictEntry[]) {
    const conflictIds = new Set(conflicts.map((c) => c.existingId));

    const skills = (parsed.skills || []).slice(0, SKILLS_PROFILE_LIMIT).map((s: any) => ({
      name: s.name,
    }));

    const work = (parsed.work_experience || [])
      .filter((w: any) => {
        // Not a conflict
        return !conflicts.some(
          (c) =>
            c.type === 'work' &&
            (c.incoming.label || '').toLowerCase() === (w.job_title || '').toLowerCase() &&
            (c.incoming.detail || '').includes(w.company || ''),
        );
      })
      .map((w: any) => ({
        title: w.job_title,
        company: w.company,
        startDate: w.start_date,
        endDate: w.end_date,
        description: w.description || null,
      }));

    const education = (parsed.education || [])
      .filter((e: any) => {
        return !conflicts.some(
          (c) =>
            c.type === 'education' &&
            (c.incoming.label || '').toLowerCase() === (e.institution || '').toLowerCase(),
        );
      })
      .map((e: any) => ({
        institution: e.institution,
        degree: e.degree,
        fieldOfStudy: e.field_of_study,
      }));

    const certifications = (parsed.certifications || [])
      .filter((c: any) => {
        return !conflicts.some(
          (cf) =>
            cf.type === 'certification' &&
            (cf.incoming.label || '').toLowerCase() === (c.name || '').toLowerCase(),
        );
      })
      .map((c: any) => ({
        name: c.name,
        issuingBody: c.issuing_body,
      }));

    const industries = (parsed.industries || [])
      .map((i: any) => typeof i === 'string' ? i : i?.name || '')
      .filter((i: string) => i.trim());

    return {
      skills: { count: skills.length, items: skills },
      workExperience: { count: work.length, items: work },
      education: { count: education.length, items: education },
      certifications: { count: certifications.length, items: certifications },
      industries: { count: industries.length, items: industries.map((name: string) => ({ name })) },
    };
  }

  private async createAuditEntry(
    userId: string,
    parseResultId: string,
    entityType: string,
    action: string,
    entityId: string | null,
    previousData: any,
    newData: any,
  ): Promise<void> {
    await this.syncAuditRepo.save(
      this.syncAuditRepo.create({
        userId,
        parseResultId,
        entityType: entityType as any,
        action: action as any,
        entityId,
        previousData,
        newData,
      }),
    );
  }

  private formatDate(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
}
