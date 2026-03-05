// app/question/edit/[id].tsx
import { useAppAlert } from "@/src/components/common/AppAlertProvider";
import { useTheme } from "@/src/context/ThemeContext";
import { auth } from "@/src/lib/firebase";
import { lessonDoc, questionDoc, topicDoc, updateQuestionV3 } from "@/src/services/question.service";
import type { Lesson } from "@/src/types/lesson";
import type { Answer, Question } from "@/src/types/question";
import type { Topic } from "@/src/types/topic";

import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { getDoc } from "firebase/firestore";
import { Camera, CheckCircle2, Image as ImageIcon, Trash2, Type as TypeIcon, X } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import PagerView from "react-native-pager-view";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type RemoteImage = { url: string; path: string };

type DraftAnswer =
    | {
        id: string;
        kind: "choice";
        choice?: "A" | "B" | "C" | "D" | "E";
        explanation?: string;
    }
    | {
        id: string;
        kind: "photo";
        image?: RemoteImage;     // ✅ eski (remote)
        imageUri?: string;       // ✅ yeni seçilirse (local)
        explanation?: string;
    }
    | {
        id: string;
        kind: "text";
        text?: string;
        explanation?: string;
    };

type QuestionDraft =
    | { kind: "photo"; image?: RemoteImage; imageUri?: string }
    | { kind: "text"; text: string };

function makeSnapshot(q: QuestionDraft, lesson: string, topic: string, answers: DraftAnswer[]) {
    // sadece kaydı etkileyen alanlar (createdAt vs yok)
    return JSON.stringify({ q, lesson, topic, answers });
}

export default function EditQuestionScreen() {
    const { theme } = useTheme();
    const c = theme.colors;
    const insets = useSafeAreaInsets();
    const nav = useNavigation();

    const { id, lessonId, topicId } = useLocalSearchParams<{
        id: string;
        lessonId?: string;
        topicId?: string;
    }>();

    const { alert, confirm } = useAppAlert();

    const pagerRef = useRef<PagerView>(null);
    const [activeTab, setActiveTab] = useState<0 | 1>(0);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // form state
    const [question, setQuestion] = useState<QuestionDraft>({ kind: "text", text: "" });
    const [lesson, setLesson] = useState("");
    const [topic, setTopic] = useState("");
    const [answers, setAnswers] = useState<DraftAnswer[]>([{ id: Date.now().toString(), kind: "choice" }]);
    
    const allowLeaveRef = useRef(false);
    const [initialSnap, setInitialSnap] = useState<string>("");

    const gotoTab = (idx: 0 | 1) => {
        setActiveTab(idx);
        pagerRef.current?.setPage(idx);
    };

    function ChoiceGrid({ a }: { a: Extract<DraftAnswer, { kind: "choice" }> }) {
        return (
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                {(["A", "B", "C", "D", "E"] as const).map((opt) => {
                    const active = a.choice === opt;
                    return (
                        <Pressable
                            key={opt}
                            onPress={() => updateAnswer(a.id, { choice: opt })}
                            style={{
                                width: 46,
                                height: 46,
                                borderRadius: 14,
                                alignItems: "center",
                                justifyContent: "center",
                                borderWidth: 1,
                                borderColor: active ? "transparent" : c.border,
                                backgroundColor: active ? c.accent : c.inputBg,
                            }}
                        >
                            <Text style={{ color: active ? "#fff" : c.text, fontWeight: "900" }}>{opt}</Text>
                        </Pressable>
                    );
                })}
            </View>
        );
    }

    // ------- load initial data -------
    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                setLoading(true);
                const user = auth.currentUser;
                if (!user) return;

                if (!lessonId || !topicId) {
                    // sen her zaman gönderiyorsun ama güvenlik:
                    throw new Error("lessonId/topicId eksik geldi.");
                }

                const qRef = questionDoc(user.uid, String(lessonId), String(topicId), String(id));

                const snap = await getDoc(qRef);
                if (!snap.exists()) throw new Error("Soru bulunamadı.");
                const q = snap.data() as Question;

                // lesson/topic isimleri
                const lSnap = await getDoc(lessonDoc(user.uid, String(lessonId)));
                const tSnap = await getDoc(topicDoc(user.uid, String(lessonId), String(topicId)));
                const lessonName = (lSnap.data() as Lesson | undefined)?.name ?? "";
                const topicName = (tSnap.data() as Topic | undefined)?.name ?? "";

                // question draft map (V3 + legacy uyum)
                const qPhoto: RemoteImage | undefined =
                    q.question?.kind === "photo"
                        ? q.question.image
                        : q.questionImage
                            ? q.questionImage
                            : q.imageUrl && q.imagePath
                                ? { url: q.imageUrl, path: q.imagePath }
                                : undefined;

                const qText =
                    q.question?.kind === "text" ? q.question.text : "";

                const mappedQuestion: QuestionDraft =
                    q.question?.kind === "text"
                        ? { kind: "text", text: qText }
                        : qPhoto
                            ? { kind: "photo", image: qPhoto }
                            : { kind: "text", text: qText || "" };

                const mappedAnswers: DraftAnswer[] =
                    (q.answers ?? []).map((a: Answer) => {
                        if (a.kind === "choice") return { id: a.id, kind: "choice", choice: a.choice, explanation: a.explanation };
                        if (a.kind === "text") return { id: a.id, kind: "text", text: a.text, explanation: a.explanation };
                        return { id: a.id, kind: "photo", image: a.image, explanation: a.explanation };
                    });

                // ✅ en az 1 kart garantisi
                const fallbackAnswer: DraftAnswer = { id: Date.now().toString(), kind: "choice" };

                const safeAnswers: DraftAnswer[] =
                    mappedAnswers.length > 0 ? mappedAnswers : [fallbackAnswer];

                if (!mounted) return;
                setQuestion(mappedQuestion);
                setLesson(lessonName || "");
                setTopic(topicName || "");
                setAnswers(safeAnswers);

                const snapStr = makeSnapshot(mappedQuestion, lessonName || "", topicName || "", safeAnswers);
                setInitialSnap(snapStr);
            } catch (e: any) {
                alert("Hata", e?.message ?? "Yüklenemedi");
                router.back();
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [id, lessonId, topicId]);

    const dirty = useMemo(() => {
        if (!initialSnap) return false;
        return makeSnapshot(question, lesson, topic, answers) !== initialSnap;
    }, [initialSnap, question, lesson, topic, answers]);

    // ------- block modal dismiss if dirty -------
    useEffect(() => {
        const unsub = nav.addListener("beforeRemove", (e: any) => {
            // ✅ daha önce "izin ver" dendi ise engelleme
            if (allowLeaveRef.current) return;

            // ✅ değişiklik yoksa normal çık
            if (!dirty) return;

            // ❌ çıkışı burada durduruyoruz
            e.preventDefault();

            confirm({
                title: "Kaydedilmedi",
                message: "Değişiklikler kaybolacak. Çıkmak istiyor musun?",
                confirmText: "Çık",
                destructive: true,
                onConfirm: () => {
                    // ✅ bir kere izin ver ve orijinal aksiyonu uygula
                    allowLeaveRef.current = true;
                    nav.dispatch(e.data.action);

                    // ✅ çok önemli: sonra tekrar bloklamaya dön (ekran kalırsa)
                    requestAnimationFrame(() => {
                        allowLeaveRef.current = false;
                    });
                },
            });
        });

        return unsub;
    }, [nav, dirty, confirm]);

    // ------- pickers -------
    const pickQuestionImage = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true });
        if (!res.canceled) {
            setQuestion((prev) => ({ kind: "photo", imageUri: res.assets[0].uri, image: prev.kind === "photo" ? prev.image : undefined }));
        }
    };

    const takeQuestionPhoto = async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return alert("İzin gerekli", "Kamera izni olmadan fotoğraf çekemezsin.");
        const res = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true });
        if (!res.canceled) {
            setQuestion((prev) => ({ kind: "photo", imageUri: res.assets[0].uri, image: prev.kind === "photo" ? prev.image : undefined }));
        }
    };

    const pickAnswerPhoto = async (id: string) => {
        const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true });
        if (!res.canceled) {
            setAnswers((prev) =>
                prev.map((a) => (a.id === id && a.kind === "photo" ? { ...a, imageUri: res.assets[0].uri } : a))
            );
        }
    };

    const takeAnswerPhoto = async (id: string) => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return alert("İzin gerekli", "Kamera izni olmadan fotoğraf çekemezsin.");
        const res = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true });
        if (!res.canceled) {
            setAnswers((prev) =>
                prev.map((a) => (a.id === id && a.kind === "photo" ? { ...a, imageUri: res.assets[0].uri } : a))
            );
        }
    };

    // ------- answer helpers -------
    const addAnswer = () => {
        if (answers.length >= 3) return alert("Limit", "En fazla 3 çözüm ekleyebilirsin.");
        setAnswers((p) => [...p, { id: Date.now().toString(), kind: "choice" }]);
    };

    const removeAnswer = (aid: string) => {
        if (answers.length <= 1) return alert("Zorunlu", "En az 1 çözüm eklemelisin.");
        setAnswers((p) => p.filter((x) => x.id !== aid));
    };

    const updateAnswer = (aid: string, data: Partial<DraftAnswer>) => {
        setAnswers((p) => p.map((x) => (x.id === aid ? { ...x, ...data } : x)));
    };

    const switchAnswerKind = (aid: string, kind: "choice" | "photo" | "text") => {
        setAnswers((prev) =>
            prev.map((a) => {
                if (a.id !== aid) return a;
                if (kind === "choice") return { id: aid, kind: "choice", choice: undefined, explanation: a.explanation };
                if (kind === "photo") return { id: aid, kind: "photo", image: a.kind === "photo" ? a.image : undefined, imageUri: undefined, explanation: a.explanation };
                return { id: aid, kind: "text", text: "", explanation: a.explanation };
            })
        );
    };

    // ------- provided answers for save -------
    const providedAnswers = useMemo(() => {
        return answers
            .map((a) => {
                if (a.kind === "choice") return a.choice ? a : null;
                if (a.kind === "photo") return a.imageUri || a.image ? a : null;
                return a.text?.trim() ? a : null;
            })
            .filter(Boolean) as DraftAnswer[];
    }, [answers]);

    // ------- save -------
    const onSave = async () => {
        const user = auth.currentUser;
        if (!user) return;

        if (!lesson.trim()) return alert("Eksik", "Ders boş olamaz.");
        if (!topic.trim()) return alert("Eksik", "Konu boş olamaz.");

        if (question.kind === "photo") {
            if (!question.imageUri && !question.image) return alert("Eksik", "Soru fotoğrafı seçilmedi.");
        } else {
            if (!question.text.trim()) return alert("Eksik", "Soru metni boş olamaz.");
        }

        if (providedAnswers.length < 1) return alert("Eksik", "En az 1 çözüm eklemelisin.");

        try {
            setSaving(true);

            console.log("[UI] calling updateQuestionV3...");
            const res = await updateQuestionV3({
                userId: user.uid,
                questionId: String(id),

                oldLessonId: String(lessonId),
                oldTopicId: String(topicId),

                lesson: lesson.trim(),
                topic: topic.trim(),
                question,
                answers,
            });
            console.log("[UI] updateQuestionV3 returned:", res);

            alert("Başarılı", "Soru güncellendi.", { variant: "success" });

            // initial snapshot güncelle (dirty sıfırlansın)
            setInitialSnap(makeSnapshot(question, lesson.trim(), topic.trim(), answers));

            router.push("/(tabs)/questions");
        } catch (e: any) {

            alert("Hata", `${e?.code ?? ""} ${e?.message ?? "Güncellenemedi"}`);
        } finally {
            setSaving(false);
        }
    };

    // ------- UI helpers -------
    function IconAction({ onPress, icon, active }: { onPress: () => void; icon: React.ReactNode; active?: boolean }) {
        return (
            <Pressable
                onPress={onPress}
                style={{
                    flex: 1,
                    height: 56,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: active ? "transparent" : c.border,
                    backgroundColor: active ? c.tabActiveBg : c.card,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {icon}
            </Pressable>
        );
    }

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: c.background, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator />
            </View>
        );
    }

    return (
        <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1 }}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                    {/* Modal Header */}
                    <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Pressable
                                onPress={() => {
                                    if (!dirty) return router.back();
                                    confirm({
                                        title: "Kaydedilmedi",
                                        message: "Değişiklikler kaybolacak. Çıkmak istiyor musun?",
                                        confirmText: "Çık",
                                        destructive: true,
                                        onConfirm: () => router.replace("/(tabs)")
                                    });
                                }}
                                style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 14,
                                    backgroundColor: c.inputBg,
                                    borderWidth: 1,
                                    borderColor: c.border,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <X size={22} color={c.text} />
                            </Pressable>

                            <View style={{ flex: 1, alignItems: "center" }}>
                                <Text style={{ color: c.text, fontSize: 18, fontWeight: "900" }}>Soruyu Düzenle</Text>
                                <Text style={{ color: c.mutedText, fontSize: 12, marginTop: 2 }}>
                                    {dirty ? "Değişiklik var" : "Kaydedildi"}
                                </Text>
                            </View>

                            <Pressable
                                onPress={() => {
                                    console.log("[UI] Save button onPress ✅");
                                    onSave();
                                }}
                                disabled={saving}
                                style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 14,
                                    backgroundColor: c.buttonBg,
                                    borderWidth: 1,
                                    borderColor: "transparent",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    opacity: saving ? 0.7 : 1,
                                }}
                            >
                                {saving ? <ActivityIndicator /> : <CheckCircle2 size={22} color={c.buttonText} />}
                            </Pressable>
                        </View>

                        {/* Seg Tabs */}
                        <View
                            style={{
                                marginTop: 14,
                                padding: 6,
                                borderRadius: 999,
                                backgroundColor: c.tabBg,
                                borderWidth: 1,
                                borderColor: c.tabBorder,
                                flexDirection: "row",
                                gap: 6,
                            }}
                        >
                            <Pressable
                                onPress={() => gotoTab(0)}
                                style={{
                                    flex: 1,
                                    paddingVertical: 10,
                                    borderRadius: 999,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexDirection: "row",
                                    gap: 8,
                                    backgroundColor: activeTab === 0 ? c.tabActiveBg : "transparent",
                                }}
                            >
                                <ImageIcon size={18} color={activeTab === 0 ? c.tabActive : c.tabInactive} />
                                <Text style={{ color: activeTab === 0 ? c.tabActive : c.tabInactive, fontWeight: "800" }}>Soru</Text>
                            </Pressable>

                            <Pressable
                                onPress={() => gotoTab(1)}
                                style={{
                                    flex: 1,
                                    paddingVertical: 10,
                                    borderRadius: 999,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexDirection: "row",
                                    gap: 8,
                                    backgroundColor: activeTab === 1 ? c.tabActiveBg : "transparent",
                                }}
                            >
                                <CheckCircle2 size={18} color={activeTab === 1 ? c.tabActive : c.tabInactive} />
                                <Text style={{ color: activeTab === 1 ? c.tabActive : c.tabInactive, fontWeight: "800" }}>Cevap</Text>
                            </Pressable>
                        </View>
                    </View>

                    <PagerView
                        style={{ flex: 1, marginTop: 10 }}
                        ref={pagerRef}
                        initialPage={0}
                        onPageSelected={(e) => setActiveTab(e.nativeEvent.position as 0 | 1)}
                    >
                        {/* TAB 1 */}
                        <ScrollView key="q" contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90 }} showsVerticalScrollIndicator={false}>
                            <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
                                <IconAction
                                    onPress={pickQuestionImage}
                                    active={question.kind === "photo"}
                                    icon={<ImageIcon size={22} color={c.accent} />}
                                />
                                <IconAction
                                    onPress={takeQuestionPhoto}
                                    active={question.kind === "photo"}
                                    icon={<Camera size={22} color={c.accent} />}
                                />
                                <IconAction
                                    onPress={() => setQuestion({ kind: "text", text: question.kind === "text" ? question.text : "" })}
                                    active={question.kind === "text"}
                                    icon={<TypeIcon size={22} color={c.accent} />}
                                />
                            </View>

                            <View style={{ backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 20, padding: 12 }}>
                                {question.kind === "photo" ? (
                                    question.imageUri || question.image?.url ? (
                                        <Image
                                            source={{ uri: question.imageUri ?? question.image!.url }}
                                            style={{ width: "100%", height: 230, borderRadius: 16 }}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View
                                            style={{
                                                height: 230,
                                                borderRadius: 16,
                                                borderWidth: 1,
                                                borderColor: c.border,
                                                backgroundColor: c.inputBg,
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <Text style={{ color: c.mutedText, fontWeight: "700" }}>Soru fotoğrafını seç veya çek</Text>
                                        </View>
                                    )
                                ) : (
                                    <TextInput
                                        value={question.text}
                                        onChangeText={(t) => setQuestion({ kind: "text", text: t })}
                                        placeholder="Soruyu buraya yaz"
                                        placeholderTextColor={c.mutedText}
                                        multiline
                                        style={{
                                            backgroundColor: c.inputBg,
                                            borderColor: c.border,
                                            borderWidth: 1,
                                            borderRadius: 16,
                                            paddingHorizontal: 12,
                                            paddingVertical: 12,
                                            color: c.text,
                                            minHeight: 160,
                                            textAlignVertical: "top",
                                            paddingTop: 12,
                                        }}
                                    />
                                )}
                            </View>

                            <View style={{ marginTop: 12, gap: 10 }}>
                                <TextInput
                                    value={lesson}
                                    onChangeText={setLesson}
                                    placeholder="Ders adı"
                                    placeholderTextColor={c.mutedText}
                                    style={{
                                        backgroundColor: c.inputBg,
                                        borderColor: c.border,
                                        borderWidth: 1,
                                        borderRadius: 16,
                                        paddingHorizontal: 12,
                                        paddingVertical: 12,
                                        color: c.text,
                                    }}
                                />
                                <TextInput
                                    value={topic}
                                    onChangeText={setTopic}
                                    placeholder="Konu adı"
                                    placeholderTextColor={c.mutedText}
                                    style={{
                                        backgroundColor: c.inputBg,
                                        borderColor: c.border,
                                        borderWidth: 1,
                                        borderRadius: 16,
                                        paddingHorizontal: 12,
                                        paddingVertical: 12,
                                        color: c.text,
                                    }}
                                />
                            </View>

                            <Pressable
                                onPress={() => gotoTab(1)}
                                style={{
                                    backgroundColor: c.buttonBg,
                                    borderRadius: 18,
                                    paddingVertical: 14,
                                    alignItems: "center",
                                    marginTop: 14,
                                }}
                            >
                                <Text style={{ color: c.buttonText, fontWeight: "900" }}>Çözüme Geç</Text>
                            </Pressable>
                        </ScrollView>

                        {/* -------------------- TAB 2: ANSWERS -------------------- */}
                        <ScrollView
                            key="answers"
                            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90 }}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {answers.map((a, index) => {
                                const isChoice = a.kind === "choice";
                                const isPhoto = a.kind === "photo";

                                // ✅ edit için: remote image da göster
                                const photoUri =
                                    a.kind === "photo" ? (a.imageUri ?? a.image?.url ?? null) : null;

                                return (
                                    <View key={a.id} style={[{ backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 20 }, { padding: 14, marginBottom: 12 }]}>
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                            <Text style={{ color: c.text, fontWeight: "900" }}>Çözüm {index + 1}</Text>
                                            <Pressable onPress={() => removeAnswer(a.id)} hitSlop={10}>
                                                <Trash2 size={18} color={"#FF5A6A"} />
                                            </Pressable>
                                        </View>

                                        {/* Type switch (Şıklı / Görsel / Metin) */}
                                        <View
                                            style={{
                                                marginTop: 10,
                                                padding: 6,
                                                borderRadius: 25,
                                                backgroundColor: c.tabBg,
                                                borderWidth: 1,
                                                borderColor: c.tabBorder,
                                                flexDirection: "row",
                                                gap: 6,
                                            }}
                                        >
                                            {(() => {
                                                const isChoice = a.kind === "choice";
                                                const isPhoto = a.kind === "photo";
                                                const isText = a.kind === "text";

                                                const Item = ({
                                                    active,
                                                    label,
                                                    icon,
                                                    onPress,
                                                }: {
                                                    active: boolean;
                                                    label: string;
                                                    icon: React.ReactNode;
                                                    onPress: () => void;
                                                }) => (
                                                    <Pressable
                                                        onPress={onPress}
                                                        style={{
                                                            flex: 1,
                                                            paddingVertical: 10,
                                                            borderRadius: 22,
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            flexDirection: "row",
                                                            gap: 8,
                                                            backgroundColor: active ? c.tabActiveBg : "transparent",
                                                        }}
                                                    >
                                                        {icon}
                                                        <Text style={{ color: active ? c.tabActive : c.tabInactive, fontWeight: "900" }}>
                                                            {label}
                                                        </Text>
                                                    </Pressable>
                                                );

                                                return (
                                                    <>
                                                        <Item
                                                            active={isChoice}
                                                            label="Şıklı"
                                                            onPress={() => switchAnswerKind(a.id, "choice")}
                                                            icon={<CheckCircle2 size={18} color={isChoice ? c.tabActive : c.tabInactive} />}
                                                        />
                                                        <Item
                                                            active={isPhoto}
                                                            label="Görsel"
                                                            onPress={() => switchAnswerKind(a.id, "photo")}
                                                            icon={<ImageIcon size={18} color={isPhoto ? c.tabActive : c.tabInactive} />}
                                                        />
                                                        <Item
                                                            active={isText}
                                                            label="Metin"
                                                            onPress={() => switchAnswerKind(a.id, "text")}
                                                            icon={<TypeIcon size={18} color={isText ? c.tabActive : c.tabInactive} />}
                                                        />
                                                    </>
                                                );
                                            })()}
                                        </View>

                                        {/* Choice */}
                                        {isChoice && <ChoiceGrid a={a as any} />}

                                        {/* Photo */}
                                        {a.kind === "photo" && (
                                            <View style={{ marginTop: 12 }}>
                                                <View style={{ flexDirection: "row", gap: 10 }}>
                                                    <Pressable
                                                        onPress={() => pickAnswerPhoto(a.id)}
                                                        style={{
                                                            flex: 1,
                                                            height: 56,
                                                            borderRadius: 16,
                                                            borderWidth: 1,
                                                            borderColor: c.border,
                                                            backgroundColor: c.inputBg,
                                                            flexDirection: "row",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            gap: 10,
                                                        }}
                                                    >
                                                        <ImageIcon size={22} color={c.accent} />
                                                        <Text style={{ color: c.text, fontWeight: "900" }}>Galeri</Text>
                                                    </Pressable>

                                                    <Pressable
                                                        onPress={() => takeAnswerPhoto(a.id)}
                                                        style={{
                                                            flex: 1,
                                                            height: 56,
                                                            borderRadius: 16,
                                                            borderWidth: 1,
                                                            borderColor: c.border,
                                                            backgroundColor: c.inputBg,
                                                            flexDirection: "row",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            gap: 10,
                                                        }}
                                                    >
                                                        <Camera size={22} color={c.accent} />
                                                        <Text style={{ color: c.text, fontWeight: "900" }}>Kamera</Text>
                                                    </Pressable>
                                                </View>

                                                <View
                                                    style={{
                                                        marginTop: 10,
                                                        height: 170,
                                                        borderRadius: 18,
                                                        borderWidth: 1,
                                                        borderColor: c.border,
                                                        backgroundColor: c.inputBg,
                                                        overflow: "hidden",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                >
                                                    {photoUri ? (
                                                        <Image
                                                            source={{ uri: photoUri }}
                                                            style={{ width: "100%", height: "100%" }}
                                                            resizeMode="cover"
                                                        />
                                                    ) : (
                                                        <Text style={{ color: c.mutedText, fontWeight: "700" }}>
                                                            Çözüm görseli ekle (Galeri / Kamera)
                                                        </Text>
                                                    )}
                                                </View>
                                            </View>
                                        )}

                                        {/* Text */}
                                        {a.kind === "text" && (
                                            <View style={{ marginTop: 12 }}>
                                                <TextInput
                                                    value={a.text ?? ""}
                                                    onChangeText={(t) => updateAnswer(a.id, { text: t })}
                                                    placeholder="Çözümü metin olarak buraya yazabilirsin."
                                                    placeholderTextColor={c.mutedText}
                                                    maxLength={200}
                                                    multiline
                                                    style={{
                                                        backgroundColor: c.inputBg,
                                                        borderColor: c.border,
                                                        borderWidth: 1,
                                                        borderRadius: 16,
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 12,
                                                        color: c.text,
                                                        minHeight: 110,
                                                        textAlignVertical: "top",
                                                        paddingTop: 12,
                                                    }}
                                                />
                                                <Text style={{ marginTop: 6, color: c.mutedText, fontWeight: "700", textAlign: "right" }}>
                                                    {(a.text?.length ?? 0)}/200
                                                </Text>
                                            </View>
                                        )}

                                        {/* Explanation */}
                                        <TextInput
                                            value={a.explanation ?? ""}
                                            onChangeText={(t) => updateAnswer(a.id, { explanation: t })}
                                            placeholder="Sorunun cevabını görmeden hatırlamanı sağlayacak püf noktalar girebilirsin."
                                            placeholderTextColor={c.mutedText}
                                            multiline
                                            numberOfLines={3}
                                            style={{
                                                backgroundColor: c.inputBg,
                                                borderColor: c.border,
                                                borderWidth: 1,
                                                borderRadius: 16,
                                                paddingHorizontal: 12,
                                                paddingVertical: 12,
                                                color: c.text,
                                                marginTop: 12,
                                                minHeight: 90,
                                                textAlignVertical: "top",
                                                paddingTop: 14,
                                            }}
                                        />
                                    </View>
                                );
                            })}

                            {answers.length === 1 && (
                                <View style={{ marginVertical: 16, paddingHorizontal: 8 }}>
                                    <Text style={{ color: c.mutedText }}>
                                        Birden fazla çözüm eklemek istiyorsan buradan ekleyebilirsin. Maximum 3 adet çözüm ekleyebilirsin.
                                    </Text>
                                </View>
                            )}

                            <Pressable
                                onPress={addAnswer}
                                style={{
                                    backgroundColor: c.card,
                                    borderColor: c.border,
                                    borderWidth: 1,
                                    borderRadius: 18,
                                    paddingVertical: 14,
                                    alignItems: "center",
                                    flexDirection: "row",
                                    justifyContent: "center",
                                    gap: 8,
                                    marginBottom: 12,
                                }}
                            >
                                <CheckCircle2 size={20} color={c.accent} />
                                <Text style={{ color: c.text, fontWeight: "700" }}>Çözüm Ekle</Text>
                            </Pressable>

                            {/* Save edit */}
                            <Pressable
                                onPress={onSave}
                                disabled={saving}
                                style={{
                                    backgroundColor: c.buttonBg,
                                    borderRadius: 18,
                                    paddingVertical: 14,
                                    alignItems: "center",
                                    opacity: saving ? 0.7 : 1,
                                }}
                            >
                                {saving ? <ActivityIndicator /> : <Text style={{ color: c.buttonText, fontWeight: "900" }}>Güncelle</Text>}
                            </Pressable>
                        </ScrollView>
                    </PagerView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </ImageBackground>
    );
}