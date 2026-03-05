// src/components/test/TestAnswersAccordion.tsx
import { useTheme } from "@/src/context/ThemeContext";
import type { Answer } from "@/src/types/question";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

function AnswersContent({
    answers,
    onOpenImage,
}: {
    answers: Answer[];
    onOpenImage?: (uri: string) => void;
}) {
    const { theme } = useTheme();
    const c = theme.colors;

    const chipStyle = useMemo(
        () => ({
            marginTop: 10,
            alignSelf: "flex-start" as const,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            backgroundColor: c.tabActiveBg,
            borderWidth: 1,
            borderColor: c.border,
        }),
        [c],
    );

    return (
        <View style={{ gap: 12 }}>
            {answers.map((a, idx) => (
                <View
                    key={a.id ?? String(idx)}
                    style={{
                        borderRadius: 18,
                        backgroundColor: c.card,
                        borderWidth: 1,
                        borderColor: c.borderStrong,
                        padding: 14,
                    }}
                >
                    <Text style={{ color: c.text, fontWeight: "900" }}>
                        Çözüm {idx + 1}
                    </Text>

                    {a.kind === "text" && (
                        <View style={chipStyle}>
                            <Text style={{ color: c.accent, fontWeight: "900" }}>
                                Açıklama: {a.text ?? "-"}
                            </Text>
                        </View>
                    )}

                    {a.kind === "choice" && (
                        <View style={chipStyle}>
                            <Text style={{ color: c.accent, fontWeight: "900" }}>
                                Doğru Şık: {a.choice ?? "-"}
                            </Text>
                        </View>
                    )}

                    {a.kind === "photo" && (
                        <View style={{ marginTop: 10 }}>
                            {/* ✅ TS: image optional, güvenli kontrol */}
                            {a.image?.url ? (
                                <Pressable
                                    onPress={() => onOpenImage?.(a.image!.url)}
                                    style={{
                                        borderRadius: 14,
                                        overflow: "hidden",
                                        borderWidth: 1,
                                        borderColor: c.borderStrong,
                                        backgroundColor: c.inputBg,
                                    }}
                                >
                                    <Image
                                        source={{ uri: a.image.url }}
                                        style={{ width: "100%", height: 240 }}
                                        resizeMode="cover"
                                    />
                                </Pressable>
                            ) : (
                                <Text style={{ color: c.mutedText, marginTop: 6 }}>
                                    Fotoğraf yok
                                </Text>
                            )}
                        </View>
                    )}

                    {!!a.explanation?.trim() && (
                        <View>
                            <Text style={{ color: c.text, marginTop: 10, fontWeight: "900" }}>
                                Püf Nokta
                            </Text>

                            <Text style={{ color: c.mutedText, marginTop: 2, lineHeight: 20 }}>
                                {a.explanation}
                            </Text>
                        </View>
                    )}
                </View>
            ))}

            {answers.length === 0 && (
                <View
                    style={{
                        borderRadius: 18,
                        backgroundColor: c.card,
                        borderWidth: 1,
                        borderColor: c.borderStrong,
                        padding: 14,
                    }}
                >
                    <Text style={{ color: c.mutedText }}>
                        Bu soruya ait cevap eklenmemiş.
                    </Text>
                </View>
            )}
        </View>
    );
}

export default function TestAnswersAccordion({
    answers,
    onOpenImage,
}: {
    answers?: Answer[];
    onOpenImage?: (uri: string) => void;
}) {
    const { theme } = useTheme();
    const c = theme.colors;

    const safeAnswers = answers ?? [];

    const [open, setOpen] = useState(false);
    const [measuredHeight, setMeasuredHeight] = useState(0);

    const animH = useSharedValue(0);

    // ✅ Animasyonu sadece effect ile yönet (warning biter)
    useEffect(() => {
        animH.value = withTiming(open ? measuredHeight : 0, { duration: 220 });
    }, [open, measuredHeight]); // ✅ open da bağımlılıkta olmalı

    const toggle = () => {
        setOpen((p) => !p); // ✅ burada animH.value yazmıyoruz
    };

    const aStyle = useAnimatedStyle(() => ({ height: animH.value }));

    return (
        <View style={{ marginTop: 14 }}>
            {/* Toggle */}
            <Pressable
                onPress={toggle}
                style={{
                    borderRadius: 16,
                    backgroundColor: c.card,
                    borderWidth: 1,
                    borderColor: c.borderStrong,
                    paddingVertical: 15,
                    paddingHorizontal: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <CheckCircle2 size={18} color={c.accent} />
                    <Text style={{ color: c.text, fontWeight: "900" }}>
                        {open ? "Cevapları Gizle" : "Cevapları Göster"}
                    </Text>
                </View>

                {open ? (
                    <ChevronUp size={18} color={c.mutedText} />
                ) : (
                    <ChevronDown size={18} color={c.mutedText} />
                )}
            </Pressable>

            {/* Hidden measurer (dokunmayı engellemez) */}
            <View
                pointerEvents="none"
                style={{
                    position: "absolute",
                    opacity: 0,
                    zIndex: -1,
                    left: 0,
                    right: 0,
                    top: 0,
                }}
                onLayout={(e) => {
                    const h = e.nativeEvent.layout.height;
                    // ✅ Gereksiz re-render spam olmasın
                    if (Math.abs(h - measuredHeight) > 1) setMeasuredHeight(h);
                }}
            >
                <View style={{ marginTop: 12 }}>
                    <AnswersContent answers={safeAnswers} onOpenImage={onOpenImage} />
                </View>
            </View>

            {/* Animated content */}
            <Animated.View style={[{ overflow: "hidden" }, aStyle]}>
                <View style={{ marginTop: 12 }}>
                    <AnswersContent answers={safeAnswers} onOpenImage={onOpenImage} />
                </View>
            </Animated.View>
        </View>
    );
}