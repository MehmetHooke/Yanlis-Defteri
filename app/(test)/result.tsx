import { useTheme } from "@/src/context/ThemeContext";
import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle2 } from "lucide-react-native";
import { ImageBackground, Pressable, Text, View } from "react-native";

export default function TestResultScreen() {
  const { theme } = useTheme();
  const c = theme.colors;

  const { mode, total, solved, streak, bestStreak } = useLocalSearchParams<{
    mode?: string;
    total?: string;
    solved?: string;
    streak?: string;
    bestStreak?: string;
  }>();

  const t = Number(total ?? "0");
  const s = Number(solved ?? "0");
  const currentStreak = Number(streak ?? "0");
  const highestStreak = Number(bestStreak ?? "0");
  const rate = t > 0 ? Math.round((s / t) * 100) : 0;

  const modeTitle =
    mode === "mod1"
      ? "Zayıf Nokta Testi"
      : mode === "mod2"
      ? "Karma Tekrar"
      : mode === "mod3"
      ? "Kalıcılık Kontrolü"
      : mode === "daily"
      ? "Günlük Tekrar"
      : "Test";

  const modeDesc =
    mode === "mod1"
      ? "En çok zorlandiğin sorulara odaklandın. Düzenli çözüm, zayıf noktalarını hızlı kapatır."
      : mode === "mod2"
      ? "Zayif/orta/guclu karisik tekrar yaptin. Bu mod hem toparlar hem moral verir."
      : mode === "mod3"
      ? "Unutma riski olan konuları tazeledin. Aralıklı tekrar kalıcılığı artırır."
      : mode === "daily"
      ? "Bugüne özel seçilen tekrar planını tamamladın. Kısa ama duzenli tekrar, kalıcılıgı güçlendirir."
      : "Testi bitirdin.";

  const replayPath =
    mode === "mod1"
      ? "/(test)/mod1"
      : mode === "mod2"
      ? "/(test)/mod2"
      : mode === "mod3"
      ? "/(test)/mod3"
      : mode === "daily"
      ? "/(test)/daily"
      : "/(test)";

  const level =
    rate >= 80 ? "Harika" : rate >= 50 ? "İyi" : "Geliştirilebilir";

  const empty = t <= 0;

  return (
    <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 18, paddingTop: 70 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <CheckCircle2 size={22} color={c.accent} />
          <Text style={{ color: c.text, fontSize: 22, fontWeight: "900" }}>
            Test Bitti
          </Text>
        </View>

        <Text style={{ color: c.mutedText, marginTop: 6, fontWeight: "700" }}>
          {modeTitle} tamamlandı
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
          <Text style={{ color: c.accent, fontWeight: "800" }}>
            Başarı Oranı
          </Text>

          <Text
            style={{
              color: c.text,
              fontSize: 34,
              fontWeight: "900",
              marginTop: 6,
            }}
          >
            {empty ? "-" : `%${rate}`}
          </Text>

          <Text style={{ color: c.mutedText, marginTop: 6, fontWeight: "700" }}>
            Toplam {t} sorudan {s} adet doğru çözdün
          </Text>

          {!empty ? (
            <Text style={{ color: c.mutedText, marginTop: 6, fontWeight: "800" }}>
              <Text style={{ color: c.accent, fontWeight: "900" }}>{level}</Text>{" "}
              sonuç elde ettin
            </Text>
          ) : null}

          <Text style={{ color: c.mutedText, marginTop: 10 }}>
            {empty
              ? "Bu test için yeterli soru bulunamadı. Daha fazla soru ekledikçe testler kişiselleşir."
              : modeDesc}
          </Text>

          {mode === "daily" ? (
            <View
              style={{
                marginTop: 14,
                borderRadius: 14,
                backgroundColor: c.inputBg,
                borderWidth: 1,
                borderColor: c.border,
                padding: 12,
              }}
            >
              <Text style={{ color: c.text, fontWeight: "900" }}>
                Günlük tekrar serin
              </Text>
              <Text style={{ color: c.mutedText, marginTop: 6 }}>
                Mevcut seri:{" "}
                <Text style={{ color: c.accent, fontWeight: "900" }}>
                  {currentStreak}
                </Text>
                {" • "}En iyi seri:{" "}
                <Text style={{ color: c.accent, fontWeight: "900" }}>
                  {highestStreak}
                </Text>
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: 14, gap: 10 }}>
          <Pressable
            onPress={() => router.replace(replayPath as any)}
            style={{
              borderRadius: 16,
              paddingVertical: 14,
              alignItems: "center",
              backgroundColor: c.buttonBg,
            }}
          >
            <Text style={{ color: c.buttonText, fontWeight: "900" }}>
              Tekrar Çöz
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace("/(test)")}
            style={{
              borderRadius: 16,
              paddingVertical: 14,
              alignItems: "center",
              backgroundColor: c.card,
              marginTop: 4,
              borderWidth: 1,
              borderColor: c.borderStrong,
            }}
          >
            <Text style={{ color: c.text, fontWeight: "900" }}>
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
