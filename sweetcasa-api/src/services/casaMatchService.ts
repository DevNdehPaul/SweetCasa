import AsyncStorage from '@react-native-async-storage/async-storage';
import { QuizState } from '../screens/casamatch'; // adjust path if needed

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface MatchResult {
  id:          string;
  score:       number;
  matchReason: string;
  name:        string;
  location:    string;
  price:       string;
  tags:        string[];
  badge:       string | null;
  imageUrl:    string | null;
  listingType: 'rent' | 'sale';
}

export async function fetchCasaMatches(quiz: QuizState): Promise<MatchResult[]> {
  const token = await AsyncStorage.getItem('token');

  const res = await fetch(`${API_BASE}/casa-match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ quiz }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `HTTP ${res.status}`);
  }

  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    return [];
  }

  return data.results as MatchResult[];
}
