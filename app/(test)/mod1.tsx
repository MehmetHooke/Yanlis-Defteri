// app/(tabs)/test/mod1.tsx
import { useAppAlert } from "@/src/components/common/AppAlertProvider";
import { useTheme } from "@/src/context/ThemeContext";
import { addAttemptAndUpdateQuestion } from "@/src/services/attempt.service";
import { getMod1WeakQuestions } from "@/src/services/test.service";
import type { Question } from "@/src/types/question";
import { router } from "expo-router";
import { CheckCircle2, XCircle } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, ImageBackground, Pressable, ScrollView, Text, View } from "react-native";

import {
    Dimensions,
    Modal
} from "react-native";

import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from "react-native-gesture-handler";

import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

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


// FULL SCREEN ZOOM FUNCTİON

const { width, height } = Dimensions.get("window");

function FullscreenZoomImage({
    uri,
    visible,
    onClose,
}: {
    uri: string;
    visible: boolean;
    onClose: () => void;
}) {
    const IMG_W = width * 0.95;
    const IMG_H = height * 0.75;

    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);

    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const clamp = (v: number, min: number, max: number) => {
        "worklet";
        return Math.min(Math.max(v, min), max);
    };

    const boundTranslations = () => {
        "worklet";
        const maxX = (IMG_W * (scale.value - 1)) / 2;
        const maxY = (IMG_H * (scale.value - 1)) / 2;
        translateX.value = clamp(translateX.value, -maxX, maxX);
        translateY.value = clamp(translateY.value, -maxY, maxY);
    };

    const resetTransform = () => {
        "worklet";
        scale.value = 1;
        savedScale.value = 1;
        translateX.value = 0;
        translateY.value = 0;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
    };

    const pan = Gesture.Pan()
        .onBegin(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        })
        .onUpdate((e) => {
            translateX.value = savedTranslateX.value + e.translationX;
            translateY.value = savedTranslateY.value + e.translationY;
            boundTranslations();
        });

    const pinch = Gesture.Pinch()
        .onBegin(() => {
            savedScale.value = scale.value;
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        })
        .onUpdate((e) => {
            const nextScale = clamp(savedScale.value * e.scale, 1, 4);

            const cx = IMG_W / 2;
            const cy = IMG_H / 2;
            const dx = e.focalX - cx;
            const dy = e.focalY - cy;

            translateX.value =
                savedTranslateX.value + dx - dx * (nextScale / savedScale.value);
            translateY.value =
                savedTranslateY.value + dy - dy * (nextScale / savedScale.value);

            scale.value = nextScale;
            boundTranslations();
        })
        .onEnd(() => {
            if (scale.value <= 1.01) {
                scale.value = withTiming(1);
                translateX.value = withTiming(0);
                translateY.value = withTiming(0);
                savedScale.value = 1;
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
            } else {
                savedScale.value = scale.value;
            }
        });

    const doubleTap = Gesture.Tap().numberOfTaps(2).onEnd(() => {
        resetTransform();
    });

    const composedGesture = Gesture.Simultaneous(pinch, pan, doubleTap);

    const previewStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            onShow={() => resetTransform()}
        >
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(0,0,0,0.95)",
                        justifyContent: "center",
                        paddingHorizontal: 18,
                    }}
                >
                    <View style={{ alignItems: "flex-end", marginBottom: 12 }}>
                        <Pressable
                            onPress={onClose}
                            style={{
                                borderRadius: 14,
                                backgroundColor: "rgba(255,255,255,0.10)",
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                                borderWidth: 1,
                                borderColor: "rgba(255,255,255,0.10)",
                            }}
                        >
                            <Text style={{ color: "#fff", fontWeight: "800" }}>Kapat</Text>
                        </Pressable>
                    </View>

                    <GestureDetector gesture={composedGesture}>
                        <Animated.Image
                            source={{ uri }}
                            style={[
                                {
                                    width: IMG_W,
                                    height: IMG_H,
                                    borderRadius: 12,
                                    backgroundColor: "rgba(255,255,255,0.03)",
                                    alignSelf: "center",
                                },
                                previewStyle,
                            ]}
                            resizeMode="contain"
                        />
                    </GestureDetector>

                    <Text
                        style={{
                            color: "rgba(255,255,255,0.55)",
                            fontSize: 12,
                            textAlign: "center",
                            marginTop: 12,
                        }}
                    >
                        Pinch: yakınlaştır • Sürükle: kaydır • Çift dokun: sıfırla
                    </Text>
                </View>
            </GestureHandlerRootView>
        </Modal>
    );
}



export default function TestMod1Screen() {
    const { theme } = useTheme();
    const c = theme.colors;
    const { alert } = useAppAlert();

    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [i, setI] = useState(0);

    const current = questions[i] ?? null;

    const questionUri = useMemo(() => getQuestionImageUrl(current), [current]);
    const questionText = useMemo(() => getQuestionText(current), [current]);

    const total = questions.length;
    const progressText = total ? `${i + 1} / ${total}` : "";
    const [solvedCount, setSolvedCount] = useState(0);

    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerUri, setViewerUri] = useState("");

    const openViewer = (uri: string) => {
        setViewerUri(uri);
        setViewerOpen(true);
    };

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const qs = await getMod1WeakQuestions({ take: 5, poolLimit: 120 });
                setQuestions(qs);
                setI(0);
                setSolvedCount(0);
            } catch (e: any) {
                console.log("MOD1 LOAD ERROR:", e?.code, e?.message, e);
                alert("Hata", e?.message ?? "Mod1 hazırlanamadı", { variant: "danger" });
                setQuestions([]);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const next = (nextSolvedCount: number) => {
        if (i + 1 >= questions.length) {
            router.replace({
                pathname: "/(test)/result" as any,
                params: {
                    mode: "mod1",
                    total: String(questions.length),
                    solved: String(nextSolvedCount),
                },
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
                source: "test_mod1",
            });

            const nextSolved = result === "solved" ? solvedCount + 1 : solvedCount;
            if (result === "solved") setSolvedCount(nextSolved);

            next(nextSolved);
        } catch (e: any) {
            console.log("MOD1 MARK ERROR:", e?.code, e?.message, e);
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
                        Mod1 için yeterli soru bulunamadı.
                    </Text>
                    <Text style={{ color: c.mutedText, marginTop: 8, textAlign: "center" }}>
                        Birkaç soru ekleyip deneme kaydı (çözdüm/çözemedim) oluşturduktan sonra tekrar dene.
                    </Text>

                    <Pressable
                        onPress={() => router.back()}
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
            {/* Header */}
            <View style={{ paddingTop: 60, paddingHorizontal: 18, paddingBottom: 10 }}>
                <Text className="text-center" style={{ color: c.text, fontSize: 18, fontWeight: "900" }}>Zayıf Nokta Testi</Text>
                <Text className="text-center" style={{ color: c.text, marginTop: 4, fontWeight: "700" }}> Soru {progressText}</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}>
                {/* Question card */}
                <View
                    style={{
                        borderRadius: 18,
                        overflow: "hidden",
                        borderWidth: 1,
                        borderColor: c.borderStrong,
                        backgroundColor: c.card,
                    }}
                >
                    {questionUri ? (
                        <Pressable onPress={() => openViewer(questionUri)} style={{ width: "100%" }}>
                            <Image
                                source={{ uri: questionUri }}
                                style={{ width: "100%", height: 360, backgroundColor: c.inputBg }}
                                resizeMode="cover"
                            />
                        </Pressable>
                    ) : (
                        <View style={{ padding: 16, minHeight: 220, justifyContent: "center" }}>
                            <Text style={{ color: c.mutedText, fontSize: 12, fontWeight: "800" }}>
                                Metin sorusu
                            </Text>
                            <Text style={{ color: c.text, marginTop: 10, lineHeight: 20, fontWeight: "700" }}>
                                {questionText?.trim() ? questionText : "—"}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Actions */}
                <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
                    <Pressable
                        onPress={() => mark("solved")}
                        style={{
                            flex: 1,
                            marginRight: 10,
                            minHeight: 48,
                            borderRadius: 16,
                            backgroundColor: "rgba(34,197,94,0.12)",
                            borderWidth: 1,
                            borderColor: "rgba(34,197,94,0.55)",

                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <CheckCircle2 size={18} color="rgba(34,197,94,0.95)" />
                            <Text
                                style={{
                                    marginLeft: 8,
                                    fontSize: 15,
                                    fontWeight: "800",
                                    color: "rgba(34,197,94,1)",
                                }}
                            >
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
                            <Text
                                style={{
                                    marginLeft: 8,
                                    fontSize: 15,
                                    fontWeight: "800",
                                    color: "rgba(239,68,68,0.95)",
                                }}
                            >
                                Çözemedim
                            </Text>
                        </View>
                    </Pressable>
                </View>

                <Text style={{ color: c.mutedText, marginTop: 10, textAlign: "center", fontSize: 12 }}>
                    İşaretleyince otomatik sıradaki soruya geçer.
                </Text>
            </ScrollView>

            <FullscreenZoomImage
                uri={viewerUri}
                visible={viewerOpen}
                onClose={() => setViewerOpen(false)}
            />
        </ImageBackground>
    );
}