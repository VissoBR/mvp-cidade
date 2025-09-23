// app/index.tsx
import { DEFAULT_ICON, SPORT_ICONS } from "@/lib/sportsIcons";
import { Picker } from "@react-native-picker/picker";
import * as Location from "expo-location";
import { Link, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Button, Platform, Pressable, Text, View } from "react-native";
import MapPin, { MapClusterPin } from "../components/MapPin";
import { SPORT_COLORS } from "../lib/colors"; // se você tiver esse mapa; senão pode fixar uma cor
import { SPORTS } from "../lib/sports";
import { useActivities } from "../store/useActivities";
import type { Activity as ActivityType } from "../lib/supabase";


// importa o mapa só no mobile (evita erro no web)
let MapView: any, Marker: any;
if (Platform.OS !== "web") {
  const RNMaps = require("react-native-maps");
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
}

type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type ClusterItem =
  | {
      type: "cluster";
      id: string;
      coordinate: { latitude: number; longitude: number };
      count: number;
      activities: ActivityType[];
      span: { latitudeDelta: number; longitudeDelta: number };
    }
  | { type: "activity"; activity: ActivityType };

type ClusterGroup = Extract<ClusterItem, { type: "cluster" }>;

const CLUSTERING_CONFIG = {
  minDeltaToCluster: 0.012,
  radiusFactor: 0.22,
  zoomStep: 0.55,
  clusterZoomPadding: 1.6,
  minZoomDelta: 0.003,
};

const REGION_EPSILON = 0.00001;

const ensureMinDelta = (value: number) => Math.max(value, CLUSTERING_CONFIG.minZoomDelta);

const regionsAreClose = (a: MapRegion, b: MapRegion) =>
  Math.abs(a.latitude - b.latitude) < REGION_EPSILON &&
  Math.abs(a.longitude - b.longitude) < REGION_EPSILON &&
  Math.abs(a.latitudeDelta - b.latitudeDelta) < REGION_EPSILON &&
  Math.abs(a.longitudeDelta - b.longitudeDelta) < REGION_EPSILON;

const buildActivityClusters = (activities: ActivityType[], region: MapRegion): ClusterItem[] => {
  if (!activities.length) {
    return [];
  }

  const baseDelta = Math.max(region.latitudeDelta, region.longitudeDelta);
  const safeDelta = Math.max(baseDelta, CLUSTERING_CONFIG.minZoomDelta);

  if (safeDelta <= CLUSTERING_CONFIG.minDeltaToCluster) {
    return activities.map((activity) => ({ type: "activity", activity }));
  }

  const distanceThreshold = safeDelta * CLUSTERING_CONFIG.radiusFactor;
  const clusters: { coordinate: { latitude: number; longitude: number }; activities: ActivityType[] }[] = [];

  activities.forEach((activity) => {
    let match = false;

    for (const cluster of clusters) {
      const latDiff = Math.abs(cluster.coordinate.latitude - activity.lat);
      const lngDiff = Math.abs(cluster.coordinate.longitude - activity.lng);

      if (latDiff <= distanceThreshold && lngDiff <= distanceThreshold) {
        cluster.activities.push(activity);
        const count = cluster.activities.length;
        cluster.coordinate.latitude += (activity.lat - cluster.coordinate.latitude) / count;
        cluster.coordinate.longitude += (activity.lng - cluster.coordinate.longitude) / count;
        match = true;
        break;
      }
    }

    if (!match) {
      clusters.push({
        coordinate: { latitude: activity.lat, longitude: activity.lng },
        activities: [activity],
      });
    }
  });

  const clusterItems: ClusterItem[] = [];

  clusters.forEach((cluster) => {
    if (cluster.activities.length <= 1) {
      clusterItems.push({ type: "activity", activity: cluster.activities[0] });
      return;
    }

    const ids = cluster.activities.map((item) => item.id).sort();
    const latitudes = cluster.activities.map((item) => item.lat);
    const longitudes = cluster.activities.map((item) => item.lng);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    clusterItems.push({
      type: "cluster",
      id: `cluster-${ids.join("-")}`,
      coordinate: cluster.coordinate,
      count: cluster.activities.length,
      activities: cluster.activities,
      span: {
        latitudeDelta: maxLat - minLat,
        longitudeDelta: maxLng - minLng,
      },
    });
  });

  return clusterItems;
};

const computeClusterZoomRegion = (cluster: ClusterGroup, region: MapRegion): MapRegion => {
  const paddedLat = ensureMinDelta(cluster.span.latitudeDelta * CLUSTERING_CONFIG.clusterZoomPadding);
  const paddedLng = ensureMinDelta(cluster.span.longitudeDelta * CLUSTERING_CONFIG.clusterZoomPadding);

  return {
    latitude: cluster.coordinate.latitude,
    longitude: cluster.coordinate.longitude,
    latitudeDelta: ensureMinDelta(
      Math.min(region.latitudeDelta * CLUSTERING_CONFIG.zoomStep, paddedLat)
    ),
    longitudeDelta: ensureMinDelta(
      Math.min(region.longitudeDelta * CLUSTERING_CONFIG.zoomStep, paddedLng)
    ),
  };
};

export default function Home() {
  const router = useRouter();
  const mapRef = useRef<any>(null);

  const [region, setRegion] = useState<MapRegion>({
    latitude: -22.9,
    longitude: -43.2,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [locLoading, setLocLoading] = useState(true);
  const [markerIconsLoaded, setMarkerIconsLoaded] = useState<Record<string, boolean>>({});

  // filtros
  const [days, setDays] = useState<1 | 7 | 30>(7);
  const [sportFilter, setSportFilter] = useState<string | undefined>(undefined);

  // store: busca e realtime
  const { activities, fetchUpcoming, loading, subscribeRealtime } = useActivities();

  const clusterItems = useMemo(
    () => buildActivityClusters(activities, region),
    [activities, region]
  );

  const handleMarkerIconLoaded = useCallback((activityId: string) => {
    setMarkerIconsLoaded((prev) => {
      if (prev[activityId]) {
        return prev;
      }
      return { ...prev, [activityId]: true };
    });
  }, []);

  const handleRegionChangeComplete = useCallback((nextRegion: MapRegion) => {
    setRegion((current) => (regionsAreClose(current, nextRegion) ? current : nextRegion));
  }, []);

  const handleClusterPress = useCallback(
    (cluster: ClusterGroup) => {
      const nextRegion = computeClusterZoomRegion(cluster, region);
      mapRef.current?.animateToRegion(nextRegion, 280);
      setRegion(nextRegion);
    },
    [region]
  );

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
        const nextLocation = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setUserLocation(nextLocation);
        setRegion((r) => ({
          ...r,
          ...nextLocation,
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
      unsub = subscribeRealtime({ days, sport: sportFilter });
    })();
    return () => unsub();
  }, [days, fetchUpcoming, sportFilter, subscribeRealtime]);

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
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={region}
        region={region}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {/* pin da sua localização (visual) */}
        <Marker
          coordinate={
            userLocation ?? { latitude: region.latitude, longitude: region.longitude }
          }
          title="Você está aqui"
        />

        {/* pins vindos do Supabase (com clustering) */}
        {clusterItems.map((item) => {
          if (item.type === "cluster") {
            return (
              <Marker
                key={item.id}
                coordinate={item.coordinate}
                anchor={{ x: 0.5, y: 1 }}
                tracksViewChanges={false}
                title={`${item.count} atividades próximas`}
                description="Toque para aproximar"
                onPress={() => handleClusterPress(item)}
              >
                <MapClusterPin count={item.count} />
              </Marker>
            );
          }

          const a = item.activity;
          return (
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
          );
        })}
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
