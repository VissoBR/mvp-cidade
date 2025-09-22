// components/MapPin.tsx
import { Image, View } from "react-native";

type Props = {
  icon: any;                 // require(...) do PNG
  color?: string;            // cor do pin (borda/ponta)
  bg?: string;               // fundo atrás do ícone
  size?: number;             // diâmetro da “bolinha” do pin
  border?: string;           // cor da borda da bolinha
};

export default function MapPin({
  icon,
  color = "#1976D2",
  bg = "#FFFFFF",
  size = 40,
  border = "#FFFFFF",
}: Props) {
  const circle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: bg,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 2,
    borderColor: border,
    // sombra sutil (iOS/Android)
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  };

  const pointer = {
    width: 0,
    height: 0,
    borderLeftWidth: size * 0.18,
    borderRightWidth: size * 0.18,
    borderTopWidth: size * 0.22,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: color,
    marginTop: -1,
  };

  const ring = {
    position: "absolute" as const,
    bottom: -size * 0.30,
    width: size * 0.6,
    height: size * 0.18,
    borderRadius: size,
    backgroundColor: "rgba(0,0,0,0.15)",
  };

  return (
    <View style={{ alignItems: "center" }}>
      {/* “gota” = círculo + ponteiro */}
      <View style={[circle, { borderColor: color }]}>
        <Image source={icon} style={{ width: size * 0.6, height: size * 0.6 }} resizeMode="contain" />
      </View>
      <View style={pointer} />
      {/* sombra no chão (oval) */}
      <View style={ring} />
    </View>
  );
}
