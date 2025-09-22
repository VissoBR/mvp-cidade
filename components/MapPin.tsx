// components/MapPin.tsx
import { Image, Text, View } from "react-native";

type Props = {
  icon: any;                 // require(...) do PNG
  color?: string;            // cor do pin (borda/ponta)
  bg?: string;               // fundo atrás do ícone
  size?: number;             // diâmetro da “bolinha” do pin
  onIconLoaded?: () => void; // callback opcional quando o ícone terminar de carregar
  monochromeIcon?: boolean;  // define se o ícone é monocromático e pode receber tintColor
};

type PinStyleOptions = {
  color: string;
  bg?: string;
  size: number;
};

const buildPinStyles = ({ color, bg, size }: PinStyleOptions) => {
  const backgroundColor = bg ?? "#FFFFFF";

  return {
    circle: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderWidth: 2,
      borderColor: color,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 3,
    },
    pointer: {
      width: 0,
      height: 0,
      borderLeftWidth: size * 0.18,
      borderRightWidth: size * 0.18,
      borderTopWidth: size * 0.22,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderTopColor: color,
      marginTop: -1,
    },
    ring: {
      position: "absolute" as const,
      bottom: -size * 0.3,
      width: size * 0.6,
      height: size * 0.18,
      borderRadius: size,
      backgroundColor: "rgba(0,0,0,0.15)",
    },
  } as const;
};

export default function MapPin({
  icon,
  color = "#1976D2",
  bg,
  size = 40,
  onIconLoaded,
  monochromeIcon = false,
}: Props) {
  const fillColor = bg ?? "#FFFFFF";
  const { circle, pointer, ring } = buildPinStyles({ color, bg, size });

  const iconStyle = {
    width: size * 0.6,
    height: size * 0.6,
    tintColor: monochromeIcon && fillColor === color ? "#FFFFFF" : undefined,
  } as const;

  return (
    <View style={{ alignItems: "center" }} collapsable={false}>
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

type ClusterPinProps = {
  count: number;
  color?: string;
  size?: number;
  textColor?: string;
};

export function MapClusterPin({
  count,
  color = "#1976D2",
  size = 48,
  textColor = "#FFFFFF",
}: ClusterPinProps) {
  const { circle, pointer, ring } = buildPinStyles({ color, bg: color, size });
  const displayCount = count > 999 ? "999+" : String(count);
  const labelLength = displayCount.length;
  const fontSize =
    labelLength >= 4
      ? size * 0.28
      : labelLength === 3
        ? size * 0.32
        : labelLength === 2
          ? size * 0.36
          : size * 0.42;

  return (
    <View style={{ alignItems: "center" }} collapsable={false}>
      <View style={circle}>
        <Text
          style={{
            color: textColor,
            fontWeight: "700",
            fontSize,
          }}
        >
          {displayCount}
        </Text>
      </View>
      <View style={pointer} />
      <View style={ring} />
    </View>
  );
}
