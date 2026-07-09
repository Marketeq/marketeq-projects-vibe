/**
 * Suggested Category
 * Represents a category suggestion with full navigation path
 */
export interface SuggestedCategory {
    uuid: string;
    level: 1 | 2 | 3;
    name: string;
    slugPath: string[];
    link: string;
  }
  
  /**
   * Suggested Skill
   * Represents a skill tag that users might be interested in
   */
  export interface SuggestedSkill {
    name: string;
    slug: string;
    link: string;
  }
  
  /**
   * Complete Suggestions Response
   * Contains all suggestion types for a category page
   */
  export interface CategoryPageSuggestions {
    relatedCategories: SuggestedCategory[];
    trendingCategories: SuggestedCategory[];
    popularCategories: SuggestedCategory[];
    relatedSkills: SuggestedSkill[];
  }
  
  /**
   * Parameters for building suggestions
   */
  export interface BuildSuggestionsParams {
    currentCategoryUuid: string;
    currentCategorySlug: string;
    limit?: {
      related?: number;
      trending?: number;
      popular?: number;
      skills?: number;
    };
  }