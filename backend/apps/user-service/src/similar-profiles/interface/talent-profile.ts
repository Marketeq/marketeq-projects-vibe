export interface TalentProfile {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  skills: string[];
  role: string;
  hourlyRate: number;
  rateMin: number | null;
  rateMax: number | null;
  location: string;
  experience: number;
  timezone: string;
  rating: number;
}
