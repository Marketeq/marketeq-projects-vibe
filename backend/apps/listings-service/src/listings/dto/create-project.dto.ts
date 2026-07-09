export interface CreateProjectDto {
  title: string;
  description: string;
  tags: string[];
  skills: string[];
  media: string[];

  // 🔄 Updated based on the UI allowing multiple categories
  categories: string[];       // ⬅️ Instead of a single `category: string`
  subcategories: string[][];  // ⬅️ Array of arrays: one for each category
}
