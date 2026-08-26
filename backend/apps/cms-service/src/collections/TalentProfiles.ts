import { CollectionConfig } from "payload/types";
import { isAdmin, isAdminOrDeveloper } from "../access/roles";
import { crossServiceUuidField } from "../fields/crossServiceUuid";
import { crossServiceSourceIdField } from "../fields/crossServiceSourceIdField";
import {
  syncTalentProfileToService,
  deleteTalentProfileFromService,
} from "../hooks/afterChange/syncTalentProfiles";
import {
  TalentIndustriesChipField,
  TalentSkillsChipField,
} from "../components/ChipArrayTagsField";
import TextAutocompleteField from "../components/TextAutocompleteField";
import { timingSafeEqual } from "crypto";

function hasValidCmsApiKey(req: any): boolean {
  const configured = process.env.CMS_API_KEY;
  if (!configured) return false;
  const header = req?.headers?.authorization;
  if (typeof header !== "string") return false;
  const match = header.match(/^API-Key\s+(.+)$/);
  if (!match) return false;
  const provided = match[1];
  if (provided.length !== configured.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(configured));
  } catch {
    return false;
  }
}

const talentProfileSourceIdDescription =
  "User UUID from user-service / auth-service. Links this CMS profile to the platform user.";

const talentProfileUuidField = crossServiceUuidField();
const talentProfileSourceIdField = crossServiceSourceIdField({
  required: false,
  unique: true,
  description: talentProfileSourceIdDescription,
});

const createDayFields = (dayName: string): any => {
  const toMinutes = (time?: string, dayPeriod?: string) => {
    if (!time || !dayPeriod) return null;
    const parts = time.includes("_") ? time.split("_") : time.split(":");
    const hoursPart = parseInt(parts[0], 10);
    const minutesPart = parseInt(parts[1] || "0", 10);
    if (isNaN(hoursPart) || isNaN(minutesPart)) return null;

    const normalizedHours =
      dayPeriod === "AM"
        ? hoursPart === 12
          ? 0
          : hoursPart
        : hoursPart === 12
          ? 12
          : hoursPart + 12;

    return normalizedHours * 60 + minutesPart;
  };

  const validateTimeRange = (value: any, { siblingData }: any) => {
    // This is called for both start and end fields to provide immediate feedback
    const startMin = toMinutes(siblingData.startTime, siblingData.startPeriod);
    const endMin = toMinutes(siblingData.endTime, siblingData.endPeriod);

    if (startMin !== null && endMin !== null && endMin < startMin) {
      return "End time cannot be earlier than start time";
    }
    return true;
  };

  const isWeekday = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(dayName);

  const timeOptions = [
    "01:00", "01:30", "02:00", "02:30", "03:00", "03:30", "04:00", "04:30",
    "05:00", "05:30", "06:00", "06:30", "07:00", "07:30", "08:00", "08:30",
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  ].map((t) => ({ label: t, value: t.replace(":", "_") }));

  return {
    name: dayName.toLowerCase(),
    type: "group",
    label: dayName,
    fields: [
      {
        type: "row",
        fields: [
          {
            name: "enabled",
            type: "checkbox",
            label: "Available on " + dayName,
            defaultValue: isWeekday,
            admin: { width: "20%" },
          },
          {
            name: "times",
            type: "array",
            label: "Time Slots",
            defaultValue: [
              {
                startTime: "09_00",
                startPeriod: "AM",
                endTime: "05_00",
                endPeriod: "PM",
              },
            ],
            admin: {
              condition: (data: any, siblingData: any) => siblingData?.enabled,
              width: "80%",
            },
            fields: [
              {
                type: "row",
                fields: [
                  {
                    name: "startTime",
                    type: "select",
                    label: "Start",
                    defaultValue: "09_00",
                    options: timeOptions,
                    validate: validateTimeRange,
                    admin: { width: "25%" },
                  },
                  {
                    name: "startPeriod",
                    type: "select",
                    label: "Period",
                    defaultValue: "AM",
                    options: [
                      { label: "AM", value: "AM" },
                      { label: "PM", value: "PM" },
                    ],
                    validate: validateTimeRange,
                    admin: { width: "25%" },
                  },
                  {
                    name: "endTime",
                    type: "select",
                    label: "End",
                    defaultValue: "05_00",
                    options: timeOptions,
                    validate: validateTimeRange,
                    admin: { width: "25%" },
                  },
                  {
                    name: "endPeriod",
                    type: "select",
                    label: "Period",
                    defaultValue: "PM",
                    options: [
                      { label: "AM", value: "AM" },
                      { label: "PM", value: "PM" },
                    ],
                    validate: validateTimeRange,
                    admin: { width: "25%" },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
};

function parseDateValue(value: unknown): Date | null {
  if (value == null || value === "") return null;
  const raw =
    typeof value === "object" && value && "value" in (value as any)
      ? (value as any).value
      : value;

  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }

  if (typeof raw === "number") {
    const parsedFromNumber = new Date(raw);
    return Number.isNaN(parsedFromNumber.getTime()) ? null : parsedFromNumber;
  }

  const rawString = String(raw).trim();
  if (!rawString) return null;

  // Support admin-entered MM/DD/YYYY dates explicitly.
  const mmddyyyy = rawString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const month = Number(mmddyyyy[1]);
    const day = Number(mmddyyyy[2]);
    const year = Number(mmddyyyy[3]);
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    const parsedFromSlash = new Date(Date.UTC(year, month - 1, day));
    if (
      parsedFromSlash.getUTCFullYear() !== year ||
      parsedFromSlash.getUTCMonth() !== month - 1 ||
      parsedFromSlash.getUTCDate() !== day
    ) {
      return null;
    }

    return parsedFromSlash;
  }

  const parsed = new Date(rawString);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDayStamp(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function isFutureDate(value: unknown): boolean {
  const parsed = parseDateValue(value);
  if (!parsed) return false;
  const today = new Date();
  return toDayStamp(parsed) > toDayStamp(today);
}

export const TalentProfiles: CollectionConfig = {
  slug: "talent-profiles",
  admin: {
    useAsTitle: "username",
    defaultColumns: ["username", "firstName", "lastName", "availability", "status"],
    group: "Base Collections",
  },
  access: {
    read: () => true,
    create: isAdminOrDeveloper,
    update: isAdminOrDeveloper,
    delete: isAdmin,
  },
  hooks: {
    afterChange: [syncTalentProfileToService],
    afterDelete: [deleteTalentProfileFromService],
  },
  fields: [
    talentProfileUuidField,
    talentProfileSourceIdField,
    // ── Tabs: keep editing flow compact, like Projects ──────────────────
    {
      type: "tabs",
      tabs: [
        {
          label: "About Me",
          fields: [
            {
              name: "username",
              type: "text",
              unique: true,
              index: true,
              required: true,
              minLength: 3,
              maxLength: 120,
              admin: {
                description:
                  "Username should be lowercase, minimum 3 characters. Allowed: a-z, 0-9, underscore (_).",
              },
              hooks: {
                beforeValidate: [
                  ({ value }) => {
                    if (typeof value !== "string") return value;
                    const normalized = value.trim().toLowerCase();
                    if (normalized.length < 3) {
                      throw new Error(
                        "Username must contain at least 3 valid characters (a-z, 0-9, ., _)",
                      );
                    }
                    if (!/^[a-z0-9._]+$/.test(normalized)) {
                      throw new Error(
                        "Username can only contain letters, numbers, periods, and underscores",
                      );
                    }
                    return normalized;
                  },
                ],
              },
            },
            {
              name: "firstName",
              type: "text",
              label: "First Name",
              required: true,
              admin: { description: "First name." },
            },
            {
              name: "lastName",
              type: "text",
              label: "Last Name",
              required: true,
              admin: { description: "Last name." },
            },
            {
              name: "overview",
              type: "richText",
              label: "About Me",
              admin: { description: "Full professional bio" },
            },
            {
              name: "status",
              type: "select",
              defaultValue: "active",
              options: [
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
                { label: "Suspended", value: "suspended" },
              ],
            },
          ],
        },
        {
          label: "Job Title & Rate",
          fields: [
            {
              name: "jobTitles",
              type: "array",
              label: "Job Titles",
              required: true,
              minRows: 1,
              maxRows: 3,
              admin: {
                description: "List up to 3 professional titles and their rates.",
              },
              fields: [
                {
                  name: "headline",
                  type: "text",
                  label: "Job Title",
                  required: true,
                  maxLength: 180,
                  admin: {
                    description:
                      'Short professional title, e.g. "Expert React Developer"',
                    components: {
                      Field: TextAutocompleteField,
                    },
                  },
                  hooks: {
                    beforeValidate: [
                      ({ value }) => {
                        if (typeof value !== "string") return value;
                        const trimmed = value.trim();
                        return trimmed.length ? trimmed : undefined;
                      },
                    ],
                  },
                  custom: {
                    autocompleteType: "job_titles",
                    submitType: "title",
                    submitSource: "cms-service:talent-profiles",
                    placeholder: "Add professional headline",
                    suggestedOptions: [
                      "Frontend Developer",
                      "Backend Engineer",
                      "Product Designer",
                      "Data Analyst",
                    ],
                  },
                },
                {
                  name: "rate",
                  type: "number",
                  label: "Hourly Rate (USD)",
                  required: true,
                  min: 0,
                  validate: (val: any) => {
                    if (val == null) return true;
                    if (!Number.isInteger(val))
                      return "Rate must be an integer (USD).";
                    return true;
                  },
                  admin: { description: "Hourly rate (USD)" },
                },
              ],
            },
            {
              name: "availability",
              type: "select",
              options: [
                { label: "10 hrs/week", value: "10" },
                { label: "20 hrs/week", value: "20" },
                { label: "30 hrs/week", value: "30" },
                { label: "40 hrs/week", value: "40" },
              ],
              validate: (val: any) => {
                if (val == null || val === "") return true;
                if (typeof val !== "string")
                  return "Availability must be a string value.";
                if (val.length > 10)
                  return "Availability must be 10 characters or fewer.";
                return true;
              },
            },
          ],
        },
        {
          label: "Skills",
          fields: [
            {
              name: "skills",
              type: "array",
              validate: (value: any) => {
                if (value == null) return true;
                if (!Array.isArray(value)) return "Skills must be a list.";
                const names = value
                  .map((row: any) =>
                    typeof row?.name === "string" ? row.name.trim() : "",
                  )
                  .filter(Boolean);
                const seen = new Set<string>();
                for (const n of names) {
                  const key = n.toLowerCase();
                  if (seen.has(key)) return `Duplicate skill "${n}"`;
                  seen.add(key);
                }
                return true;
              },
              admin: {
                description: "Professional skills (tags)",
                components: {
                  Field: TalentSkillsChipField,
                },
              },
              fields: [
                {
                  name: "name",
                  type: "text",
                  required: true,
                  hooks: {
                    beforeValidate: [
                      ({ value }) => {
                        if (typeof value !== "string") return value;
                        const trimmed = value.trim();
                        return trimmed.length ? trimmed : undefined;
                      },
                    ],
                  },
                },
              ],
            },
            {
              name: "industries",
              type: "array",
              validate: (value: any) => {
                if (value == null) return true;
                if (!Array.isArray(value))
                  return "Industry expertise must be a list.";
                const names = value
                  .map((row: any) =>
                    typeof row?.name === "string" ? row.name.trim() : "",
                  )
                  .filter(Boolean);
                const seen = new Set<string>();
                for (const n of names) {
                  const key = n.toLowerCase();
                  if (seen.has(key)) return `Duplicate industry "${n}"`;
                  seen.add(key);
                }
                return true;
              },
              admin: {
                description: "Industry domains",
                components: {
                  Field: TalentIndustriesChipField,
                },
              },
              fields: [
                {
                  name: "name",
                  type: "text",
                  required: true,
                  hooks: {
                    beforeValidate: [
                      ({ value }) => {
                        if (typeof value !== "string") return value;
                        const trimmed = value.trim();
                        return trimmed.length ? trimmed : undefined;
                      },
                    ],
                  },
                },
              ],
            },
            {
              name: "languages",
              type: "array",
              hooks: {
                beforeValidate: [
                  ({ value }) => {
                    if (!Array.isArray(value)) return value;

                    const seen = new Set<string>();
                    const deduped = value.filter((row: any) => {
                      const language =
                        typeof row?.language === "string"
                          ? row.language.trim().replace(/\s+/g, " ")
                          : "";
                      const key = language.toLowerCase();
                      if (!key || seen.has(key)) return false;
                      seen.add(key);
                      if (language && language !== row?.language) {
                        row.language = language;
                      }
                      return true;
                    });

                    return deduped;
                  },
                ],
              },
              validate: (value: any) => {
                if (value == null) return true;
                if (!Array.isArray(value)) return "Languages must be a list.";
                const seen = new Set<string>();
                for (const row of value) {
                  const language =
                    typeof row?.language === "string"
                      ? row.language.trim()
                      : "";
                  const fluency =
                    typeof row?.fluency === "string" ? row.fluency.trim() : "";
                  if (!language)
                    return "Each language entry must include a language.";
                  if (!fluency)
                    return `Language "${language}" must include a fluency level.`;
                  const key = language.toLowerCase();
                  if (seen.has(key)) return `Duplicate language "${language}"`;
                  seen.add(key);
                }
                return true;
              },
              fields: [
                {
                  name: "language",
                  type: "text",
                  required: true,
                  admin: {
                    components: {
                      Field: TextAutocompleteField,
                    },
                  },
                  custom: {
                    autocompleteType: "languages",
                    submitType: "language",
                    submitSource: "cms-service:talent-profiles",
                    placeholder: "Add language",
                    suggestedOptions: [
                      "English",
                      "Spanish",
                      "French",
                      "German",
                      "Hindi",
                    ],
                  },
                },
                {
                  name: "fluency",
                  type: "select",
                  required: true,
                  options: [
                    { label: "Basic", value: "basic" },
                    { label: "Conversational", value: "conversational" },
                    { label: "Fluent", value: "fluent" },
                    { label: "Native", value: "native" },
                  ],
                },
              ],
            },
            {
              name: "certifications",
              type: "array",
              validate: (value: any) => {
                if (value == null) return true;
                if (!Array.isArray(value))
                  return "Certifications must be a list.";
                for (const row of value) {
                  const title =
                    typeof row?.title === "string" ? row.title.trim() : "";
                  if (!title) return "Each certification must include a title.";
                }
                return true;
              },
              fields: [
                {
                  name: "title",
                  type: "text",
                  required: true,
                  hooks: {
                    beforeValidate: [
                      ({ value }) => {
                        if (typeof value !== "string") return value;
                        const trimmed = value.trim();
                        return trimmed.length ? trimmed : undefined;
                      },
                    ],
                  },
                  admin: {
                    components: {
                      Field: TextAutocompleteField,
                    },
                  },
                  custom: {
                    autocompleteType: "certifications",
                    submitType: "certification",
                    submitSource: "cms-service:talent-profiles",
                    placeholder: "Add certification title",
                    suggestedOptions: [
                      "AWS Certified Developer",
                      "Google Cloud Associate Engineer",
                      "PMP",
                    ],
                  },
                },
                {
                  name: "organization",
                  type: "text",
                  hooks: {
                    beforeValidate: [
                      ({ value }) => {
                        if (typeof value !== "string") return value;
                        const trimmed = value.trim();
                        return trimmed.length ? trimmed : undefined;
                      },
                    ],
                  },
                },
                {
                  name: "dateAwarded",
                  type: "date",
                  validate: (val: any) => {
                    if (val == null || val === "") return true;
                    const date = parseDateValue(val);
                    if (!date) {
                      return "dateAwarded must be a valid date.";
                    }
                    if (isFutureDate(val)) {
                      return "dateAwarded cannot be in the future.";
                    }
                    return true;
                  },
                },
              ],
            },
          ],
        },
        {
          label: "Work Experience",
          fields: [
            {
              name: "workExperience",
              type: "array",
              validate: (value: any) => {
                if (value == null) return true;
                if (!Array.isArray(value))
                  return "Work experience must be a list.";
                for (const row of value) {
                  const role =
                    typeof row?.role === "string" ? row.role.trim() : "";
                  const company =
                    typeof row?.company === "string" ? row.company.trim() : "";
                  if (!role) return "Each work experience entry needs a role.";
                  if (!company)
                    return "Each work experience entry needs a company.";

                  const startRaw = row?.startDate;
                  const endRaw = row?.endDate;

                  if (startRaw && !parseDateValue(startRaw)) {
                    return `startDate must be a valid date for "${role}" at "${company}".`;
                  }
                  if (endRaw && !parseDateValue(endRaw)) {
                    return `endDate must be a valid date for "${role}" at "${company}".`;
                  }

                  if (startRaw && isFutureDate(startRaw)) {
                    return `startDate cannot be in the future for "${role}" at "${company}".`;
                  }
                  if (endRaw && isFutureDate(endRaw)) {
                    return `endDate cannot be in the future for "${role}" at "${company}".`;
                  }

                  if (startRaw && endRaw) {
                    const start = parseDateValue(startRaw);
                    const end = parseDateValue(endRaw);
                    if (start && end) {
                      if (toDayStamp(end) < toDayStamp(start)) {
                        return `End date must be on or after start date for "${role}" at "${company}".`;
                      }
                    }
                  }
                }
                return true;
              },
              fields: [
                {
                  name: "role",
                  type: "text",
                  required: true,
                  hooks: {
                    beforeValidate: [
                      ({ value }) => {
                        if (typeof value !== "string") return value;
                        const trimmed = value.trim();
                        return trimmed.length ? trimmed : undefined;
                      },
                    ],
                  },
                },
                {
                  name: "company",
                  type: "text",
                  required: true,
                  hooks: {
                    beforeValidate: [
                      ({ value }) => {
                        if (typeof value !== "string") return value;
                        const trimmed = value.trim();
                        return trimmed.length ? trimmed : undefined;
                      },
                    ],
                  },
                },
                {
                  name: "startDate",
                  type: "date",
                  validate: (val: any) => {
                    if (val == null || val === "") return true;
                    const date = parseDateValue(val);
                    if (!date) return "startDate must be a valid date.";
                    if (isFutureDate(val)) {
                      return "startDate cannot be in the future.";
                    }
                    return true;
                  },
                },
                {
                  name: "endDate",
                  type: "date",
                  validate: (val: any, { siblingData }: any) => {
                    if (val == null || val === "") return true;
                    const date = parseDateValue(val);
                    if (!date) return "endDate must be a valid date.";
                    if (isFutureDate(val)) {
                      return "endDate cannot be in the future.";
                    }
                    const startDate = parseDateValue(siblingData?.startDate);
                    if (startDate && toDayStamp(date) < toDayStamp(startDate)) {
                      return "endDate must be on or after startDate.";
                    }
                    return true;
                  },
                },
                {
                  name: "description",
                  type: "textarea",
                  hooks: {
                    beforeValidate: [
                      ({ value }) => {
                        if (typeof value !== "string") return value;
                        const trimmed = value.trim();
                        return trimmed.length ? trimmed : undefined;
                      },
                    ],
                  },
                },
                {
                  name: "skills",
                  type: "array",
                  label: "Skills",
                  maxRows: 10,
                  validate: (value: any) => {
                    if (value == null) return true;
                    if (!Array.isArray(value)) return "Skills must be a list.";
                    if (value.length > 10) return "You can add up to 10 skills per work experience entry.";
                    return true;
                  },
                  admin: {
                    description: "Skills used in this role — max 10.",
                    components: {
                      Field: TalentSkillsChipField,
                    },
                  },
                  fields: [
                    {
                      name: "name",
                      type: "text",
                      required: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: "Education",
          fields: [
            {
              name: "education",
              type: "array",
              validate: (value: any) => {
                if (value == null) return true;
                if (!Array.isArray(value)) return "Education must be a list.";
                for (const row of value) {
                  const institution =
                    typeof row?.institution === "string"
                      ? row.institution.trim()
                      : "";
                  if (!institution)
                    return "Each education entry needs an institution.";
                  const graduationYear = row?.graduationYear;
                  if (graduationYear != null && graduationYear !== "") {
                    const year = Number(graduationYear);
                    const max = new Date().getFullYear() + 10;
                    if (!Number.isInteger(year))
                      return "graduationYear must be an integer year.";
                    if (year < 1900 || year > max)
                      return `graduationYear must be between 1900 and ${max}.`;
                  }
                }
                return true;
              },
              fields: [
                {
                  name: "institution",
                  type: "text",
                  required: true,
                  hooks: {
                    beforeValidate: [
                      ({ value }) => {
                        if (typeof value !== "string") return value;
                        const trimmed = value.trim();
                        return trimmed.length ? trimmed : undefined;
                      },
                    ],
                  },
                },
                {
                  name: "degree",
                  type: "text",
                  hooks: {
                    beforeValidate: [
                      ({ value }) => {
                        if (typeof value !== "string") return value;
                        const trimmed = value.trim();
                        return trimmed.length ? trimmed : undefined;
                      },
                    ],
                  },
                },
                {
                  name: "graduationYear",
                  type: "number",
                  validate: (val: any) => {
                    if (val == null || val === "") return true;
                    const year = Number(val);
                    const max = new Date().getFullYear() + 10;
                    if (!Number.isInteger(year))
                      return "Enter a whole year (e.g. 2024).";
                    if (year < 1900 || year > max)
                      return `Year must be between 1900 and ${max}.`;
                    return true;
                  },
                },
              ],
            },
          ],
        },
        {
          label: "Portfolio",
          fields: [
            {
              name: "portfolio",
              type: "array",
              validate: (value: any) => {
                if (value == null) return true;
                if (!Array.isArray(value)) return "Portfolio must be a list.";
                for (const row of value) {
                  const title =
                    typeof row?.title === "string" ? row.title.trim() : "";
                  if (!title) return "Each portfolio entry needs a title.";
                  const url =
                    typeof row?.url === "string" ? row.url.trim() : "";
                  if (url) {
                    try {
                      const parsed = new URL(url);
                      if (!["http:", "https:"].includes(parsed.protocol)) {
                        return "Portfolio URL must start with http:// or https://";
                      }
                    } catch {
                      return "Portfolio URL must be a valid URL.";
                    }
                  }
                }
                return true;
              },
              fields: [
                {
                  name: "title",
                  type: "text",
                  required: true,
                  hooks: {
                    beforeValidate: [
                      ({ value }) => {
                        if (typeof value !== "string") return value;
                        const trimmed = value.trim();
                        return trimmed.length ? trimmed : undefined;
                      },
                    ],
                  },
                },
                {
                  name: "url",
                  type: "text",
                  hooks: {
                    beforeValidate: [
                      ({ value }) => {
                        if (typeof value !== "string") return value;
                        const trimmed = value.trim();
                        return trimmed.length ? trimmed : undefined;
                      },
                    ],
                  },
                  validate: (val: any) => {
                    if (val == null || val === "") return true;
                    if (typeof val !== "string") return "URL must be a string.";
                    const trimmed = val.trim();
                    if (!trimmed) return true;
                    try {
                      const url = new URL(trimmed);
                      return ["http:", "https:"].includes(url.protocol)
                        ? true
                        : "URL must start with http:// or https://";
                    } catch {
                      return "URL must be valid (http/https).";
                    }
                  },
                },
                { name: "thumbnail", type: "upload", relationTo: "media" },
                {
                  name: "description",
                  type: "textarea",
                  hooks: {
                    beforeValidate: [
                      ({ value }) => {
                        if (typeof value !== "string") return value;
                        const trimmed = value.trim();
                        return trimmed.length ? trimmed : undefined;
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
