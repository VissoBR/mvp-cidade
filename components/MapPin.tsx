// components/MapPin.tsx
import { Image, View } from "react-native";

type Props = {
  icon: any;                 // require(...) do PNG
  color?: string;            // cor do pin (borda/ponta)
  bg?: string;               // fundo atrás do ícone
  size?: number;             // diâmetro da “bolinha” do pin
  border?: string;           // cor da borda da bolinha
  onIconLoaded?: () => void; // callback opcional quando o ícone terminar de carregar
};

export default function MapPin({
  icon,
  color = "#1976D2",
  bg,
  size = 40,
  border,
  onIconLoaded,
}: Props) {
  const backgroundColor = bg ?? color;
  const borderColor = border ?? color;

  const circle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 2,
    borderColor,
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

  const iconStyle = {
    width: size * 0.6,
    height: size * 0.6,
    tintColor: backgroundColor === color ? "#FFFFFF" : undefined,
  } as const;

  return (
    <View style={{ alignItems: "center" }}>
      {/* “gota” = círculo + ponteiro */}
      <View style={circle}>
        <Image
          source={icon}
          style={iconStyle}
          resizeMode="contain"
          onLoad={() => onIconLoaded?.()}
        />
      </View>
      <View style={pointer} />
      {/* sombra no chão (oval) */}
      <View style={ring} />
    </View>
  );
}
