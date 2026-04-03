import { 
    CategoryPageSuggestions, 
    BuildSuggestionsParams,
    SuggestedCategory,
    SuggestedSkill 
  } from '../types/suggestions.types';
  
  /**
   * SuggestionsAdapter Interface
   * 
   * Defines contract for generating category and skill suggestions.
   * Mock implementation uses local DB queries.
   * Real implementation will use Hugging Face embeddings + analytics.
   */
  export abstract class SuggestionsAdapter {
    /**
     * Build all suggestions for a category page
     * @param params - Configuration including current category UUID/slug and limits
     * @returns Complete suggestions object with all four types
     */
    abstract buildSuggestions(
      params: BuildSuggestionsParams
    ): Promise<CategoryPageSuggestions>;
  
    /**
     * Get related categories based on similarity
     * @param categoryUuid - Current category UUID
     * @param limit - Maximum number of suggestions to return
     * @returns Array of related categories
     */
    abstract getRelatedCategories(
      categoryUuid: string,
      limit: number
    ): Promise<SuggestedCategory[]>;
  
    /**
     * Get trending categories (recent + high activity)
     * @param limit - Maximum number of suggestions to return
     * @returns Array of trending categories
     */
    abstract getTrendingCategories(
      limit: number
    ): Promise<SuggestedCategory[]>;
  
    /**
     * Get popular categories (most viewed/clicked)
     * @param limit - Maximum number of suggestions to return
     * @returns Array of popular categories
     */
    abstract getPopularCategories(
      limit: number
    ): Promise<SuggestedCategory[]>;
  
    /**
     * Get related skills/tags
     * @param categorySlug - Current category slug
     * @param limit - Maximum number of skills to return
     * @returns Array of related skills
     */
    abstract getRelatedSkills(
      categorySlug: string,
      limit: number
    ): Promise<SuggestedSkill[]>;
  }