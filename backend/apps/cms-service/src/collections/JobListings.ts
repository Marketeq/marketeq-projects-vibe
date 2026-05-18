import { CollectionConfig } from "payload/types";
import {
  isAdmin,
  isAdminOrDeveloper,
  isContentEditorOrAbove,
} from "../access/roles";
import { crossServiceSourceIdField } from "../fields/crossServiceSourceIdField";
import { syncJobListing } from "../hooks/afterChange/syncJobListing";

export const JobListings: CollectionConfig = {
  slug: "job-listings",
  labels: { singular: "Job Listing", plural: "Job Listings" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "jobType", "status", "featured", "updatedAt"],
    description:
      "Editorial overlay for job listings. One record per job in listings-service.",
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
      description:
        "UUID of the job in listings-service. Auto-populated — do not edit.",
    }),
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true, index: true },
    {
      name: "status",
      type: "select",
      defaultValue: "draft",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
        { label: "Archived", value: "archived" },
      ],
    },
    { name: "featured", type: "checkbox", defaultValue: false },
    {
      name: "editorialLabel",
      type: "select",
      defaultValue: "none",
      options: [
        { label: "Top Pick", value: "top_pick" },
        { label: "New", value: "new" },
        { label: "Trending", value: "trending" },
        { label: "Staff Pick", value: "staff_pick" },
        { label: "None", value: "none" },
      ],
    },
    {
      name: "coverImage",
      type: "upload",
      relationTo: "media",
    },
    {
      name: "excerpt",
      type: "textarea",
      maxLength: 300,
    },
    { name: "category", type: "relationship", relationTo: "categories" },
    {
      name: "jobType",
      type: "select",
      options: [
        { label: "Full-time", value: "full-time" },
        { label: "Part-time", value: "part-time" },
        { label: "Contract", value: "contract" },
        { label: "Freelance", value: "freelance" },
      ],
    },
    {
      name: "location",
      type: "text",
      admin: { description: 'Work location or "Remote".' },
    },
    {
      name: "salaryMin",
      type: "number",
      admin: { hidden: true },
    },
    {
      name: "salaryMax",
      type: "number",
      admin: { hidden: true },
    },
  ],
};
