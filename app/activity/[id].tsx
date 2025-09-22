// app/activity/[id].tsx
import MapPin from "@/components/MapPin";
import { SPORT_COLORS } from "@/lib/colors";
import { DEFAULT_ICON, SPORT_ICONS } from "@/lib/sportsIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Button, Platform, ScrollView, Share, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";


// mini-mapa condicional
let MapView: any, Marker: any;
if (Platform.OS !== "web") {
  const RNMaps = require("react-native-maps");
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
}

type Activity = {
  id: string;
  title: string;
  sport: string;
  description?: string;
  starts_at: string;
  lat: number;
  lng: number;
  creator_id: string | null;
  created_at: string;
};

export default function ActivityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [a, setA] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [iconLoaded, setIconLoaded] = useState(false);

  // contadores
  const [goingCount, setGoingCount] = useState(0);
  const [interestedCount, setInterestedCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);

  const when = useMemo(() => a ? new Date(a.starts_at) : null, [a]);

  async function loadActivity() {
    setLoading(true);
    setIconLoaded(false);
    const { data, error } = await supabase.from("activities").select("*").eq("id", id).single();
    if (error) Alert.alert("Erro", error.message);
    setA(data as Activity);
    setLoading(false);
  }

  async function shareActivity() {
  if (!a) return;
  const when = new Date(a.starts_at);
  const date = when.toLocaleDateString();
  const time = when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const deepLink = `mvpcidade://activity/${a.id}`;

  const message =
    `Vamos nessa?\n` +
    `Atividade: ${a.title} (${a.sport})\n` +
    `Quando: ${date} ${time}\n` +
    `Onde: https://maps.google.com/?q=${a.lat},${a.lng}\n` +
    `Abrir no app: ${deepLink}`;

  try {
    await Share.share({ message });
  } catch (e) {
    console.warn("Erro ao compartilhar", e);
  }
}

  async function loadCounters() {
    // going
    const g = await supabase
      .from("attendances")
      .select("*", { count: "exact", head: true })
      .eq("activity_id", id)
      .eq("status", "going");
    setGoingCount(g.count || 0);

    // interested
    const it = await supabase
      .from("attendances")
      .select("*", { count: "exact", head: true })
      .eq("activity_id", id)
      .eq("status", "interested");
    setInterestedCount(it.count || 0);

    // likes
    const lk = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("activity_id", id);
    setLikesCount(lk.count || 0);
  }

  useEffect(() => {
    loadActivity();
    loadCounters();

    // realtime: sempre que mudar attendances/likes dessa activity, recarrega contadores
    const ch = supabase
      .channel(`activity-${id}-counts`)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendances", filter: `activity_id=eq.${id}` }, loadCounters)
      .on("postgres_changes", { event: "*", schema: "public", table: "likes",       filter: `activity_id=eq.${id}` }, loadCounters)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [id]);

  // ações (por enquanto pedem login)
  async function requireLogin(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      Alert.alert(
        "Login necessário",
        "Para participar ou curtir, faça login por e-mail.",
      );
      return null;
    }
    return session.user.id;
  }

  async function markAttendance(status: "going" | "interested") {
    const uid = await requireLogin();
    if (!uid) return;
    const { error } = await supabase.from("attendances").upsert({ activity_id: id, user_id: uid, status });
    if (error) Alert.alert("Erro", error.message);
    // contadores atualizam via realtime
  }

  async function toggleLike() {
    const uid = await requireLogin();
    if (!uid) return;

    // tenta deletar se já existe; se não existir, insere
    const exists = await supabase
      .from("likes")
      .select("id", { count: "exact" })
      .eq("activity_id", id)
      .eq("user_id", uid);
    if ((exists.count || 0) > 0) {
      await supabase.from("likes").delete().eq("activity_id", id).eq("user_id", uid);
    } else {
      await supabase.from("likes").insert({ activity_id: id, user_id: uid });
    }
    // contadores via realtime
  }

  if (loading || !a) {
    return (
      <View style={{ flex:1, alignItems:"center", justifyContent:"center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding:16, gap:12 }}>
      <Text style={{ fontSize:20, fontWeight:"bold" }}>{a.title}</Text>
      <Text>{a.sport} • {when?.toLocaleDateString()} {when?.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}</Text>
      {!!a.description && <Text style={{ color:"#444" }}>{a.description}</Text>}

      {Platform.OS !== "web" && (
        <View style={{ height: 200, borderRadius: 8, overflow:"hidden" }}>
          <MapView
            style={{ flex:1 }}
            initialRegion={{
              latitude: a.lat, longitude: a.lng,
              latitudeDelta: 0.02, longitudeDelta: 0.02
            }}
          >
            <Marker
              coordinate={{ latitude: a.lat, longitude: a.lng }}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={!iconLoaded}
            >
              <MapPin
                icon={SPORT_ICONS[a.sport] || DEFAULT_ICON}
                color={SPORT_COLORS?.[a.sport] || "#1976D2"}
                size={36}
                onIconLoaded={() => setIconLoaded(true)}
              />
            </Marker>
          </MapView>
        </View>
      )}

      <View style={{ flexDirection:"row", gap:8, justifyContent:"space-between" }}>
        <View style={{ flex:1 }}>
          <Button title={`Vou (${goingCount})`} onPress={() => markAttendance("going")} />
        </View>
        <View style={{ flex:1 }}>
          <Button title={`Interesse (${interestedCount})`} onPress={() => markAttendance("interested")} />
        </View>
      </View>
      <View style={{ marginTop: 8 }}>
          <Button title="Compartilhar" onPress={shareActivity} />
      </View>


      <View>
        <Button title={`Curtir (${likesCount})`} onPress={toggleLike} />
      </View>

      <View style={{ marginTop: 8 }}>
        <Button title="Voltar ao mapa" onPress={() => router.replace("/")} />
      </View>
    </ScrollView>
  );
}
