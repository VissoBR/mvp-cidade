// store/useActivities.ts
import { create } from "zustand";
import { Activity, supabase } from "../lib/supabase";

type NewActivity = {
  title: string;
  sport: string;            // ex.: "corrida", "natacao"
  description?: string;
  starts_at: string;        // ISO
  lat: number;
  lng: number;
};

type State = {
  activities: Activity[];
  loading: boolean;
  fetchUpcoming: (days: number, sport?: string) => Promise<void>;
  createActivity: (input: NewActivity) => Promise<string | undefined>;
  subscribeRealtime: () => () => void;
};

export const useActivities = create<State>((set, get) => ({
  activities: [],
  loading: false,

  async fetchUpcoming(days, sport) {
    set({ loading: true });

    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + days);

    let query = supabase
      .from("activities")
      .select("*")
      .gte("starts_at", from.toISOString())
      .lte("starts_at", to.toISOString())
      .order("starts_at", { ascending: true });

    if (sport) {
      query = query.eq("sport", sport);
    }

    const { data, error } = await query;

    if (error) {
      console.warn(error.message);
      set({ loading: false });
      return;
    }

    set({ activities: (data || []) as Activity[], loading: false });
  },

  async createActivity(input) {
    // pega o usuário logado (se houver) p/ preencher creator_id
    const { data: { session } } = await supabase.auth.getSession();
    const creator_id = session?.user?.id ?? null;

    // id simples para MVP; se quiser, pode trocar por nanoid/non-secure
    const id = Math.random().toString(36).slice(2);

    const { error } = await supabase
      .from("activities")
      .insert([{ ...input, id, creator_id }]);

    if (error) {
      alert(error.message);
      return;
    }
    return id;
  },

  subscribeRealtime() {
    const ch = supabase
      .channel("activities-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activities" },
        () => { get().fetchUpcoming(7); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  },
}));
