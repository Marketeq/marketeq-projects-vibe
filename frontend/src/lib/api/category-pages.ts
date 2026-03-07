import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002/api';

export interface BlockItem {
  id: string;
  title: string;
  slug: string;
  type: string;
  thumbnail?: string;
  description: string;
  creator?: {
    id: string;
    name: string;
    avatar?: string;
    verified?: boolean;
  };
  rating?: number;
  reviews?: number;
  tags?: string[];
  price?: string;
  deliveryTime?: string;
  completionDate?: string;
}

export interface ContentBlock {
  type: string;
  title: string;
  description?: string;
  items: BlockItem[];
  hasMore: boolean;
  totalCount: number;
}

export interface CategoryPageResponse {
  category: any;
  breadcrumbs: any[];
  parent: any;
  children: any[];
  siblings: any[];
  relatedCategories: any[];
  tags: any[];
  blocks: ContentBlock[];
}

export async function getCategoryPage(slug: string): Promise<CategoryPageResponse | null> {
  try {
    console.log(`Fetching: ${API_BASE_URL}/category-pages/${slug}`);
    const response = await axios.get(`${API_BASE_URL}/category-pages/${slug}`);
    console.log('Data received:', response.data);
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}