// components/MapPicker.tsx
import { useEffect, useRef } from "react";
import { Platform, View } from "react-native";

let MapView: any, Marker: any;
if (Platform.OS !== "web") {
  const RNMaps = require("react-native-maps");
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
}

type Props = {
  value: { lat: number; lng: number };
  onChange: (coords: { lat: number; lng: number }) => void;
  initialRegion?: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
};

export default function MapPicker({ value, onChange, initialRegion }: Props) {
  const mapRef = useRef<any>(null);
  const hasCenteredOnInitialValue = useRef(false);
  const defaultLatitudeDelta = 0.02;
  const defaultLongitudeDelta = 0.02;

  const fallbackRegion = {
    latitude: value.lat,
    longitude: value.lng,
    latitudeDelta: defaultLatitudeDelta,
    longitudeDelta: defaultLongitudeDelta,
  };

  const latitudeDelta = initialRegion?.latitudeDelta ?? defaultLatitudeDelta;
  const longitudeDelta = initialRegion?.longitudeDelta ?? defaultLongitudeDelta;

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    if (!mapRef.current) {
      return;
    }

    if (!hasCenteredOnInitialValue.current) {
      hasCenteredOnInitialValue.current = true;
      return;
    }

    mapRef.current.animateToRegion({
      latitude: value.lat,
      longitude: value.lng,
      latitudeDelta,
      longitudeDelta,
    });
  }, [value.lat, value.lng, latitudeDelta, longitudeDelta]);

  if (Platform.OS === "web") {
    // No web, só um placeholder
    return <View style={{ height: 200, backgroundColor: "#eee", borderRadius: 8 }} />;
  }

  return (
    <View style={{ height: 240, borderRadius: 8, overflow: "hidden" }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={initialRegion || fallbackRegion}
        onLongPress={(e: any) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          onChange({ lat: latitude, lng: longitude });
        }}
      >
        <Marker
          coordinate={{ latitude: value.lat, longitude: value.lng }}
          draggable
          onDragEnd={(e: any) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            onChange({ lat: latitude, lng: longitude });
          }}
          title="Local da atividade"
          description="Arraste o pin ou toque e segure para marcar"
        />
      </MapView>
    </View>
  );
}
