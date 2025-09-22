// app/_layout.tsx
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { Button } from "react-native";
import { useAuth } from "../store/useAuth";

export default function Layout() {
  const router = useRouter();
  const { session, loading, hydrate, signOut } = useAuth();

  useEffect(() => { hydrate(); }, []);

  return (
    <Stack
      screenOptions={{
        headerTitle: "Onde tem Esporte?",
        headerRight: () =>
          loading ? null : session ? (
            <Button title="Sair" onPress={signOut} />
          ) : (
            <Button title="Entrar" onPress={() => router.push("/auth")} />
          ),
      }}
    />
  );
}
