import { API_BASE_URL } from './config';

export interface DbStats {
  totalAnswers: number;
  correctAnswers: number;
  accuracy: string | number;
  uniqueUsersInDb: number;
}

export const fetchDbStats = async (): Promise<DbStats> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return await res.json();
  } catch (e) {
    console.error("Fetch stats failed", e);
    return { totalAnswers: 0, correctAnswers: 0, accuracy: 0, uniqueUsersInDb: 0 };
  }
};
