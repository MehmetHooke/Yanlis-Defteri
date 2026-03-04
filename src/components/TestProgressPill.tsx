import { useTheme } from "@/src/context/ThemeContext";
import React, { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

export default function TestProgressPill({
  index,
  total,
  color,
}: {
  index: number;
  total: number;
  color?: string;
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  const [width, setWidth] = useState(0);

  const safeTotal = Math.max(0, total);
  const safeIndex = Math.max(0, Math.min(index, Math.max(0, safeTotal - 1)));

  const { label, ratio } = useMemo(() => {
    if (safeTotal <= 0) return { label: "0 / 0", ratio: 0 };

    const current = safeIndex + 1;
    const r = current / safeTotal;

    return {
      label: `${current} / ${safeTotal}`,
      ratio: Math.max(0, Math.min(1, r)),
    };
  }, [safeIndex, safeTotal]);

  const fillColor = color ?? c.accent;

  const fillW = useSharedValue(0);

  useEffect(() => {
    if (!width) return;

    fillW.value = withTiming(width * ratio, {
      duration: 420,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [ratio, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: fillW.value,
  }));

  return (
    <View
      style={{
        width: "100%",
        borderRadius: 999,
        padding: 3,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.borderStrong,
      }}
    >
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{
          height: 32,
          borderRadius: 999,
          overflow: "hidden",
          backgroundColor: c.inputBg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Animated fill */}
        <Animated.View
          style={[
            {
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              backgroundColor: fillColor,
            },
            fillStyle,
          ]}
        />

        {/* Label */}
        <Text
          style={{
            color: c.text,
            fontWeight: "900",
            fontSize: 13,
            letterSpacing: 0.3,
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}