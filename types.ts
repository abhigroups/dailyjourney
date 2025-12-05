
export interface JournalEntry {
  id: string;
  content: string;
  createdAt: string; // ISO string
  updatedAt: string;
  
  // AI Analyzed Data
  moodScore?: number; // 1-10
  moodLabel?: string;
  moodEmoji?: string; // New: Creative emoji auto-generated
  moodColor?: string; // New: Hex color auto-generated
  keywords?: string[];
  summary?: string;
  reflectionQuestion?: string;
  
  isAnalyzed: boolean;

  // Positive Reflection (Image + Quote)
  reflection?: {
    quote: string;
    imageUrl: string; // Blob URL or Base64
    imageId: string; // Reference to DB
  };

  // Media
  media?: JournalMedia[];
}

export interface JournalMedia {
  id: string;
  type: 'drawing' | 'image' | 'video' | 'audio';
  mimeType: string;
  blobId?: string; // Reference to IndexedDB (Optional if external)
  externalUrl?: string; // For YouTube or other external links
  createdAt: string;
  altText?: string; // Prompt used for generation or transcript
}

export interface PatternAnalysis {
  timestamp: string;
  recurringThemes: string[];
  habitInsight: string;
  improvementSuggestion: string;
  overallVibe: string;
}

export interface LifeJourneyAnalysis {
  timestamp: string;
  positives: string[];
  negatives: string[]; // Challenges
  achievements: string[];
  confidenceMoments: string[];
  actsOfKindness: string[];
  futurePlans: string[];
  bestMoments: string[];
  personalityProfile: {
    archetype: string;
    traits: string[];
    encouragingMessage: string;
    optimizationTips: string[];
  };
  // New Motivation Engine
  motivationalBlock: {
    resilienceScore: number; // 1-100
    positivityIndex: number; // 1-100
    powerQuote: string;
    resilienceNarrative: string; // Encouraging story of their struggles
    growthFocus: string[]; // Negatives reframed as positive challenges
  };
}

export enum ViewMode {
  WRITE = 'WRITE',
  LIST = 'LIST',
  ANALYTICS = 'ANALYTICS',
  SETTINGS = 'SETTINGS'
}

export interface UserStats {
  totalEntries: number;
  currentStreak: number;
  averageMood: number;
}
