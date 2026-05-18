import { QuizState } from '../app/casamatch'; // adjust import path

export interface MatchResult {
  id:          string;
  score:       number;
  matchReason: string;
  name:        string;
  location:    string;
  price:       string;
  tags:        string[];
  badge:       string | null;
  images:      string[];
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://your-api.com';

export async function fetchCasaMatches(quiz: QuizState): Promise<MatchResult[]> {
  const res = await fetch(`${API_BASE}/api/casa-match`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ quiz }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  return data.results as MatchResult[];
}