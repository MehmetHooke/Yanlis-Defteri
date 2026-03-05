// app/(test)/mod3.tsx
import FullscreenZoomImage from "@/src/components/FullscreenZoomImage";
import TestProgressPill from "@/src/components/TestProgressPill";
import { useAppAlert } from "@/src/components/common/AppAlertProvider";
import TestAnswersAccordion from "@/src/components/test/TestAnswersAccordion";
import TestHintsAccordion from "@/src/components/test/TestHintsAccordion";
import { useTheme } from "@/src/context/ThemeContext";
import { useTestExitToHomeOnBack } from "@/src/hooks/useTestExitToHomeOnBack";
import { addAttemptAndUpdateQuestion } from "@/src/services/attempt.service";
import { getMod3RetentionQuestions, getMod3RetentionQuestionsForTopic } from "@/src/services/test.service";
import type { Question } from "@/src/types/question";
import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle2, XCircle } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, ImageBackground, Pressable, ScrollView, Text, View } from "react-native";

function getQuestionImageUrl(item: Question | null) {
    const fromNew = item?.question?.kind === "photo" ? item.question.image?.url : undefined;
    const fromLegacyV3 = (item as any)?.questionImage?.url;
    const fromLegacyV2 = (item as any)?.imageUrl;
    return fromNew || fromLegacyV3 || fromLegacyV2 || null;
}
function getQuestionText(item: Question | null) {
    if (item?.question?.kind === "text") return item.question.text;
    return "";
}

export default function TestMod3Screen() {

    const { lessonId, topicId } = useLocalSearchParams<{
        lessonId?: string;
        topicId?: string;
    }>();
    const { theme } = useTheme();
    const c = theme.colors;
    const api = useAppAlert();
    const { alert } = api;

    useTestExitToHomeOnBack({
        api,
        goHome: () => router.replace("/(tabs)"),
        title: "Testten çık",
        message: "Testten çıkıp anasayfaya dönmek istiyor musun?",
        confirmText: "Çık",
        cancelText: "Vazgeç",
        destructive: true,
    });

    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [i, setI] = useState(0);
    const [solvedCount, setSolvedCount] = useState(0);

    const current = questions[i] ?? null;
    const questionUri = useMemo(() => getQuestionImageUrl(current), [current]);
    const questionText = useMemo(() => getQuestionText(current), [current]);

    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerUri, setViewerUri] = useState("");

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const qs =
                    lessonId && topicId
                        ? await getMod3RetentionQuestionsForTopic({
                            lessonId: String(lessonId),
                            topicId: String(topicId),
                            take: 5,
                            poolLimit: 200,
                            minDays: 7,
                        })
                        : await getMod3RetentionQuestions({ take: 5, poolLimit: 200, minDays: 7 });
                setQuestions(qs);
                setI(0);
                setSolvedCount(0);
                console.log("MOD1 params:", lessonId, topicId);
            } catch (e: any) {
                console.log("MOD3 LOAD ERROR:", e?.code, e?.message, e);
                alert("Hata", e?.message ?? "Mod3 hazırlanamadı", { variant: "danger" });
                setQuestions([]);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const openViewer = (uri: string) => {
        setViewerUri(uri);
        setViewerOpen(true);
    };

    const next = (nextSolved: number) => {
        if (i + 1 >= questions.length) {
            router.replace({
                pathname: "/(test)/result" as any,
                params: { mode: "mod3", total: String(questions.length), solved: String(nextSolved) },
            });
            return;
        }
        setI((p) => p + 1);
    };

    const mark = async (result: "solved" | "unsolved") => {
        if (!current) return;

        try {
            await addAttemptAndUpdateQuestion({
                lessonId: current.lessonId,
                topicId: current.topicId,
                questionId: current.id,
                result,
                hintViewed: false,
                answerViewed: false,
                source: "test_mod3",
            });

            const nextSolved = result === "solved" ? solvedCount + 1 : solvedCount;
            if (result === "solved") setSolvedCount(nextSolved);
            next(nextSolved);
        } catch (e: any) {
            console.log("MOD3 MARK ERROR:", e?.code, e?.message, e);
            alert("Hata", e?.message ?? "Kaydedilemedi", { variant: "danger" });
        }
    };

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
                    <Text style={{ color: c.text, fontWeight: "900", fontSize: 16, textAlign: "center" }}>
                        "Kalıcılık Kontrolü" için yeterli soru bulunamadı.
                    </Text>
                    <Text style={{ color: c.mutedText, marginTop: 8, textAlign: "center" }}>
                        Bu mod; daha önce çözdüğün ve üzerinden belli bir süre geçmiş soruları getirir.
                    </Text>

                    <Pressable
                        onPress={() => router.back()}
                        style={{ marginTop: 14, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: c.buttonBg }}
                    >
                        <Text style={{ color: c.buttonText, fontWeight: "900" }}>Geri</Text>
                    </Pressable>
                </View>
            </ImageBackground>
        );
    }

    return (
        <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
            <View style={{ paddingTop: 60, paddingHorizontal: 18, paddingBottom: 15 }}>
                <Text className="text-center" style={{ color: c.text, fontSize: 18, fontWeight: "900" }}>
                    Kalıcılık Kontrolü
                </Text>
                <View style={{ marginTop: 8 }}>
                    <TestProgressPill index={i} total={questions.length} color={c.testButtonTextColorGreen} />
                </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}>
                <View
                    style={{
                        borderRadius: 18,
                        overflow: "hidden",
                        borderWidth: 1,
                        borderColor: c.borderStrong,
                        backgroundColor: c.card,
                        marginBottom:10
                    }}
                >
                    {questionUri ? (
                        <Pressable onPress={() => openViewer(questionUri)} style={{ width: "100%" }}>
                            <Image source={{ uri: questionUri }} style={{ width: "100%", height: 360, backgroundColor: c.inputBg }} resizeMode="cover" />
                        </Pressable>
                    ) : (
                        <View style={{ padding: 16, minHeight: 220, justifyContent: "center" }}>
                            <Text style={{ color: c.mutedText, fontSize: 12, fontWeight: "800" }}>Metin sorusu</Text>
                            <Text style={{ color: c.text, marginTop: 10, lineHeight: 20, fontWeight: "700" }}>
                                {questionText?.trim() ? questionText : "—"}
                            </Text>
                        </View>
                    )}
                </View>
                <TestHintsAccordion hints={current?.answers} />

                <TestAnswersAccordion
                    answers={current?.answers}
                    onOpenImage={(uri) => openViewer(uri)}
                />

                <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
                    <Pressable
                        onPress={() => mark("solved")}
                        style={{
                            flex: 1,
                            marginRight: 10,
                            minHeight: 48,
                            borderRadius: 16,
                            backgroundColor: c.testButtonBackgroundGreen,
                            borderWidth: 1,
                            borderColor: "rgba(34,197,94,0.55)",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <CheckCircle2 size={18} color={c.testButtonTextColorGreen} />
                            <Text style={{ marginLeft: 8, fontSize: 15, fontWeight: "800", color: c.testButtonTextColorGreen }}>
                                Çözdüm
                            </Text>
                        </View>
                    </Pressable>

                    <Pressable
                        onPress={() => mark("unsolved")}
                        style={{
                            flex: 1,
                            minHeight: 48,
                            borderRadius: 16,
                            backgroundColor: "rgba(239,68,68,0.18)",
                            borderWidth: 1,
                            borderColor: "rgba(239,68,68,0.55)",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <XCircle size={18} color="rgba(239,68,68,0.95)" />
                            <Text style={{ marginLeft: 8, fontSize: 15, fontWeight: "800", color: "rgba(239,68,68,0.95)" }}>
                                Çözemedim
                            </Text>
                        </View>
                    </Pressable>
                </View>

                <Text style={{ color: c.mutedText, marginTop: 10, textAlign: "center", fontSize: 12 }}>
                    İşaretleyince otomatik sıradaki soruya geçer.
                </Text>
            </ScrollView>

            <FullscreenZoomImage uri={viewerUri} visible={viewerOpen} onClose={() => setViewerOpen(false)} />
        </ImageBackground>
    );
}