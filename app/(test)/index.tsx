// app/(tabs)/test/index.tsx
import { useAppAlert } from "@/src/components/common/AppAlertProvider";
import { useTheme } from "@/src/context/ThemeContext";
import { useTestExitToHomeOnBack } from "@/src/hooks/useTestExitToHomeOnBack";
import { getTestStats, type TestStats } from "@/src/services/test.service";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  Brain,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Info,
  Shuffle,
  Timer,
  TrendingUp,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";

function ModeCard({
  title,
  desc,
  icon,
  disabled,
  onPress,
  badge,
  rightHint,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  badge?: string;
  rightHint?: React.ReactNode;
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
    [c],
  );

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        { borderRadius: 18, marginBottom: 15 },
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
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ color: c.text, fontWeight: "900", fontSize: 16 }}>
                {title}
              </Text>

              <View style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 8 }}>
                {rightHint}
                <ChevronRight size={18} color={c.mutedText} />
              </View>
            </View>

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

function TestQualityCard({
  stats,
  loading,
}: {
  stats: TestStats | null;
  loading: boolean;
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  const badge = useMemo(() => {
    if (!stats) {
      return {
        label: "—",
        icon: <Info size={14} color={c.mutedText} />,
        bg: c.inputBg,
        border: c.border,
        text: c.mutedText,
      };
    }

    if (stats.status === "empty") {
      return {
        label: "Başlangıç",
        icon: <CircleAlert size={14} color="rgba(239,68,68,0.95)" />,
        bg: "rgba(239,68,68,0.12)",
        border: "rgba(239,68,68,0.35)",
        text: "rgba(239,68,68,0.95)",
      };
    }

    if (stats.status === "low") {
      return {
        label: "Isınıyor",
        icon: <Info size={14} color="rgba(245,158,11,0.95)" />,
        bg: "rgba(245,158,11,0.12)",
        border: "rgba(245,158,11,0.35)",
        text: "rgba(245,158,11,0.95)",
      };
    }

    return {
      label: "Hazır",
      icon: <CheckCircle2 size={14} color="rgba(34,197,94,0.95)" />,
      bg: "rgba(34,197,94,0.12)",
      border: "rgba(34,197,94,0.35)",
      text: "rgba(34,197,94,0.95)",
    };
  }, [stats, c]);

  const statusText = useMemo(() => {
    if (!stats) return "";
    if (stats.status === "empty")
      return "Henüz soru yok. Testler kişiselleşemez.";
    if (stats.status === "low")
      return "Veri az. Şimdilik testler yarı-rastgele görünebilir.";
    return "Hazır. Testler davranışlarına göre kişiselleşiyor.";
  }, [stats]);

  const actionText = useMemo(() => {
    if (!stats) return "";
    if (stats.totalQuestions < 10) {
      return "En az 10 soru ekle, sonra testler anlam kazanır.";
    }
    if (stats.totalAttempts < 15) {
      return "Çözdüm/Çözemedim işaretlemelerini artır, motor hızlıca öğrenir.";
    }
    return "Harika. Karma Tekrar ve Kalıcılık Kontrolü artık gerçekten kişisel çalışır.";
  }, [stats]);

  return (
    <View
      style={{
        marginTop: 10,
        borderRadius: 18,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.borderStrong,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TrendingUp size={18} color={c.accent} />
          <Text style={{ color: c.text, fontWeight: "900", fontSize: 14 }}>
            Test Kalitesi
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: badge.bg,
            borderWidth: 1,
            borderColor: badge.border,
          }}
        >
          {badge.icon}
          <Text style={{ color: badge.text, fontWeight: "900", fontSize: 12 }}>
            {badge.label}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <ActivityIndicator />
          <Text style={{ color: c.mutedText, fontWeight: "700" }}>
            Veriler kontrol ediliyor…
          </Text>
        </View>
      ) : (
        <>
          <Text style={{ color: c.mutedText, marginTop: 8, lineHeight: 18 }}>
            {statusText}
          </Text>

          {!!stats && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ color: c.text, fontWeight: "900", fontSize: 22 }}>
                %{stats.qualityScore}
              </Text>

              <Text style={{ color: c.mutedText, marginTop: 4 }}>
                Toplam soru:{" "}
                <Text style={{ color: c.text, fontWeight: "900" }}>
                  {stats.totalQuestions}
                </Text>{" "}
                • Denenen soru:{" "}
                <Text style={{ color: c.text, fontWeight: "900" }}>
                  {stats.attemptedQuestions}
                </Text>{" "}
                • İşaretleme:{" "}
                <Text style={{ color: c.text, fontWeight: "900" }}>
                  {stats.totalAttempts}
                </Text>
              </Text>

              <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Info size={16} color={c.mutedText} />
                <Text style={{ color: c.mutedText, flex: 1, lineHeight: 18 }}>
                  {actionText}
                </Text>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

export default function TestSelectScreen() {
  const { theme } = useTheme();
  const c = theme.colors;

  const TEST_ONBOARD_KEY = "test_onboard_v1_seen";

  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState<TestStats | null>(null);

  const [onboardOpen, setOnboardOpen] = useState(false);

 const alert = useAppAlert();

  useTestExitToHomeOnBack({
    alert,
    goHome: () => router.replace("/(tabs)"),
    title: "Anasayfaya dönüyorsun",
    message: "Testten çıkıp anasayfaya dönmek istiyor musun?",
  });

  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(TEST_ONBOARD_KEY);
        if (!seen) setOnboardOpen(true);

        setStatsLoading(true);
        const s = await getTestStats({ poolLimit: 250 });
        setStats(s);
      } catch (e) {
        console.log("TEST INDEX INIT ERROR:", e);
      } finally {
        setStatsLoading(false);
      }
    })();
  }, []);

  const closeOnboard = async () => {
    setOnboardOpen(false);
    await AsyncStorage.setItem(TEST_ONBOARD_KEY, "1");
  };

  const isLowOrEmpty = stats?.status === "empty" || stats?.status === "low";

  const lowHint = useMemo(() => {
    if (!isLowOrEmpty) return null;
    return <CircleAlert size={16} color={c.mutedText} />;
  }, [isLowOrEmpty, c.mutedText]);

  return (
    <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 18, paddingBottom: 10 }}>
        <Text style={{ color: c.text, fontSize: 22, fontWeight: "900" }}>
          Test Yap
        </Text>
        <Text style={{ color: c.mutedText, marginTop: 4, fontWeight: "700" }}>
          Kişiselleştirilmiş sınavlar, kullanımına göre güçlenir.
        </Text>

        <TestQualityCard stats={stats} loading={statsLoading} />
      </View>

      <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
        <ModeCard
          title="Zayıf Nokta Testi"
          desc="En çok ‘çözemedim’ aldığın sorulardan 5 soru."
          icon={<Brain size={18} color={c.accent} />}
          rightHint={lowHint}
          onPress={() => router.push("/(test)/mod1")}
        />

        <ModeCard
          title="Karma Tekrar"
          desc="2 zayıf + 2 orta + 1 güçlü. Toparla ve moral depola."
          icon={<Shuffle size={18} color={c.accent} />}
          rightHint={lowHint}
          onPress={() => router.push("/(test)/mod2")}
        />

        <ModeCard
          title="Kalıcılık Kontrolü"
          desc="Üzerinden zaman geçen çözdüğün soruları tekrar et."
          icon={<Timer size={18} color={c.accent} />}
          rightHint={lowHint}
          onPress={() => router.push("/(test)/mod3")}
        />
      </View>

      {/* Mini onboarding (1 kere) */}
      <Modal visible={onboardOpen} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 520,
              borderRadius: 22,
              backgroundColor: c.card,
              borderWidth: 1,
              borderColor: c.borderStrong,
              padding: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Info size={20} color={c.accent} />
              <Text style={{ color: c.text, fontWeight: "900", fontSize: 18 }}>
                Testler nasıl akıllanıyor?
              </Text>
            </View>

            <Text style={{ color: c.mutedText, marginTop: 10, lineHeight: 19 }}>
              Bu testler, senin kullanımına göre kişiselleşir.
            </Text>

            <View style={{ marginTop: 12, gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                <CheckCircle2 size={18} color={c.mutedText} />
                <Text style={{ color: c.text, fontWeight: "800", flex: 1, lineHeight: 19 }}>
                  Soru ekledikçe havuz büyür.
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                <CheckCircle2 size={18} color={c.mutedText} />
                <Text style={{ color: c.text, fontWeight: "800", flex: 1, lineHeight: 19 }}>
                  Çözdüm/Çözemedim işaretledikçe sistem öğrenir ve gelişir.
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                <CheckCircle2 size={18} color={c.mutedText} />
                <Text style={{ color: c.text, fontWeight: "800", flex: 1, lineHeight: 19 }}>
                  Düzenli kullanım testleri çok daha güçlü yapar.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={closeOnboard}
              style={{
                marginTop: 14,
                borderRadius: 16,
                paddingVertical: 12,
                alignItems: "center",
                backgroundColor: c.buttonBg,
              }}
            >
              <Text style={{ color: c.buttonText, fontWeight: "900" }}>
                Anladım
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setOnboardOpen(false)}
              style={{ marginTop: 10, alignItems: "center" }}
            >
              <Text style={{ color: c.mutedText, fontWeight: "800" }}>
                Şimdi değil
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}