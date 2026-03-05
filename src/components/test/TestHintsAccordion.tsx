import { ChevronDown, ChevronUp, Lightbulb } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

import { useTheme } from "@/src/context/ThemeContext";

type HintItem = {
  id?: string;
  explanation?: string;
};

function HintsContent({ hints }: { hints: HintItem[] }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={{ gap: 12 }}>
      {hints.map((a, idx) => (
        <View
          key={a.id ?? String(idx)}
          style={{
            borderRadius: 18,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.borderStrong,
            padding: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Lightbulb size={14} color={"#EDB230"} />
            <Text style={{ color: c.text, fontWeight: "900" }}>
              Püf Nokta {idx + 1}
            </Text>
          </View>

          {a.explanation?.trim() ? (
            <View style={{ marginTop: 10 }}>
              <Text style={{ color: c.text, fontWeight: "900" }}>Açıklama:</Text>
              <Text style={{ color: c.mutedText, marginTop: 2, lineHeight: 20 }}>
                {a.explanation}
              </Text>
            </View>
          ) : (
            <Text style={{ color: c.mutedText, marginTop: 10 }}>Açıklama yok.</Text>
          )}
        </View>
      ))}
    </View>
  );
}

export default function TestHintsAccordion({
  hints,
  titleOpen = "Püf Noktaları Gizle",
  titleClosed = "Püf Noktalarını Göster",
}: {
  hints?: HintItem[];
  titleOpen?: string;
  titleClosed?: string;
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  const safeHints = useMemo(() => hints ?? [], [hints]);
  const hasHints = safeHints.length > 0;
  if (!hasHints) return null;

  const [open, setOpen] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState(0);

  const animH = useSharedValue(0);

  // ✅ Animasyonu sadece effect ile yönet (warning biter)
  useEffect(() => {
    animH.value = withTiming(open ? measuredHeight : 0, { duration: 220 });
  }, [open, measuredHeight]);

  const toggle = () => {
    setOpen((p) => !p); // ✅ burada animH.value yazmıyoruz
  };

  const aStyle = useAnimatedStyle(() => ({ height: animH.value }));

  return (
    <View style={{ marginTop: 8 }}>
      {/* Toggle */}
      <Pressable
        onPress={toggle}
        style={{
          borderRadius: 16,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.borderStrong,
          paddingVertical: 14,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Lightbulb size={18} color={"#EDB230"} />
          <Text style={{ color: c.text, fontWeight: "900" }}>
            {open ? titleOpen : titleClosed}
          </Text>
        </View>

        {open ? (
          <ChevronUp size={18} color={c.mutedText} />
        ) : (
          <ChevronDown size={18} color={c.mutedText} />
        )}
      </Pressable>

      {/* Hidden measurer */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          opacity: 0,
          zIndex: -1,
          left: 0,
          right: 0,
          top: 0,
        }}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (Math.abs(h - measuredHeight) > 1) setMeasuredHeight(h);
        }}
      >
        <View style={{ marginTop: 12 }}>
          <HintsContent hints={safeHints} />
        </View>
      </View>

      {/* Animated content */}
      <Animated.View style={[{ overflow: "hidden" }, aStyle]}>
        <View style={{ marginTop: 12 }}>
          <HintsContent hints={safeHints} />
        </View>
      </Animated.View>
    </View>
  );
}