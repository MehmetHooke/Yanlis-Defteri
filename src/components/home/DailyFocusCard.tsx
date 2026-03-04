// src/components/home/DailyFocusCard.tsx
import { useTheme } from "@/src/context/ThemeContext";
import { getDailyFocusCard, type DailyFocusCard as DailyFocus } from "@/src/services/focus.service";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
    Brain,
    Calendar,
    CalendarClock,
    ChevronRight,
    CircleAlert,
    Flame,
    Info,
    TimerReset
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

export default function DailyFocusCard() {
    const { theme } = useTheme();
    const c = theme.colors;

    const [loading, setLoading] = useState(true);
    const [card, setCard] = useState<DailyFocus | null>(null);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const x = await getDailyFocusCard({ poolLimit: 260 });
                setCard(x);
            } catch (e) {
                console.log("DAILY FOCUS ERROR:", e);
                setCard(null);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    function formatTrDayMonthWeekday(date: Date) {
        const months = [
            "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
            "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
        ];
        const weekdays = [
            "Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"
        ];

        const d = date.getDate();
        const m = months[date.getMonth()];
        const w = weekdays[date.getDay()];
        return `${d} ${m} ${w}`;
    }

    const subtitle = useMemo(() => {
        if (!card) return "";
        if (card.focusType === "starter") return "Başlamak için küçük bir adım";
        const l = card.lessonName ?? "Ders";
        const t = card.topicName ?? "Konu";
        return `${l} • ${t}`;
    }, [card]);

    const reasonRow = useMemo(() => {
        if (!card) return null;

        const iconColor = c.mutedText;

        if (card.reason.kind === "starter") {
            return {
                icon: <Info size={16} color={iconColor} />,
                text: "Testler, işaretlemelerine göre kişiselleşir.",
            };
        }

        if (card.reason.kind === "noRepeat") {
            return {
                icon: <TimerReset size={16} color={iconColor} />,
                text: `${card.reason.days} gündür tekrar yok (unutma riski yüksek)`,
            };
        }

        if (card.reason.kind === "lastResult") {
            return {
                icon: <CircleAlert size={16} color={iconColor} />,
                text: `Son deneme: ${card.reason.last === "unsolved" ? "Çözmedin" : "Çözdün"}`,
            };
        }

        // successRate
        return {
            icon: <Flame size={16} color={iconColor} />,
            text: `Son ${card.reason.windowDays} günde başarı %${card.reason.rate}`,
        };
    }, [card, c.mutedText]);

    const cta = useMemo(() => {
        if (!card) return { label: "Testi Başlat", onPress: () => { } };

        if (card.ctaMode === "mod3") {
            return {
                label: "Kalıcılık Kontrolü",
                onPress: () =>
                    router.push({
                        pathname: "/(test)/mod3" as any,
                        params: card.lessonId && card.topicId ? { lessonId: card.lessonId, topicId: card.topicId } : {},
                    }),
                icon: <CalendarClock size={18} color={c.buttonText} />,
            };
        }

        return {
            label: "Zayıf Nokta Testi Öneriliyor",
            onPress: () =>
                router.push({
                    pathname: "/(test)/mod1" as any,
                    params: card.lessonId && card.topicId ? { lessonId: card.lessonId, topicId: card.topicId } : {},
                }),
            icon: <Brain size={18} color={c.buttonText} />,
        };
    }, [card, c.buttonText]);

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
                    borderColor: theme.lessonCard.edgeBorderColor,
                    ...theme.lessonCard.shadow,
                }}
            >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ color: c.text, fontWeight: "900", fontSize: 16 }}>
                        Bugünün odağı
                    </Text>

                    {loading ? (
                        <ActivityIndicator />
                    ) : (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={{ color: c.mutedText, fontWeight: "800", fontSize: 12 }}>
                                {formatTrDayMonthWeekday(new Date())}
                            </Text>
                            <Calendar size={16} color={c.mutedText} />
                        </View>
                    )}
                </View>

                <Text style={{ color: c.mutedText, marginTop: 6, fontWeight: "800" }}>
                    {subtitle}
                </Text>

                {!!reasonRow && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8,marginBottom:5, marginTop: 10 }}>
                        {reasonRow.icon}

                        <Text
                            numberOfLines={1}
                            style={{ color: c.mutedText, fontWeight: "700", flexShrink: 1 }}
                        >
                            {reasonRow.text}
                        </Text>

                        <View
                            style={{
                                marginLeft: "auto",
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                            }}
                        >
                            <Text style={{ color: c.mutedText, fontWeight: "800", fontSize: 12 }}>
                                Testi Başlat
                            </Text>

                            <ChevronRight size={20} color={c.mutedText} />
                        </View>
                    </View>
                )}

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
                            justifyContent: "flex-start",
                        }}
                    >
                        <View style={{ marginRight: 10 }}>
                            {cta.icon}
                        </View>

                        <Text
                            numberOfLines={1}
                            style={{
                                color: c.buttonText,
                                fontWeight: "900",
                            }}
                        >
                            {cta.label}
                        </Text>
                    </View>
                </Pressable>
            </LinearGradient>
        </View>
    );
}