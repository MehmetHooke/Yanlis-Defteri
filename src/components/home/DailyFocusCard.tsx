import { useTheme } from "@/src/context/ThemeContext";
import {
  getDailyReviewPlan,
  type DailyReviewPlan,
} from "@/src/services/daily-review.service";
import {
  getDailyFocusCard,
  type DailyFocusCard as DailyFocus,
} from "@/src/services/focus.service";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Sparkles
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

export default function DailyFocusCard() {
  const { theme } = useTheme();
  const c = theme.colors;

  const [loading, setLoading] = useState(true);
  const [focusCard, setFocusCard] = useState<DailyFocus | null>(null);
  const [dailyPlan, setDailyPlan] = useState<DailyReviewPlan | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [focus, plan] = await Promise.all([
          getDailyFocusCard({ poolLimit: 260 }),
          getDailyReviewPlan({ take: 5, poolLimit: 280 }),
        ]);
        setFocusCard(focus);
        setDailyPlan(plan);
      } catch (e) {
        console.log("DAILY FOCUS ERROR:", e);
        setFocusCard(null);
        setDailyPlan(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function formatDayMonthWeekday(date: Date) {
    const months = [
      "Ocak",
      "Subat",
      "Mart",
      "Nisan",
      "Mayis",
      "Haziran",
      "Temmuz",
      "Agustos",
      "Eylul",
      "Ekim",
      "Kasim",
      "Aralik",
    ];
    const weekdays = [
      "Pazar",
      "Pazartesi",
      "Sali",
      "Carsamba",
      "Persembe",
      "Cuma",
      "Cumartesi",
    ];

    return `${date.getDate()} ${months[date.getMonth()]} ${weekdays[date.getDay()]}`;
  }

  const subtitle = useMemo(() => {
    if (!focusCard) return "";
    if (focusCard.focusType === "starter") return "Bugünluk kısa tekrar planı hazır";
    const lesson = focusCard.lessonName ?? "Ders";
    const topic = focusCard.topicName ?? "Konu";
    return `Odak: ${lesson} • ${topic}`;
  }, [focusCard]);

  const planSummary = useMemo(() => {
    if (!dailyPlan) return null;

    const parts = [
      `${dailyPlan.targetCount} soru`,
      dailyPlan.counts.weak ? `${dailyPlan.counts.weak} zayif` : null,
      dailyPlan.counts.retention ? `${dailyPlan.counts.retention} tekrar` : null,
      dailyPlan.counts.fresh ? `${dailyPlan.counts.fresh} yeni` : null,
    ].filter(Boolean);

    return parts.join(" • ");
  }, [dailyPlan]);

  const planStatus = useMemo(() => {
    if (!dailyPlan) {
      return {
        icon: <Sparkles size={14} color={c.mutedText} />,
        label: "Hazirlaniyor",
        textColor: c.mutedText,
        bg: c.inputBg,
        border: c.border,
      };
    }

    if (dailyPlan.completed) {
      return {
        icon: <CheckCircle2 size={14} color="rgba(34,197,94,0.95)" />,
        label: "Bugün tamamlandi",
        textColor: "rgba(34,197,94,0.95)",
        bg: "rgba(34,197,94,0.12)",
        border: "rgba(34,197,94,0.28)",
      };
    }

    return {
      icon: <Sparkles size={14} color={c.accent} />,
      label: "Bugünkü plan hazır",
      textColor: c.accent,
      bg: c.tabActiveBg,
      border: c.border,
    };
  }, [dailyPlan, c.accent, c.border, c.inputBg, c.mutedText, c.tabActiveBg]);

  const cta = useMemo(() => {
    return {
      label: dailyPlan?.completed ? "Günlük Tekrarı Tekrar Aç" : "Günlük Tekrarı  Başlat",
      onPress: () => router.push("/(test)/daily"),
    };
  }, [dailyPlan?.completed]);

  return (
    <View style={{ marginTop: 12 }}>
      <LinearGradient
        colors={theme.lessonCard.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 18,
          padding: 14,
          borderWidth: theme.lessonCard.edgeBorderWidth,
          borderColor: theme.colors.accent,
          ...theme.lessonCard.shadow,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ color: c.text, fontWeight: "900", fontSize: 16 }}>
            Günlük Odak Kartı
          </Text>

          {loading ? (
            <ActivityIndicator />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ color: c.mutedText, fontWeight: "800", fontSize: 12 }}>
                {formatDayMonthWeekday(new Date())}
              </Text>
              <Calendar size={16} color={c.mutedText} />
            </View>
          )}
        </View>

        <Text style={{ color: c.mutedText, marginTop: 6, fontWeight: "800" }}>
          {subtitle}
        </Text>

        <View
          style={{
            marginTop: 12,
            marginBottom:12,
            borderRadius: 14,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.borderStrong,
            padding: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: planStatus.bg,
                borderWidth: 1,
                borderColor: planStatus.border,
              }}
            >
              {planStatus.icon}
              <Text style={{ color: planStatus.textColor, fontWeight: "900", fontSize: 12 }}>
                {planStatus.label}
              </Text>
            </View>

            {!!dailyPlan?.streak.current && (
              <View
                style={{
                  marginLeft: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: c.inputBg,
                  borderWidth: 1,
                  borderColor: c.border,
                }}
              >
                <Text style={{ color: c.text, fontWeight: "900", fontSize: 12 }}>
                  Seri: {dailyPlan.streak.current}. gun
                </Text>
              </View>
            )}
          </View>

          {!!planSummary && (
            <Text style={{ color: c.mutedText, marginTop: 10, lineHeight: 18 }}>
              {planSummary}
            </Text>
          )}
        </View>

        <Pressable
          onPress={cta.onPress}
          style={({ pressed }) => ({
            marginTop: 12,
            borderRadius: 16,
            paddingVertical: 12,
            paddingHorizontal: 12,
            backgroundColor: c.buttonBg,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View style={{ marginRight: 10 }}>
              <Sparkles size={18} color={c.accent} />
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text
                numberOfLines={1}
                style={{
                  color: c.buttonText,
                  fontWeight: "900",
                }}
              >
                {cta.label}
              </Text>
              <ChevronRight size={18} color={c.buttonText} />
            </View>
          </View>
        </Pressable>
      </LinearGradient>
    </View>
  );
}
