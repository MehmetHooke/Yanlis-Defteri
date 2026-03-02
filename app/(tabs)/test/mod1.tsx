// app/(tabs)/test/mod1.tsx
import { useAppAlert } from "@/src/components/common/AppAlertProvider";
import { useTheme } from "@/src/context/ThemeContext";
import { addAttemptAndUpdateQuestion } from "@/src/services/attempt.service";
import { getMod1WeakQuestions } from "@/src/services/test.service";
import type { Question } from "@/src/types/question";
import { router } from "expo-router";
import { ChevronDown, ChevronUp, Lightbulb } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ImageBackground,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";

function getQuestionPreview(q: Question) {
    const img =
        q.question?.kind === "photo"
            ? q.question.image?.url
            : q.questionImage?.url ?? q.imageUrl;

    const text = q.question?.kind === "text" ? q.question.text : "";
    return { img, text };
}

export default function TestMod1Screen() {
    const { theme } = useTheme();
    const c = theme.colors;
    const { alert } = useAppAlert();

    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [i, setI] = useState(0);

    // per-question view flags (her soru için ayrı tutulmalı)
    const [hintViewedMap, setHintViewedMap] = useState<Record<string, boolean>>({});
    const [answerViewedMap, setAnswerViewedMap] = useState<Record<string, boolean>>({});
    const [showHint, setShowHint] = useState(false);
    const [showAnswer, setShowAnswer] = useState(false);

    const current = questions[i];
    const qid = current?.id;

    const { img, text } = useMemo(() => {
        if (!current) return { img: null as any, text: "" };
        return getQuestionPreview(current);
    }, [current]);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const qs = await getMod1WeakQuestions({ take: 5, poolLimit: 40, minAttempts: 1 });
                console.log("MOD1 QUESTIONS =", qs);
                setQuestions(qs);
                setI(0);
            } catch (e: any) {
                console.log("MOD1 ERROR FULL =", e);
                console.log("MOD1 ERROR CODE =", e?.code);
                console.log("MOD1 ERROR MESSAGE =", e?.message);
                console.log("MOD1 ERROR RAW =", JSON.stringify(e, null, 2));

                alert("Hata", e?.message ?? "Test hazırlanamadı", { variant: "danger" });
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // soru değişince accordionlar kapansın (ama viewed flag map’te kalsın)
    useEffect(() => {
        setShowHint(false);
        setShowAnswer(false);
    }, [qid]);

    const hintViewed = qid ? !!hintViewedMap[qid] : false;
    const answerViewed = qid ? !!answerViewedMap[qid] : false;

    const toggleHint = () => {
        if (!qid) return;
        setShowHint((p) => {
            const next = !p;
            if (next) setHintViewedMap((m) => ({ ...m, [qid]: true }));
            return next;
        });
    };

    const toggleAnswer = () => {
        if (!qid) return;
        setShowAnswer((p) => {
            const next = !p;
            if (next) setAnswerViewedMap((m) => ({ ...m, [qid]: true }));
            return next;
        });
    };

    async function mark(result: "solved" | "unsolved") {
        if (!current) return;

        try {
            await addAttemptAndUpdateQuestion({
                lessonId: current.lessonId,
                topicId: current.topicId,
                questionId: current.id,
                result,
                hintViewed,
                answerViewed,
                source: "test_mod1",
            });

            const nextIndex = i + 1;

            // son soruysa sonuç ekranına
            if (nextIndex >= questions.length) {
                const solved = result === "solved" ? 1 : 0;
                const unsolved = result === "unsolved" ? 1 : 0;

                // basit MVP: sadece son işaretlemeyi değil, tüm testteki işaretleri saymak isteriz
                // MVP'de hızlı: sonuçları state’te tutalım:
                // (şimdilik aşağıdaki gibi route param göndermeden hesaplamak için local state lazım)
            }

            // MVP: local counter
            setResults((prev) => {
                const next = [...prev, { questionId: current.id, result }];
                return next;
            });

            if (nextIndex >= questions.length) {
                router.replace({
                    pathname: "/(tabs)/test/result",
                    params: {
                        mode: "mod1",
                        total: String(questions.length),
                        solved: String(
                            (resultsRef.current?.filter((r) => r.result === "solved").length ?? 0) +
                            (result === "solved" ? 1 : 0)
                        ),
                    },
                } as any);
                return;
            }

            setI(nextIndex);
        } catch (e: any) {
            alert("Hata", e?.message ?? "Kaydedilemedi", { variant: "danger" });
        }
    }

    // ✅ küçük result state (bitince sonuç ekranına geçmek için)
    const [results, setResults] = useState<Array<{ questionId: string; result: "solved" | "unsolved" }>>([]);
    const resultsRef = React.useRef(results);
    useEffect(() => {
        resultsRef.current = results;
    }, [results]);

    if (loading) {
        return (
            <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator />
                </View>
            </ImageBackground>
        );
    }

    if (!current) {
        return (
            <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 18 }}>
                    <Text style={{ color: c.mutedText, fontWeight: "800" }}>
                        Mod1 için yeterli veri yok.
                    </Text>
                    <Text style={{ color: c.mutedText, marginTop: 8, textAlign: "center" }}>
                        Birkaç soruyu çözdüm/çözemedim olarak işaretleyince Mod1 güçlenecek.
                    </Text>

                    <Pressable
                        onPress={() => router.replace("/(tabs)/test")}
                        style={{
                            marginTop: 14,
                            borderRadius: 16,
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            backgroundColor: c.buttonBg,
                        }}
                    >
                        <Text style={{ color: c.buttonText, fontWeight: "900" }}>Geri</Text>
                    </Pressable>
                </View>
            </ImageBackground>
        );
    }

    return (
        <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
            {/* header */}
            <View style={{ paddingTop: 60, paddingHorizontal: 18, paddingBottom: 10 }}>
                <Text style={{ color: c.text, fontSize: 18, fontWeight: "900" }}>
                    Mod 1 — Zayıf Nokta Testi
                </Text>
                <Text style={{ color: c.mutedText, marginTop: 4, fontWeight: "700" }}>
                    Soru {i + 1} / {questions.length}
                </Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 140 }}>
                {/* question */}
                <View
                    style={{
                        borderRadius: 18,
                        overflow: "hidden",
                        borderWidth: 1,
                        borderColor: c.borderStrong,
                        backgroundColor: c.card,
                    }}
                >
                    {img ? (
                        <Image
                            source={{ uri: img }}
                            style={{ width: "100%", height: 360, backgroundColor: c.inputBg }}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={{ minHeight: 220, padding: 16, justifyContent: "center" }}>
                            <Text style={{ color: c.mutedText, fontWeight: "800", fontSize: 12, textAlign: "center" }}>
                                Metin sorusu
                            </Text>
                            <Text style={{ color: c.text, marginTop: 10, fontWeight: "800", lineHeight: 20 }}>
                                {text?.trim() ? text : "Önizleme yok"}
                            </Text>
                        </View>
                    )}
                </View>

                {/* hint toggle */}
                <Pressable
                    onPress={toggleHint}
                    style={{
                        marginTop: 12,
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
                            {showHint ? "İpucunu Gizle" : "İpucunu Göster"}
                        </Text>
                    </View>
                    {showHint ? <ChevronUp size={18} color={c.mutedText} /> : <ChevronDown size={18} color={c.mutedText} />}
                </Pressable>

                {showHint && (
                    <View style={{ marginTop: 10, padding: 14, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.borderStrong }}>
                        <Text style={{ color: c.mutedText, fontWeight: "800" }}>
                            (MVP) İpucu alanını şu an “püf nokta”lardan türeteceğiz.
                        </Text>
                        <Text style={{ color: c.mutedText, marginTop: 6 }}>
                            İleride burada: açıklamalardan ilk satırı / özet ipucunu gösterebiliriz.
                        </Text>
                    </View>
                )}

                {/* answer toggle */}
                <Pressable
                    onPress={toggleAnswer}
                    style={{
                        marginTop: 12,
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
                    <Text style={{ color: c.text, fontWeight: "900" }}>
                        {showAnswer ? "Cevabı Gizle" : "Cevabı Göster"}
                    </Text>
                    {showAnswer ? <ChevronUp size={18} color={c.mutedText} /> : <ChevronDown size={18} color={c.mutedText} />}
                </Pressable>

                {showAnswer && (
                    <View style={{ marginTop: 10, padding: 14, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.borderStrong }}>
                        <Text style={{ color: c.text, fontWeight: "900" }}>Cevap</Text>
                        <Text style={{ color: c.mutedText, marginTop: 6 }}>
                            (MVP) Burada soru detail’deki “Çözümler” mantığını reuse edebiliriz.
                            İstersen bir sonraki iterasyonda aynı komponenti buraya taşıyalım.
                        </Text>
                    </View>
                )}

                {/* solve row */}
                <View style={{ marginTop: 16, flexDirection: "row", gap: 10 }}>
                    <Pressable
                        onPress={() => mark("solved")}
                        style={({ pressed }) => ({
                            flex: 1,
                            borderRadius: 16,
                            paddingVertical: 14,
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: pressed ? 0.9 : 1,
                            backgroundColor: "rgba(34,197,94,0.14)",
                            borderWidth: 1,
                            borderColor: "rgba(34,197,94,0.35)",
                        })}
                    >
                        <Text style={{ color: "rgba(34,197,94,0.95)", fontWeight: "900" }}>✅ Çözdüm</Text>
                        <Text style={{ color: c.mutedText, marginTop: 4, fontSize: 11, fontWeight: "700" }}>
                            {hintViewed || answerViewed ? "Görerek" : "Görmeden"}
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => mark("unsolved")}
                        style={({ pressed }) => ({
                            flex: 1,
                            borderRadius: 16,
                            paddingVertical: 14,
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: pressed ? 0.9 : 1,
                            backgroundColor: "rgba(239,68,68,0.14)",
                            borderWidth: 1,
                            borderColor: "rgba(239,68,68,0.35)",
                        })}
                    >
                        <Text style={{ color: "rgba(239,68,68,0.95)", fontWeight: "900" }}>❌ Çözemedim</Text>
                        <Text style={{ color: c.mutedText, marginTop: 4, fontSize: 11, fontWeight: "700" }}>
                            Tekrar gelecek
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </ImageBackground>
    );
}