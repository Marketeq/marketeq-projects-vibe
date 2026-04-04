export class ProjectSyncDto {
  id: number;
  title: string;
  slug: string;
  summary?: string;
  description?: string;
  installment_frequency?: 'weekly' | 'biweekly' | 'monthly';
  required_skills?: any;
  role?: string;
  cover_image?: {
    url: string;
    alternativeText?: string;
  };
  gallery?: Array<{
    url: string;
    alternativeText?: string;
  }>;
  video?: {
    url: string;
    alternativeText?: string;
  };
  status?: 'draft' | 'published' | 'archived';
  preview_enabled?: boolean;
  featured?: boolean;
  categories?: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  tags?: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  client?: {
    id: number;
    name: string;
    email: string;
  };
  talents?: Array<{
    id: number;
    name: string;
    skills: string[];
  }>;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

