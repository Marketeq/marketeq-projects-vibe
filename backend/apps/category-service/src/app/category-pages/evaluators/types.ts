export type BlockType = 'top-rated' | 'trending' | 'newest' | 'featured';
export type ItemType = 'project' | 'service' | 'team' | 'talent';

export interface Creator {
  id: string;
  name: string;
  avatar: string;
  verified?: boolean;
  rating?: number;
}

export interface BlockItem {
  id: string;
  title: string;
  slug: string;
  type: ItemType;
  
  // Image
  thumbnail: string;
  
  // Content
  description: string;
  
  // Creator
  creator: Creator;
  
  // Engagement
  rating: number;
  reviews: number;
  
  // Categorization
  category?: string;
  tags: string[];
  
  // Pricing
  price: string;
  
  // Dates
  createdAt: string;
  completionDate?: string;
  
  // Filters (from Figma sidebar)
  deliveryTime?: string;
  experienceLevel?: string;
  projectType?: string;
  location?: string;
}

export interface Block {
  type: BlockType;
  title: string;
  description?: string;
  items: BlockItem[];
  
  // Pagination
  cursor?: string;
  hasMore: boolean;
  totalCount?: number;
  
  // Sorting
  sortedBy?: 'newest' | 'popular' | 'rating' | 'price';
}

export interface EvaluatorConfig {
  categoryUuid: string;
  limit?: number;
  cursor?: string;
  sortBy?: 'newest' | 'popular' | 'rating' | 'price';
}

export interface Evaluator {
  evaluate(config: EvaluatorConfig): Promise<Block>;
}