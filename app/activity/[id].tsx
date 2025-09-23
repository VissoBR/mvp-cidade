// app/activity/[id].tsx
import { SPORT_COLORS } from "@/lib/colors";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Button, Platform, Pressable, ScrollView, Share, Text, View } from "react-native";
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // contadores
  const [goingCount, setGoingCount] = useState(0);
  const [interestedCount, setInterestedCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [attendanceStatus, setAttendanceStatus] = useState<"going" | "interested" | null>(null);
  const [liked, setLiked] = useState(false);

  const when = useMemo(() => a ? new Date(a.starts_at) : null, [a]);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.from("activities").select("*").eq("id", id).single();

      if (error) {
        setErrorMessage(error.message ?? "Erro ao carregar atividade.");
        setA(null);
        return;
      }

      if (!data) {
        setErrorMessage("Atividade não encontrada.");
        setA(null);
        return;
      }

      setA(data as Activity);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao carregar atividade.";
      setErrorMessage(message);
      setA(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  const loadCounters = useCallback(async () => {
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
  }, [id]);

  const loadUserStatus = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) {
      setAttendanceStatus(null);
      setLiked(false);
      return;
    }

    const { data: attendanceData, error: attendanceError } = await supabase
      .from("attendances")
      .select("status")
      .eq("activity_id", id)
      .eq("user_id", uid)
      .maybeSingle();

    if (attendanceError) {
      console.warn("Erro ao carregar participação", attendanceError.message);
    }

    setAttendanceStatus(attendanceData?.status ?? null);

    const { data: likeData, error: likeError } = await supabase
      .from("likes")
      .select("id")
      .eq("activity_id", id)
      .eq("user_id", uid)
      .maybeSingle();

    if (likeError) {
      console.warn("Erro ao carregar curtida", likeError.message);
    }

    setLiked(!!likeData);
  }, [id]);

  useEffect(() => {
    loadActivity();
    loadCounters();
    loadUserStatus();

    // realtime: sempre que mudar attendances/likes dessa activity, recarrega contadores
    const ch = supabase
      .channel(`activity-${id}-counts`)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendances", filter: `activity_id=eq.${id}` }, loadCounters)
      .on("postgres_changes", { event: "*", schema: "public", table: "likes",       filter: `activity_id=eq.${id}` }, loadCounters)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [id, loadActivity, loadCounters, loadUserStatus]);

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

    const previous = attendanceStatus;

    if (previous === status) {
      const { error } = await supabase
        .from("attendances")
        .delete()
        .eq("activity_id", id)
        .eq("user_id", uid);

      if (error) {
        Alert.alert("Erro", error.message);
        return;
      }

      setAttendanceStatus(null);
      if (status === "going") {
        setGoingCount((count) => Math.max(0, count - 1));
      } else {
        setInterestedCount((count) => Math.max(0, count - 1));
      }
      return;
    }

    const { error } = await supabase.from("attendances").upsert({ activity_id: id, user_id: uid, status });
    if (error) {
      Alert.alert("Erro", error.message);
      return;
    }

    setAttendanceStatus(status);

    if (status === "going") {
      setGoingCount((count) => count + (previous === "going" ? 0 : 1));
      if (previous === "interested") {
        setInterestedCount((count) => Math.max(0, count - 1));
      }
    } else {
      setInterestedCount((count) => count + (previous === "interested" ? 0 : 1));
      if (previous === "going") {
        setGoingCount((count) => Math.max(0, count - 1));
      }
    }
    // contadores atualizam via realtime
  }

  async function toggleLike() {
    const uid = await requireLogin();
    if (!uid) return;

    if (liked) {
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("activity_id", id)
        .eq("user_id", uid);

      if (error) {
        Alert.alert("Erro", error.message);
        return;
      }

      setLiked(false);
      setLikesCount((count) => Math.max(0, count - 1));
      return;
    }

    const { error } = await supabase.from("likes").insert({ activity_id: id, user_id: uid });

    if (error) {
      Alert.alert("Erro", error.message);
      return;
    }

    setLiked(true);
    setLikesCount((count) => count + 1);
    // contadores via realtime
  }

  if (loading) {
    return (
      <View style={{ flex:1, alignItems:"center", justifyContent:"center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={{ flex: 1, padding: 16, alignItems: "center", justifyContent: "center", gap: 12 }}>
        <Text style={{ fontSize: 16, textAlign: "center", color: "#37474F" }}>{errorMessage}</Text>
        <View style={{ width: "100%", gap: 8 }}>
          <Button title="Tentar novamente" onPress={loadActivity} />
          <Button title="Voltar ao mapa" onPress={() => router.replace("/")} />
        </View>
      </View>
    );
  }

  if (!a) {
    return null;
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
              pinColor={SPORT_COLORS[a.sport] ?? "#1976D2"}
            />
          </MapView>
        </View>
      )}

      <View style={{ flexDirection:"row", gap:8, justifyContent:"space-between" }}>
        <View style={{ flex:1 }}>
          <SelectionButton
            selected={attendanceStatus === "going"}
            title={`Vou (${goingCount})`}
            onPress={() => markAttendance("going")}
          />
        </View>
        <View style={{ flex:1 }}>
          <SelectionButton
            selected={attendanceStatus === "interested"}
            title={`Interesse (${interestedCount})`}
            onPress={() => markAttendance("interested")}
          />
        </View>
      </View>
      <View style={{ marginTop: 8 }}>
          <Button title="Compartilhar" onPress={shareActivity} />
      </View>


      <View>
        <SelectionButton
          selected={liked}
          title={`Curtir (${likesCount})`}
          onPress={toggleLike}
        />
      </View>

      <View style={{ marginTop: 8 }}>
        <Button title="Voltar ao mapa" onPress={() => router.replace("/")} />
      </View>
    </ScrollView>
  );
}

type SelectionButtonProps = {
  selected: boolean;
  title: string;
  onPress: () => void;
};

function SelectionButton({ selected, title, onPress }: SelectionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: selected ? "#1976D2" : "#CFD8DC",
        backgroundColor: selected ? "#1976D2" : "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ color: selected ? "#FFFFFF" : "#1976D2", fontWeight: "600" }}>
        {selected ? `✓ ${title}` : title}
      </Text>
    </Pressable>
  );
}
