import React from "react";
import { CollectionConfig } from "payload/types";
import {
  isAdmin,
  isAdminOrDeveloper,
  isContentEditorOrAbove,
} from "../access/roles";
import { crossServiceSourceIdField } from "../fields/crossServiceSourceIdField";
import { syncJobListing } from "../hooks/afterChange/syncJobListing";
import {
  JobListingIndustriesChipField,
  JobListingLanguagesChipField,
  JobListingSkillsChipField,
} from "../components/ChipArrayTagsField";
import TextAutocompleteField from "../components/TextAutocompleteField";

const JOB_TITLE_SUGGESTIONS = [
  "Frontend Developer",
  "Backend Engineer",
  "Full Stack Developer",
  "UX Designer",
  "Product Designer",
  "Product Manager",
  "Data Analyst",
  "DevOps Engineer",
  "QA Engineer",
  "Project Manager",
];

const isCustomSchedule = (_: any, sib: any) => sib?.workSchedule === "custom";

const locationOptions = [
  { label: "Worldwide",           value: "Worldwide" },
  { label: "United States",       value: "United States" },
  { label: "Canada",              value: "Canada" },
  { label: "United Kingdom",      value: "United Kingdom" },
  { label: "Western Europe",      value: "Western Europe" },
  { label: "Eastern Europe",      value: "Eastern Europe" },
  { label: "Latin America",       value: "Latin America" },
  { label: "South Asia",          value: "South Asia" },
  { label: "Southeast Asia",      value: "Southeast Asia" },
  { label: "East Asia",           value: "East Asia" },
  { label: "Middle East",         value: "Middle East" },
  { label: "Africa",              value: "Africa" },
  { label: "Australia / NZ",      value: "Australia / NZ" },
];

const experienceLevelOptions = [
  { label: "Junior",  value: "Junior" },
  { label: "Mid",     value: "Mid" },
  { label: "Senior",  value: "Senior" },
  { label: "Guru",    value: "Guru" },
];

const workScheduleOptions = [
  { label: "Full Time", value: "full_time" },
  { label: "Part Time", value: "part_time" },
  { label: "Custom",    value: "custom" },
];

const roleTitleField = {
  name: "roleTitle",
  type: "text" as const,
  required: true,
  maxLength: 100,
  admin: {
    components: { Field: TextAutocompleteField },
  },
  custom: {
    autocompleteType: "job_titles",
    submitType: "title",
    submitSource: "cms-service:job-listings",
    placeholder: "Start typing a role title...",
    suggestedOptions: JOB_TITLE_SUGGESTIONS,
  },
};

export const JobListings: CollectionConfig = {
  slug: "job-listings",
  labels: { singular: "Job Listing", plural: "Job Listings" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "ndaEnabled", "updatedAt"],
    description: "Client-created freelance engagement listings.",
  },
  access: {
    read: () => true,
    create: isAdminOrDeveloper,
    update: isContentEditorOrAbove,
    delete: isAdmin,
  },
  hooks: { afterChange: [syncJobListing] },
  fields: [
    crossServiceSourceIdField({
      required: true,
      unique: true,
      description: "UUID of the JobListing in listings-service. Auto-populated — do not edit.",
    }),

    // ── Title ────────────────────────────────────────────────────────
    {
      name: "title",
      type: "text",
      required: true,
      admin: { description: "The listing title shown on the detail page." },
    },

    {
      name: "jobType",
      type: "text",
      maxLength: 100,
      label: "Job Type",
      admin: { description: "AI-detected engagement type, e.g. Website, Mobile App, API Integration." },
    },

    {
      name: "ndaEnabled",
      type: "checkbox",
      defaultValue: false,
      label: "NDA Required",
    },

    {
      type: "tabs",
      tabs: [

        // ── Tab 1: Roles & Descriptions ──────────────────────────────
        {
          label: "Roles & Descriptions",
          fields: [
            // ── Roles ─────────────────────────────────────────────
            {
              name: "teamMemberRows",
              type: "array",
              label: "Roles",
              admin: {
                description: "Add each role required for this listing.",
              },
              fields: [
                roleTitleField,
                { name: "location",        type: "select", options: locationOptions },
                { name: "experienceLevel", type: "select", options: experienceLevelOptions },
                {
                  name: "assignedUsername",
                  type: "text",
                  maxLength: 100,
                  label: "Assign User",
                  admin: {
                    description: "Marketeq username of the assigned member. Leave blank for open roles.",
                    components: { Field: TextAutocompleteField },
                  },
                  custom: {
                    autocompleteType: "usernames",
                    placeholder: "Search username...",
                    suggestedOptions: [],
                  },
                },
                {
                  name: "workSchedule",
                  type: "select",
                  required: true,
                  defaultValue: "full_time",
                  options: workScheduleOptions,
                },
                {
                  name: "customHours",
                  type: "number",
                  admin: {
                    condition: isCustomSchedule,
                    description: "Hours per custom frequency.",
                  },
                },
                {
                  name: "customFrequency",
                  type: "text",
                  admin: {
                    condition: isCustomSchedule,
                    description: "e.g. per_week.",
                  },
                },
                { name: "contractLengthMonths", type: "number" },

                // ── Embedded role description ──────────────────────
                {
                  name: "description",
                  type: "group",
                  label: "Role Description",
                  admin: { description: "AI-generated description for this role. Edit as needed." },
                  fields: [
                    {
                      name: "overview",
                      type: "textarea",
                      admin: { description: "Max 100 words." },
                    },
                    {
                      name: "benefits",
                      type: "textarea",
                      admin: { description: "Max 100 words." },
                    },
                    {
                      name: "responsibilities",
                      type: "textarea",
                      admin: { description: "Max 100 words." },
                    },
                    {
                      name: "skills",
                      type: "array",
                      maxRows: 20,
                      admin: {
                        components: { Field: JobListingSkillsChipField },
                      },
                      fields: [{ name: "value", type: "text", maxLength: 50 }],
                    },
                  ],
                },
              ],
            },
          ],
        },

        // ── Tab 3: Industries ────────────────────────────────────────
        {
          label: "Industries",
          fields: [
            {
              name: "industries",
              type: "array",
              maxRows: 10,
              labels: { singular: "Industry", plural: "Industries" },
              admin: {
                description: "Max 10 industries, each max 50 chars.",
                components: { Field: JobListingIndustriesChipField },
              },
              fields: [
                { name: "value", type: "text", required: true, maxLength: 50 },
              ],
            },
          ],
        },

        // ── Tab 4: Languages ─────────────────────────────────────────
        {
          label: "Languages",
          fields: [
            {
              name: "languages",
              type: "array",
              maxRows: 10,
              labels: { singular: "Language", plural: "Languages" },
              admin: {
                description: "Max 10 languages, each max 50 chars.",
                components: { Field: JobListingLanguagesChipField },
              },
              fields: [
                { name: "value", type: "text", required: true, maxLength: 50 },
              ],
            },
          ],
        },

      ],
    },
  ],
};
