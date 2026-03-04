import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/src/context/ThemeContext";
import { auth } from "@/src/lib/firebase";
import { getUserLessons } from "@/src/services/question.service";
import type { Lesson } from "@/src/types/lesson";

import DailyFocusCard from "@/src/components/home/DailyFocusCard";
import { Book, BookOpen, ChevronRight, Layers, Plus } from "lucide-react-native";

/**
 * ✅ Route'lar
 * - ADD: soru ekleme ekranın neredeyse onu yaz
 * - LESSONS: "derslerim sayfası" hangi route ise onu yaz
 */
const ADD_ROUTE = "/(tabs)/add";
const LESSONS_ROUTE = "/(tabs)/questions"; // <- dersler sayfan buysa kalsın, değilse değiştir

export default function HomeScreen() {
  const { theme } = useTheme();
  const c = theme.colors;

  const user = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  // küçük illüstrasyon (opsiyonel)
  const illustration = useMemo(() => {
    try {
      return require("@/assets/images/examphoto.png");
    } catch {
      return null;
    }
  }, []);

  // ✅ totals: lesson dokümanlarından güvenli hesap
  const totals = useMemo(() => {
    const totalLessons = lessons.length;
    const totalQuestions = lessons.reduce(
      (acc, l) => acc + (l.questionCount ?? 0),
      0
    );
    return { totalLessons, totalQuestions };
  }, [lessons]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        if (!user) {
          if (!cancelled) setLessons([]);
          return;
        }

        const ls = await getUserLessons(user.uid);
        if (!cancelled) setLessons(ls);
      } catch (e) {
        console.log("Home load error:", e);
        if (!cancelled) setLessons([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const GridCard = ({
    title,
    value,
    subtitle,
    icon,
    onPress,
    highlight = false,
  }: {
    title: string;
    value?: string;
    subtitle?: string;
    icon: React.ReactNode;
    onPress?: () => void;
    highlight?: boolean;
  }) => {
    const body = (
      <View
        style={[
          styles.gridCard,
          {
            backgroundColor: highlight ? c.buttonBg : c.card,
            borderColor: highlight ? "transparent" : c.border,
          },
        ]}
      >
        {/* icon + title aynı satır */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={[
              styles.iconPill,
              {
                backgroundColor: highlight
                  ? "rgba(255,255,255,0.15)"
                  : c.tabActiveBg,
                borderColor: highlight
                  ? "rgba(255,255,255,0.2)"
                  : c.border,
              },
            ]}
          >
            {icon}
          </View>

          <Text
            style={[
              styles.cardTitle,
              { color: highlight ? c.buttonText : c.text },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {/* value + subtitle alt alta */}
        <View style={{ marginTop: 2 }} className="">
          {!!value && (
            <Text
              style={[
                styles.cardValue,
                { color: highlight ? c.buttonText : c.text },
              ]}
            >
              {value}
            </Text>
          )}

          {!!subtitle && (
            <Text
              style={[
                styles.cardSub,
                {
                  color: highlight ? "rgba(255,255,255,0.85)" : c.mutedText,
                },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
    );

    if (!onPress) return body;

    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
      >
        {body}
      </Pressable>
    );
  };

  //gridv2
  const GridCardV2 = ({
    title,
    description,
    actionText,
    icon,
    onPress,
    highlight = false,
  }: {
    title: string;
    description?: string;
    actionText?: string;
    icon: React.ReactNode;
    onPress?: () => void;
    highlight?: boolean;
  }) => {
    const body = (
      <View
        style={[
          styles.gridCard,
          {
            backgroundColor: highlight ? c.buttonBg : c.card,
            borderColor: highlight ? "transparent" : c.border,
          },
        ]}
      >
        {/* icon + title */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={[
              styles.iconPill,
              {
                backgroundColor: highlight
                  ? "rgba(255,255,255,0.15)"
                  : c.tabActiveBg,
                borderColor: highlight
                  ? "rgba(255,255,255,0.2)"
                  : c.border,
              },
            ]}
          >
            {icon}
          </View>

          <Text
            style={[
              styles.cardTitle,
              { color: highlight ? c.buttonText : c.text },
            ]}
          >
            {title}
          </Text>
        </View>

        {/* description */}
        {!!description && (
          <Text
            style={[
              styles.cardSub,
              {
                marginTop: 6,
                color: highlight ? "rgba(255,255,255,0.85)" : c.mutedText,
              },
            ]}
          >
            {description}
          </Text>
        )}

        {/* action row */}
        {!!actionText && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 14,
            }}
          >
            <Text
              style={{
                fontWeight: "700",
                color: highlight ? c.buttonText : c.accent,
              }}
            >
              {actionText}
            </Text>

            <View style={{ marginLeft: "auto" }}>
              <ChevronRight
                size={22}
                color={highlight ? c.buttonText : c.mutedText}
              />
            </View>
          </View>
        )}
      </View>
    );

    if (!onPress) return body;

    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
      >
        {body}
      </Pressable>
    );
  };

  return (
    <ImageBackground source={theme.bgImage} resizeMode="cover" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
        >
          {/* HERO */}
          <View style={{ marginBottom: 10 }}>
            <DailyFocusCard />
          </View>

          {/* STATS (2 col) */}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
            <View style={{ flex: 1 }}>
              <GridCard
                title="Toplam soru"
                value={loading ? "…" : String(totals.totalQuestions)}
                subtitle="Arşivde"
                icon={<Layers size={18} color={c.accent} />}
              />
            </View>

            <View style={{ flex: 1 }}>
              <GridCard
                title="Toplam ders"
                value={loading ? "…" : String(totals.totalLessons)}
                subtitle="Kategoriler"
                icon={<BookOpen size={18} color={c.accent} />}
              />
            </View>


          </View>

          {/* QUICK ACCESS */}
          <View style={{ marginTop: 16 }}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>
              Hızlı erişim
            </Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <GridCardV2
                  title="Test Yap"
                  description="Farklı test modları ile mini deneme yap"
                  actionText="Testi Başlat"
                  icon={<Book size={18} color={c.accent} />}
                  onPress={() => router.push("/(test)")}
                />
              </View>

            </View>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>

              <View style={{ flex: 1 }}>
                <GridCardV2
                  title="Yeni Soru Ekle"
                  description="Yeni Sorular Ekleyebilirsin"
                  actionText="Soru Ekle"
                  icon={<Plus size={18} color={c.accent} />}
                  onPress={() => router.push("/questions")}
                />
              </View>

              <View style={{ flex: 1 }}>
                <GridCardV2
                  title="Sorularım"
                  description="Eklediğin soruları görüntüle"
                  actionText="Sorulara Git"
                  icon={<BookOpen size={18} color={c.accent} />}
                  onPress={() => router.push("/questions")}
                />
              </View>
            </View>



          </View>

          {/* Loading overlay (opsiyonel) */}
          {loading && (
            <View style={{ marginTop: 14, alignItems: "center" }}>
              <ActivityIndicator />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    overflow: "hidden",
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 26,
  },
  heroSub: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  illWrap: { width: 110, alignItems: "flex-end", justifyContent: "flex-end" },
  ill: { width: 110, height: 110, opacity: 0.95 },

  sectionTitle: { fontSize: 14, fontWeight: "900" },

  gridCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    minHeight: 120, // ✅ stats + quick access aynı boy hissi
    justifyContent: "space-between",
  },
  iconPill: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cardTitle: { fontSize: 14, fontWeight: "800", letterSpacing: 0.5 },
  cardValue: { marginTop: 6, fontSize: 24, fontWeight: "900" },
  cardSub: { marginTop: 6, fontSize: 11, fontWeight: "700" },

  actionTitle: { fontSize: 14, fontWeight: "900" },
  actionSub: { marginTop: 6, fontSize: 12, fontWeight: "700" },
});