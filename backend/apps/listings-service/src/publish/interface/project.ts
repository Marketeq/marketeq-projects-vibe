import { Exclude } from 'class-transformer';

export class Project {
  id?: string;
  strapiId?: string | null;

  @Exclude({ toPlainOnly: true })
  title: string;
  subtitle?: string | null;
  shortDescription?: string | null;
  fullDescription?: string | null;
  budget?: number | null;
  initialTeamBudget?: number | null;
  durationMonths?: number | null;
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
  status?: string | null;
  projectDatePublished?: Date | null;
  userId: string;

  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}
