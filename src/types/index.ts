export type Language = 'ar' | 'en';

export interface User {
  id: string;
  name: string;
  email: string;
  profile_image: string;
  created_at: string;
}

export interface Page {
  id: string;
  user_id: string;
  question: string;
  slug: string;
  max_comments: number;
  comments_count: number;
  remaining_comments?: number;
  total_votes?: number;
  is_active: boolean | number;
  created_at: string;
  owner_name?: string;
  owner_image?: string;
}

export interface Comment {
  id: string;
  page_id: string;
  content: string;
  votes_count: number;
  is_hidden: number;
  created_at: string;
  has_voted?: boolean;
}

export interface TraitItem {
  trait: string;
  traitEn: string;
  count: number;
  percentage: number;
  category: 'strength' | 'growth' | 'neutral';
  explanation: string;
}

export interface AiAnalysis {
  totalComments: number;
  summary: string;
  summaryEn: string;
  dominantTrait: {
    trait: string;
    traitEn: string;
    count: number;
    percentage: number;
  };
  topTraits: TraitItem[];
  positiveThemes: string[];
  constructiveCritiques: string[];
  disclaimer: string;
}
