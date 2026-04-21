import { CollectionConfig } from "payload/types";

import { isAdmin, isEditor, readPublishedOrCmsUser } from "../access/roles";

const guaranteeIconOptions = [
  { label: "Rocket", value: "rocket" },
  { label: "Shield Zap", value: "shield-zap" },
  { label: "Shield Dollar", value: "shield-dollar" },
];

/**
 * Project static content shown on project details pages:
 * right-rail guarantee block and main-column "How It Works" card.
 *
 * Consumed via listings-service → `projectStaticContent` on
 * GET /v1/projects/slug/:slug (see frontend project-details page).
 */
export const ProjectStaticContents: CollectionConfig = {
  slug: "project-static-contents",
  labels: {
    singular: "Project Static Content",
    plural: "Project Static Contents",
  },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "updatedAt"],
    description:
      "Editable static copy for the Project Details page: sidebar guarantee, policy link, and How It Works section.",
  },
  versions: {
    drafts: {
      autosave: { interval: 800 },
    },
    maxPerDoc: 25,
  },
  access: {
    read: readPublishedOrCmsUser,
    create: isEditor,
    update: isEditor,
    delete: isAdmin,
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
      defaultValue: "Default Project Details Sidebar Content",
      admin: {
        description: "Internal admin label for this static content set.",
      },
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      defaultValue: "default",
      admin: {
        position: "sidebar",
        description:
          'Unique key for selecting the content set. Use "default" for the production fallback.',
      },
    },
    {
      name: "heading",
      type: "text",
      required: true,
      defaultValue: "Peace of Mind Guarantee",
      admin: {
        description: "Section heading shown at the top of the block.",
      },
    },
    {
      name: "guaranteeItems",
      type: "array",
      required: true,
      minRows: 2,
      maxRows: 4,
      labels: {
        singular: "Guarantee item",
        plural: "Guarantee items",
      },
      admin: {
        description:
          "Main guarantee rows shown beneath the heading (typically two rows in current design).",
      },
      fields: [
        {
          name: "icon",
          type: "select",
          required: true,
          options: guaranteeIconOptions,
          defaultValue: "shield-zap",
        },
        {
          name: "title",
          type: "text",
          required: true,
          defaultValue: "Peace of Mind Guarantee",
        },
        {
          name: "description",
          type: "textarea",
          required: true,
          defaultValue:
            "If the project falls short, you can initiate a dispute for a full refund.",
          maxLength: 260,
        },
      ],
    },
    {
      name: "highlightedNotice",
      type: "group",
      fields: [
        {
          name: "icon",
          type: "select",
          required: true,
          defaultValue: "shield-dollar",
          options: guaranteeIconOptions,
        },
        {
          name: "description",
          type: "textarea",
          required: true,
          defaultValue:
            "If the project falls short, you can initiate a dispute for a full refund.",
          maxLength: 260,
        },
      ],
      admin: {
        description: "Highlighted callout row shown in the tinted card.",
      },
    },
    {
      name: "policy",
      type: "group",
      admin: {
        description: "Bottom policy copy and optional link button text.",
      },
      fields: [
        {
          name: "prefixText",
          type: "textarea",
          required: true,
          defaultValue:
            "We securely process payments and release upon rating. We securely process payments",
          maxLength: 400,
        },
        {
          type: "row",
          fields: [
            {
              name: "linkLabel",
              type: "text",
              required: true,
              defaultValue: "See Policy Details.",
              admin: { width: "50%" },
            },
            {
              name: "linkHref",
              type: "text",
              required: true,
              defaultValue: "/policy",
              admin: { width: "50%" },
            },
          ],
        },
      ],
    },
    {
      name: "howItWorks",
      type: "group",
      admin: {
        description:
          "Center-column “How It Works” card — step columns only. Section title, subtitle, and “Learn More” are fixed in the app, not editable here.",
      },
      fields: [
        {
          name: "steps",
          type: "array",
          required: true,
          minRows: 1,
          maxRows: 6,
          defaultValue: [
            {
              stepNumber: "1",
              title: "Customize Your Scope",
              description:
                "Lorem ipsum odor amet, consectetuer adipiscing elit.",
            },
            {
              stepNumber: "1",
              title: "Customize Your Scope",
              description:
                "Lorem ipsum odor amet, consectetuer adipiscing elit.",
            },
            {
              stepNumber: "1",
              title: "Customize Your Scope",
              description:
                "Lorem ipsum odor amet, consectetuer adipiscing elit.",
            },
          ],
          labels: {
            singular: "Step",
            plural: "Steps",
          },
          admin: {
            description: "Columns shown in the three-up grid (typically three steps).",
          },
          fields: [
            {
              name: "stepNumber",
              type: "text",
              required: true,
              defaultValue: "1",
              admin: {
                description: "Large step numeral shown beside the title (e.g. 1, 2, 3).",
              },
            },
            {
              name: "title",
              type: "text",
              required: true,
              defaultValue: "Customize Your Scope",
            },
            {
              name: "description",
              type: "textarea",
              required: true,
              defaultValue:
                "Lorem ipsum odor amet, consectetuer adipiscing elit.",
            },
            {
              name: "icon",
              type: "upload",
              relationTo: "media",
              admin: {
                description:
                  "Optional square image upload (uses CMS Media). Leave empty for the default gray placeholder.",
              },
            },
          ],
        },
      ],
    },
  ],
};
