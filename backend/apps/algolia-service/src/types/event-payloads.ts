export interface ListingEventPayload {
  id: string;
  type: string;
  title: string;
  description: string;
  skills: string[];
  category: string;
  ownerId: string;
  price: number;
  location: string;
  createdAt: string;
}

export interface ListingDeletedPayload {
  id: string;
  type: string;
}

export interface TalentEventPayload {
  id: string;
  firstName: string;
  lastName: string;
  headline: string;
  skills: string[];
  industry: string;
  location: string;
  hourlyRate: number;
  avatarUrl: string;
}

export interface TalentDeletedPayload {
  id: string;
}
