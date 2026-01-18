import { API_BASE_URL } from './config';
import { Question } from '../types';

export const fetchQuestions = async (): Promise<Question[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/questions`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    
    // Process JSON fields if they come back as strings
    return data.map((q: any) => ({
      ...q,
      options_en: typeof q.options_en === 'string' ? JSON.parse(q.options_en) : q.options_en,
      options_cn: typeof q.options_cn === 'string' ? JSON.parse(q.options_cn) : q.options_cn,
    }));
  } catch (e) {
    console.error("Fetch questions failed", e);
    return [];
  }
};
