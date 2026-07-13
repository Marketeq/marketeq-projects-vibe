export class Media {
  id?: string;

  featuredImage: string;
  additionalImages?: string[];
  hiddenImages?: string[];
  featuredVideo?: string;

  projectId: string;

  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}
