// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anon);

export type Activity = {
  id: string;
  title: string;
  sport: string;           // vai receber o id do catálogo local (ex.: "corrida")
  description?: string;
  starts_at: string;       // ISO
  lat: number;
  lng: number;
  creator_id: string | null;
  created_at: string;
};
