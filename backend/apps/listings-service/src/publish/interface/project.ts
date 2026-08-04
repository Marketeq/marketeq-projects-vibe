import { Exclude } from 'class-transformer';

export class Project {
  id?: string;
  cmsId?: string | null;
  slug?: string | null;

  @Exclude({ toPlainOnly: true })
  title: string;
  subtitle?: string | null;
  shortDescription?: string | null;
  fullDescription?: string | null;
  budget?: number | null;
  initialTeamBudget?: number | null;
  durationMonths?: number | null;
  teamSize?: number | null;
  location?: string | null;
  timezone?: string | null;

  categories?: string[] | null;
  subCategories?: string[] | null;
  categorySelections?:
    | {
        category: string;
        subCategories: string[];
      }[]
    | null;
  industries?: string[] | null;
  tags?: string[] | null;
  skills?: string[] | null;
  listingType?: string | null;
  projectType?: string | null;
  status?: string | null;
  projectDatePublished?: Date | null;
  userId: string;

  deliverables?: any[] | null;
  media?: any[];
  mediaUrls?: string[];
  teamMemberIds?: string[];
  videoUrl?: string | null;
  faqs?: { question: string; answer: string; is_ai_generated?: boolean }[];

  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}
