// store/useAuth.ts
import * as Linking from "expo-linking";
import { create } from "zustand";
import { supabase } from "../lib/supabase";

type AuthSubscription = ReturnType<
  typeof supabase.auth.onAuthStateChange
>["data"]["subscription"];

let authSubscription: AuthSubscription | null = null;
let hydrationPromise: Promise<void> | null = null;
let hydrationConsumers = 0;

type AuthState = {
  session: import("@supabase/supabase-js").Session | null;
  loading: boolean;
  hydrate: () => Promise<void>;
  clearAuthListener: () => void;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  loading: true,

  async hydrate() {
    hydrationConsumers += 1;

    const hadSubscription = Boolean(authSubscription);

    if (!authSubscription) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, newSession) => {
        set({ session: newSession, loading: false });
      });
      authSubscription = subscription;
    }

    const shouldFetchSession = !hadSubscription || get().loading;

    if (shouldFetchSession) {
      if (!hydrationPromise) {
        hydrationPromise = supabase.auth
          .getSession()
          .then(({ data: { session } }) => {
            set({ session, loading: false });
          })
          .finally(() => {
            hydrationPromise = null;
          });
      }

      return hydrationPromise;
    }

    if (hydrationPromise) {
      return hydrationPromise;
    }

    return Promise.resolve();
  },

  clearAuthListener() {
    if (hydrationConsumers > 0) {
      hydrationConsumers -= 1;
    }

    if (hydrationConsumers === 0 && authSubscription) {
      authSubscription.unsubscribe();
      authSubscription = null;
    }
  },

  async signInWithEmail(email: string) {
    // envia magic link; ao clicar no e-mail no celular, volta para o app via scheme
    const redirectTo = Linking.createURL("/auth-callback", {
      scheme: "mvpcidade",
    });
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    if (error) throw new Error(error.message);
  },

  async signOut() {
    await supabase.auth.signOut();
    set({ session: null });
  },
}));