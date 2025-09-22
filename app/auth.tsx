// app/auth.tsx
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Button, Text, TextInput, View } from "react-native";
import { useAuth } from "../store/useAuth";

export default function AuthScreen() {
  const router = useRouter();
  const { session, loading, hydrate, clearAuthListener, signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");

  useEffect(() => {
    void hydrate();
    return () => clearAuthListener();
  }, [clearAuthListener, hydrate]);

  // se já estiver logado, volta
  useEffect(() => {
    if (!loading && session) {
      router.replace("/");
    }
  }, [loading, router, session]);

  async function onSend() {
    if (!email.includes("@")) {
      Alert.alert("Digite um e-mail válido");
      return;
    }
    try {
      await signInWithEmail(email);
      Alert.alert("Verifique seu e-mail", "Enviamos um link de acesso. Abra no mesmo aparelho.");
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Não foi possível enviar o link.");
    }
  }

  return (
    <View style={{ flex:1, justifyContent:"center", padding:16, gap:12 }}>
      <Text style={{ fontSize:20, fontWeight:"bold" }}>Entrar por e-mail</Text>
      <Text>E-mail</Text>
      <TextInput
        placeholder="voce@exemplo.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth:1, borderRadius:6, padding:8 }}
      />
      <Button title="Enviar link de acesso" onPress={onSend} />
      <Text style={{ color:"#666" }}>
        Dica: abra o link do e-mail neste mesmo aparelho para entrar automaticamente.
      </Text>
    </View>
  );
}
