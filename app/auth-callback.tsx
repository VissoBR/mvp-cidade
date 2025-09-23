// app/auth-callback.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/useAuth";

function collectParams(rawUrl: string): URLSearchParams {
  const params = new URLSearchParams();

  try {
    const parsedUrl = new URL(rawUrl);
    parsedUrl.searchParams.forEach((value, key) => {
      params.set(key, value);
    });

    if (parsedUrl.hash) {
      const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ""));
      hashParams.forEach((value, key) => {
        params.set(key, value);
      });
    }

    return params;
  } catch (error) {
    console.warn("Não foi possível analisar URL de autenticação usando URL API", error);
    // fallback to manual parsing below
  }

  const hashIndex = rawUrl.indexOf("#");
  const queryIndex = rawUrl.indexOf("?");

  if (queryIndex !== -1) {
    const end = hashIndex === -1 ? rawUrl.length : hashIndex;
    const query = rawUrl.slice(queryIndex + 1, end);
    const queryParams = new URLSearchParams(query);
    queryParams.forEach((value, key) => {
      params.set(key, value);
    });
  }

  if (hashIndex !== -1) {
    const hashParams = new URLSearchParams(rawUrl.slice(hashIndex + 1));
    hashParams.forEach((value, key) => {
      params.set(key, value);
    });
  }

  return params;
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState("Aguardando link de login...");
  const lastHandledUrl = useRef<string | null>(null);
  const processingRef = useRef(false);

  const finalizeAuthFromUrl = useCallback(
    async (rawUrl: string) => {
      if (!rawUrl || lastHandledUrl.current === rawUrl || processingRef.current) {
        return;
      }

      lastHandledUrl.current = rawUrl;
      processingRef.current = true;
      setStatusMessage("Finalizando login...");

      try {
        const params = collectParams(rawUrl);
        const code = params.get("code");
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else {
          throw new Error("URL de autenticação inválida.");
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        useAuth.setState({ session, loading: false });

        router.replace("/");
      } catch (error) {
        console.error("Erro ao processar auth callback", error);
        useAuth.setState({ loading: false });
        Alert.alert(
          "Erro ao entrar",
          "Não foi possível completar o login. Tente novamente com um novo link.",
        );
        lastHandledUrl.current = null;
        router.replace("/auth");
      } finally {
        processingRef.current = false;
      }
    },
    [router],
  );

  useEffect(() => {
    let isMounted = true;

    const getInitialUrl = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && isMounted) {
          await finalizeAuthFromUrl(initialUrl);
        }
      } catch (error) {
        console.error("Erro ao obter URL inicial de autenticação", error);
      }
    };

    void getInitialUrl();

    return () => {
      isMounted = false;
    };
  }, [finalizeAuthFromUrl]);

  const currentUrl = Linking.useURL();

  useEffect(() => {
    if (!currentUrl) {
      setStatusMessage("Aguardando link de login...");
      return;
    }

    void finalizeAuthFromUrl(currentUrl);
  }, [currentUrl, finalizeAuthFromUrl]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 16,
      }}
    >
      <ActivityIndicator size="large" />
      <Text style={{ textAlign: "center" }}>{statusMessage}</Text>
    </View>
  );
}
