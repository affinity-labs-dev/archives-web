// Shared TypeScript interfaces for ROI (Rise of Islam) components

export interface Answer {
  text: string;
  is_correct: boolean;
}

export interface Question {
  question_text: string;
  question_type: 'mcq' | 'trueFalse' | 'fillInBlank';
  answers: Answer[];
  explanation?: string;
}

export interface ContentBlock {
  type: 'video' | 'image' | 'text';
  order: number;
  url?: string;  // For video/image blocks
  content?: string;  // For text blocks
  autoplay?: boolean;  // For video blocks
  loop?: boolean;  // For video blocks
}

export interface BottomContent {
  reading_text: string; // HTML content string (supports h1-h6, p, strong, em, ul, li, blockquote, hr, etc.)
  carousel_captions?: string[]; // Plain text captions for video carousel items
}

export interface ContentItem {
  id: string;
  thumbnail_url: string | null;
  thumbnail_title: string | null;
  media_url: string[] | null;
  content_type: 'reel' | 'video_carousel' | 'image_carousel' | 'scrollable_media_view';
  bottom_content: BottomContent | null;
  questions?: Question[];
  order_by: number;
  background_music_url?: string | null;
  content_blocks?: ContentBlock[];  // For scrollable_media_view lesson type
}

export interface CardContent {
  era_name: string;
  background_image: string;
  overview_text: string;
  adventure_story: string;
  estimated_time: string;
}

export interface Adventure {
  readable_id: string;
  era_id: number;
  adventure_title: string;
  adventure_description?: string;
  order_by: number;
  timeline: string;
  icon_url: string | null;
  content_list: ContentItem[];
  card_content?: CardContent | null;
}
