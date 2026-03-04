// app/(tabs)/test/index.tsx
import { useTheme } from "@/src/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Brain, Shuffle, Timer } from "lucide-react-native";
import { useMemo } from "react";
import { ImageBackground, Pressable, Text, View } from "react-native";

function ModeCard({
  title,
  desc,
  icon,
  disabled,
  onPress,
  badge,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  badge?: string;
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  const chipStyle = useMemo(
    () => ({
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.border,
      alignSelf: "flex-start" as const,
    }),
    [c]
  );

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        { borderRadius: 18, marginBottom: 12 },
        { opacity: disabled ? 0.55 : pressed ? 0.92 : 1 },
      ]}
    >
      <LinearGradient
        colors={theme.lessonCard.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 18,
          padding: 14,
          marginBottom: 10,
          borderWidth: theme.lessonCard.edgeBorderWidth,
          borderColor: theme.lessonCard.edgeBorderColor,
          ...theme.lessonCard.shadow,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              backgroundColor: c.tabActiveBg,
              borderWidth: 1,
              borderColor: c.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontWeight: "900", fontSize: 16 }}>
              {title}
            </Text>

            <Text
              style={{
                color: c.mutedText,
                marginTop: 6,
                fontWeight: "700",
                fontSize: 12,
                lineHeight: 17,
              }}
            >
              {desc}
            </Text>

            <View style={{ marginTop: 10, flexDirection: "row", gap: 8, alignItems: "center" }}>
              {!!badge && (
                <View style={chipStyle}>
                  <Text style={{ color: c.mutedText, fontSize: 11, fontWeight: "800" }}>
                    {badge}
                  </Text>
                </View>
              )}

              {disabled ? (
                <View style={chipStyle}>
                  <Text style={{ color: c.mutedText, fontSize: 11, fontWeight: "800" }}>
                    Yakında
                  </Text>
                </View>
              ) : (
                <View style={chipStyle}>
                  <Text style={{ color: c.mutedText, fontSize: 11, fontWeight: "800" }}>
                    Testi Başlat
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function TestSelectScreen() {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 18, paddingBottom: 10 }}>
        <Text style={{ color: c.text, fontSize: 22, fontWeight: "900" }}>
          Test Yap
        </Text>
        <Text style={{ color: c.mutedText, marginTop: 4, fontWeight: "700" }}>
          İhtiyacına göre bir mod seç.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
        <ModeCard
          title="Mod 1 — Zayıf Nokta Testi"
          desc="En çok ‘çözemedim’ aldığın sorulardan 5 soru."
          icon={<Brain size={18} color={c.accent} />}
          onPress={() => router.push("/(test)/mod1")}
        />

        <ModeCard
          title="Mod 2 — Karma Tekrar"
          desc="2 zayıf + 2 orta + 1 güçlü (moral + toparlama)."
          icon={<Shuffle size={18} color={c.accent} />}
          disabled
        />

        <ModeCard
          title="Mod 3 — Kalıcılık Kontrolü"
          desc="Uzun süredir bakmadığın ‘çözdüm’ soruları."
          icon={<Timer size={18} color={c.accent} />}
          disabled
        />
      </View>
    </ImageBackground>
  );
}