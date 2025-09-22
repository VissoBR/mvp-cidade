// store/useAuth.ts
import { create } from "zustand";
import { supabase } from "../lib/supabase";

type AuthState = {
  session: import("@supabase/supabase-js").Session | null;
  loading: boolean;
  hydrate: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  session: null,
  loading: true,

  async hydrate() {
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, loading: false });

    // escuta mudanças de sessão (login/logout)
    supabase.auth.onAuthStateChange((_event, newSession) => {
      set({ session: newSession, loading: false });
    });
  },

  async signInWithEmail(email: string) {
    // envia magic link; ao clicar no e-mail no celular, volta para o app via scheme
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: "mvpcidade://auth-callback",
      },
    });
    if (error) throw new Error(error.message);
  },

  async signOut() {
    await supabase.auth.signOut();
    set({ session: null });
  },
}));