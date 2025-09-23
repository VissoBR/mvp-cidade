// components/MapPin.tsx
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { Activity as ActivityType } from "../lib/supabase";

type PinStyleOptions = {
  color: string;
  backgroundColor?: string;
  ringColor?: string;
  size: number;
};

const buildPinStyles = ({
  color,
  backgroundColor,
  ringColor,
  size,
}: PinStyleOptions) => {
  const fillColor = backgroundColor ?? color;

  return {
    circle: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: fillColor,
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
      backgroundColor: ringColor ?? "rgba(0,0,0,0.15)",
    },
  } as const;
};

type MapPinBaseProps = {
  color: string;
  backgroundColor?: string;
  ringColor?: string;
  size?: number;
  children?: ReactNode;
};

export function MapPinBase({
  color,
  backgroundColor,
  ringColor,
  size = 40,
  children,
}: MapPinBaseProps) {
  const { circle, pointer, ring } = buildPinStyles({
    color,
    backgroundColor,
    ringColor,
    size,
  });

  return (
    <View style={{ alignItems: "center" }} collapsable={false}>
      <View style={circle}>{children}</View>
      <View style={pointer} />
      <View style={ring} />
    </View>
  );
}

type ClusterPinProps = {
  count: number;
  activities?: ActivityType[];
};

export function MapClusterPin({ count }: ClusterPinProps) {
  const size = count >= 100 ? 60 : count >= 10 ? 50 : 40;
  const displayCount = count > 999 ? "999+" : String(count);
  const labelLength = displayCount.length;
  const fontSize =
    labelLength >= 4
      ? size * 0.32
      : labelLength === 3
        ? size * 0.36
        : size * 0.4;

  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: "#FFFFFF",
        borderWidth: 3,
        borderColor: "#FF0000",
        borderRadius: size / 2,
        justifyContent: "center",
        alignItems: "center",
      }}
      collapsable={false}
    >
      <Text
        style={{
          color: "#000000",
          fontWeight: "700",
          fontSize,
          textAlign: "center",
        }}
      >
        {displayCount}
      </Text>
    </View>
  );
}
