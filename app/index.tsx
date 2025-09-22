// app/index.tsx
import { DEFAULT_ICON, SPORT_ICONS } from "@/lib/sportsIcons";
import { Picker } from "@react-native-picker/picker";
import * as Location from "expo-location";
import { Link, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Button, Platform, Pressable, Text, View } from "react-native";
import MapPin from "../components/MapPin";
import { SPORT_COLORS } from "../lib/colors"; // se você tiver esse mapa; senão pode fixar uma cor
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
  const [markerIconsLoaded, setMarkerIconsLoaded] = useState<Record<string, boolean>>({});

  // filtros
  const [days, setDays] = useState<1 | 7 | 30>(7);
  const [sportFilter, setSportFilter] = useState<string | undefined>(undefined);

  // store: busca e realtime
  const { activities, fetchUpcoming, loading, subscribeRealtime } = useActivities();

  const handleMarkerIconLoaded = useCallback((activityId: string) => {
    setMarkerIconsLoaded((prev) => {
      if (prev[activityId]) {
        return prev;
      }
      return { ...prev, [activityId]: true };
    });
  }, []);

  useEffect(() => {
    setMarkerIconsLoaded((prev) => {
      const currentIds = new Set(activities.map((activity) => activity.id));
      let removed = false;
      const next: Record<string, boolean> = {};

      Object.keys(prev).forEach((id) => {
        if (currentIds.has(id)) {
          next[id] = prev[id];
        } else {
          removed = true;
        }
      });

      return removed ? next : prev;
    });
  }, [activities]);

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
          <Marker
            key={a.id}
            coordinate={{ latitude: a.lat, longitude: a.lng }}
            title={a.title}
            description={`${new Date(a.starts_at).toLocaleDateString()} ${new Date(a.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            anchor={{ x: 0.5, y: 1 }} // 👈 a “ponta” encosta no local
            tracksViewChanges={!markerIconsLoaded[a.id]} // mantém tracking até o ícone aparecer
            onPress={() =>
              router.push({
                pathname: "/activity/[id]" as const,
                params: { id: String(a.id) },
              })
            }
          >
            <MapPin
              icon={SPORT_ICONS[a.sport] || DEFAULT_ICON}
              color={SPORT_COLORS?.[a.sport] || "#1976D2"}
              size={40} // ajuste 36–48 conforme seu gosto
              onIconLoaded={() => handleMarkerIconLoaded(a.id)}
            />
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
          {([1, 7, 30] as const).map((opt) => {
            const isActive = days === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => setDays(opt)}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#E0E0E0",
                    opacity: pressed ? 0.85 : 1,
                  },
                  isActive && { backgroundColor: "#1976D2" },
                ]}
              >
                <Text
                  style={{
                    color: isActive ? "#FFFFFF" : "#424242",
                    fontWeight: "600",
                  }}
                >
                  {opt === 1 ? "Hoje" : `${opt}d`}
                </Text>
              </Pressable>
            );
          })}
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
