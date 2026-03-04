// app/(tabs)/test/result.tsx
import { useTheme } from "@/src/context/ThemeContext";
import { router, useLocalSearchParams } from "expo-router";
import { ImageBackground, Pressable, Text, View } from "react-native";

export default function TestResultScreen() {
  const { theme } = useTheme();
  const c = theme.colors;

  const { mode, total, solved } = useLocalSearchParams<{
    mode?: string;
    total?: string;
    solved?: string;
  }>();

  const t = Number(total ?? "0");
  const s = Number(solved ?? "0");
  const rate = t > 0 ? Math.round((s / t) * 100) : 0;

  return (
    <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 18, paddingTop: 70 }}>
        <Text style={{ color: c.text, fontSize: 22, fontWeight: "900" }}>
          Test Bitti 🎉
        </Text>
        <Text style={{ color: c.mutedText, marginTop: 6, fontWeight: "700" }}>
          {mode === "mod1" ? "Zayıf Nokta Sınavını bitirdiniz" : "Test"}
        </Text>

        <View
          style={{
            marginTop: 16,
            borderRadius: 18,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.borderStrong,
            padding: 16,
          }}
        >
          <Text style={{ color: c.mutedText, fontWeight: "800" }}>Başarı Oranı</Text>
          <Text style={{ color: c.text, fontSize: 34, fontWeight: "900", marginTop: 6 }}>
            %{rate}
          </Text>
          <Text style={{ color: c.mutedText, marginTop: 6, fontWeight: "700" }}>
            {s} / {t} çözdün
          </Text>

          <Text style={{ color: c.mutedText, marginTop: 10 }}>
            Buradaki sorular çözemediğiniz sorulara göre sürekli olarak şekillenir.Düzenli olarak çözmek eksiğinizi kapatmanıza yarar.
          </Text>
        </View>

        <View style={{ marginTop: 14, gap: 10 }}>
          <Pressable
            onPress={() => router.replace("/(test)")}
            style={{
              borderRadius: 16,
              paddingVertical: 14,
              alignItems: "center",
              backgroundColor: c.buttonBg,
            }}
          >
            <Text style={{ color: c.buttonText, fontWeight: "900" }}>
              Yeni Test Seç
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace("/(tabs)")}
            style={{
              borderRadius: 16,
              paddingVertical: 14,
              alignItems: "center",
              backgroundColor: c.card,
              borderWidth: 1,
              borderColor: c.borderStrong,
            }}
          >
            <Text style={{ color: c.text, fontWeight: "900" }}>
              Ana Sayfaya Dön
            </Text>
          </Pressable>
        </View>
      </View>
    </ImageBackground>
  );
}