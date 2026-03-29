import DailyFocusCard from "@/src/components/home/DailyFocusCard";
import { useTheme } from "@/src/context/ThemeContext";
import { auth } from "@/src/lib/firebase";
import { getUserLessons } from "@/src/services/question.service";
import type { Lesson } from "@/src/types/lesson";
import { router } from "expo-router";
import { Book, BookOpen, ChevronRight, Layers, Plus } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const userId = auth.currentUser?.uid;

  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const totalLessons = lessons.length;
  const totalQuestions = lessons.reduce(
    (acc, lesson) => acc + (lesson.questionCount ?? 0),
    0,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        if (!userId) {
          if (!cancelled) setLessons([]);
          return;
        }

        const nextLessons = await getUserLessons(userId);
        if (!cancelled) setLessons(nextLessons);
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
  }, [userId]);

  const GridCard = ({
    title,
    value,
    subtitle,
    icon,
  }: {
    title: string;
    value?: string;
    subtitle?: string;
    icon: React.ReactNode;
  }) => (
    <View
      style={[
        styles.gridCard,
        {
          backgroundColor: c.card,
          borderColor: c.accent,
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={[
            styles.iconPill,
            {
              backgroundColor: c.tabActiveBg,
              borderColor: c.border,
            },
          ]}
        >
          {icon}
        </View>

        <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={{ marginTop: 2 }}>
        {!!value && <Text style={[styles.cardValue, { color: c.text }]}>{value}</Text>}
        {!!subtitle && (
          <Text style={[styles.cardSub, { color: c.mutedText }]}>{subtitle}</Text>
        )}
      </View>
    </View>
  );

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
            backgroundColor: c.card,
            borderColor: highlight ? c.accent : c.border,
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={[
              styles.iconPill,
              {
                backgroundColor: highlight ? c.border : c.tabActiveBg,
                borderColor: highlight ? "rgba(255,255,255,0.2)" : c.border,
              },
            ]}
          >
            {icon}
          </View>

          <Text style={[styles.cardTitle, { color: c.text }]}>{title}</Text>
        </View>

        {!!description && (
          <Text
            style={[
              styles.cardSub,
              {
                marginTop: 6,
                color: c.mutedText,
              },
            ]}
          >
            {description}
          </Text>
        )}

        {!!actionText && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 14,
            }}
          >
            <Text style={{ fontWeight: "700", color: c.accent }}>{actionText}</Text>

            <View style={{ marginLeft: "auto" }}>
              <ChevronRight size={22} color={highlight ? c.accent : c.mutedText} />
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
          <View style={{ marginBottom: 10 }}>
            <DailyFocusCard />
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <GridCard
                title="Toplam soru"
                value={loading ? "..." : String(totalQuestions)}
                subtitle="Arsivde"
                icon={<Layers size={18} color={c.accent} />}
              />
            </View>

            <View style={{ flex: 1 }}>
              <GridCard
                title="Toplam ders"
                value={loading ? "..." : String(totalLessons)}
                subtitle="Kategoriler"
                icon={<BookOpen size={18} color={c.accent} />}
              />
            </View>
          </View>

          <View style={{ marginTop: 16 }}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>
              Hizli erisim
            </Text>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <GridCardV2
                  title="Test Yap"
                  description="Farkli test modlari ile mini deneme yap"
                  actionText="Testi Baslat"
                  icon={<Book size={18} color={c.accent} />}
                  onPress={() => router.push("/(test)")}
                  highlight
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 15 }}>
              <View style={{ flex: 1 }}>
                <GridCardV2
                  title="Yeni Soru Ekle"
                  description="Yeni sorular ekleyebilirsin"
                  actionText="Soru Ekle"
                  icon={<Plus size={18} color={c.accent} />}
                  onPress={() => router.push("/questions")}
                  highlight
                />
              </View>

              <View style={{ flex: 1 }}>
                <GridCardV2
                  title="Sorularim"
                  description="Ekledigin sorulari goruntule"
                  actionText="Sorulara Git"
                  icon={<BookOpen size={18} color={c.accent} />}
                  onPress={() => router.push("/questions")}
                  highlight
                />
              </View>
            </View>
          </View>

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
  sectionTitle: { fontSize: 14, fontWeight: "900" },
  gridCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    minHeight: 120,
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
});
