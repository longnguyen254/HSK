
export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export interface Word {
  id: string;
  character: string;
  pinyin: string;
  meaning: string;
  folderId?: string; // ID của thư mục chứa từ này
  wordType?: string;
  grammarNote?: string;
  radicalAnalysis?: string;
  example: string;
  examplePinyin?: string;
  exampleTranslation?: string;
  imageUrl?: string;
  level: number;
  nextReviewDate: number;
  createdAt: number;
}

export enum MasteryLevel {
  NEW = 0,
  LEARNING = 1,
  FAMILIAR = 2,
  PROFICIENT = 3,
  EXPERT = 4,
  MASTERED = 5
}

export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';

export interface AppState {
  words: Word[];
}
