export interface TalentProfileSavedEvent {
  event: 'talent-profile.saved';
  id: string;
  sourceId: string | null;
  username: string;
  name: string;
  headline: string | null;
  availability: string | null;
  rate: number | null;
  rateMin: number | null;
  rateMax: number | null;
  jobTitles: { headline: string; rate: number }[];
  location: string | null;
  timezone: string | null;
  overview: Record<string, any> | null;
  skills: string[];
  industryExpertise: string[];
  languages: { language: string; fluency: string }[];
  certifications: {
    title: string;
    organization: string;
    dateAwarded: string | null;
  }[];
  education: {
    institution: string;
    degree: string;
    graduationYear: number | null;
  }[];
  workExperience: {
    role: string;
    company: string;
    startDate: string | null;
    endDate: string | null;
    description: string | null;
  }[];
  portfolio: {
    title: string;
    url: string | null;
    thumbnailId: number | null;
    description: string | null;
  }[];
  status: 'active' | 'inactive' | 'suspended';
}

export interface TalentProfileDeletedEvent {
  event: 'talent-profile.deleted';
  id: string;
  username: string;
}
