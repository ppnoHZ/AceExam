
export type QuestionType = 'single' | 'multiple' | 'qa' | 'matching';

export interface Question {
  question_id: number;
  type: QuestionType;
  question_en: string;
  question_cn: string;
  options_en: Record<string, string | string[]>;
  options_cn: Record<string, string | string[]>;
  answer_en: string;
  answer_cn: string;
  explanation_en?: string;
  explanation_cn?: string;
  tags?: string[];
}

export interface UserStats {
  correct: number;
  incorrect: number;
  totalAnswered: number;
}

export type ReviewMode = 'sequence' | 'random' | 'wrong' | 'shuffle' | 'tags';

export interface AppState {
  questions: Question[];
  currentMode: ReviewMode;
  currentIndex: number;
  reviewOrder: number[];
  answerRecords: Record<number, { correct: number; incorrect: number }>;
  showAnswerDirectly: boolean;
  bilingualMode: 'en' | 'cn' | 'both';
  uiLanguage: 'en' | 'cn';
}
