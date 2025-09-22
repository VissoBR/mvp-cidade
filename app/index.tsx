// app/index.tsx
import { DEFAULT_ICON, SPORT_ICONS } from "@/lib/sportsIcons";
import { Picker } from "@react-native-picker/picker";
import * as Location from "expo-location";
import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Button, Image, Platform, Text, View } from "react-native";
import { SPORTS } from "../lib/sports";
import { useActivities } from "../store/useActivities";

// importa o mapa só no mobile (evita erro no web)
let MapView: any, Marker: any;
if (Platform.OS !== "web") {
  const RNMaps = require("react-native-maps");
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
}

export default function Home() {
  const router = useRouter();

  const [region, setRegion] = useState({
    latitude: -22.9,
    longitude: -43.2,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });
  const [locLoading, setLocLoading] = useState(true);

  // filtros
  const [days, setDays] = useState<1 | 7 | 30>(7);
  const [sportFilter, setSportFilter] = useState<string | undefined>(undefined);

  // store: busca e realtime
  const { activities, fetchUpcoming, loading, subscribeRealtime } = useActivities();

  // pegar localização uma vez
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setRegion((r) => ({
          ...r,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        }));
      }
      setLocLoading(false);
    })();
  }, []);

  // recarregar quando filtros mudarem + assinar realtime
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      await fetchUpcoming(days, sportFilter);
      unsub = subscribeRealtime();
    })();
    return () => unsub();
  }, [days, sportFilter]);

  // mensagem amigável se abrir no navegador por engano
  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold", textAlign: "center" }}>
          O mapa funciona no celular (Expo Go) ou emulador.
        </Text>
        <Text style={{ marginTop: 8, textAlign: "center" }}>
          Abra com o QR Code no seu aparelho para ver o mapa e os eventos.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView style={{ flex: 1 }} initialRegion={region} region={region}>
        {/* pin da sua localização (visual) */}
        <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} title="Você está aqui" />

        {/* pins vindos do Supabase */}
        {activities.map((a) => (
          <Marker coordinate={{ latitude: a.lat, longitude: a.lng }}>
            <View style={{ alignItems: "center" }}>
              <Image
                source={SPORT_ICONS[a.sport] || DEFAULT_ICON}
                style={{ width: 42, height: 42 }}           // 👈 controla tamanho aqui
                resizeMode="contain"
              />
              {/* opcional: label abaixo do ícone */}
              {/* <Text style={{ fontSize: 11, backgroundColor: "white", paddingHorizontal: 6, borderRadius: 10 }}>{a.sport}</Text> */}
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Filtros (barra flutuante) */}
      <View
        style={{
          position: "absolute",
          left: 12,
          right: 12,
          top: 12,
          backgroundColor: "rgba(255,255,255,0.95)",
          borderRadius: 12,
          padding: 8,
          gap: 8,
          elevation: 2,
        }}
      >
        {/* Chips de período */}
        <View style={{ flexDirection: "row", gap: 8, justifyContent: "space-between" }}>
          {([1, 7, 30] as const).map((opt) => (
            <Button
              key={opt}
              title={opt === 1 ? "Hoje" : `${opt}d`}
              onPress={() => setDays(opt)}
              color={days === opt ? "#1976D2" : "#9E9E9E"} // sempre string
            />
          ))}
        </View>

        {/* Picker de esporte */}
        <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, overflow: "hidden" }}>
          <Picker
            selectedValue={sportFilter ?? ""}
            onValueChange={(v: string) => setSportFilter(v === "" ? undefined : v)}
          >
            <Picker.Item label="Todos os esportes" value="" />
            {SPORTS.map((s) => (
              <Picker.Item key={s.id} label={s.name} value={s.id} />
            ))}
          </Picker>
        </View>

        {/* Contador */}
        <Text style={{ textAlign: "right", color: "#555" }}>{activities.length} atividade(s)</Text>
      </View>

      {/* botão flutuante para criar atividade */}
      <View style={{ position: "absolute", bottom: 30, right: 12 }}>
        <Link href="/create" asChild>
          <Button title="+ Criar" />
        </Link>
      </View>

      {/* loaders */}
      {(locLoading || loading) && (
        <View style={{ position: "absolute", bottom: 20, left: 0, right: 0, alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      )}
    </View>
  );
}
