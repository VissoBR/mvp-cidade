// components/MapPicker.tsx
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
  if (Platform.OS === "web") {
    // No web, só um placeholder
    return <View style={{ height: 200, backgroundColor: "#eee", borderRadius: 8 }} />;
  }

  return (
    <View style={{ height: 240, borderRadius: 8, overflow: "hidden" }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={
          initialRegion || {
            latitude: value.lat,
            longitude: value.lng,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }
        }
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
