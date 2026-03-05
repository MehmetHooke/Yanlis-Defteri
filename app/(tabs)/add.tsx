// app/(tabs)/add.tsx

import { auth } from "@/src/lib/firebase";
import { addQuestionV3 } from "@/src/services/question.service";

import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
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
  View
} from "react-native";
import PagerView from "react-native-pager-view";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppAlert } from "@/src/components/common/AppAlertProvider";
import { useTheme } from "@/src/context/ThemeContext";
import {
  BanIcon,
  Camera,
  CheckCircle2,
  CheckCircle2Icon,
  Image as ImageIcon,
  PlusCircle,
  Trash2,
  Type as TypeIcon
} from "lucide-react-native";

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
    imageUri?: string;
    explanation?: string;
  }
  | {
    id: string;
    kind: "text";
    text?: string;
    explanation?: string;
  };

type QuestionDraft =
  | { kind: "photo"; imageUri: string | null }
  | { kind: "text"; text: string };

export default function AddScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const pagerRef = useRef<PagerView>(null);
  const [activeTab, setActiveTab] = useState<0 | 1>(0);

  // ✅ Soru: foto veya metin
  const [question, setQuestion] = useState<QuestionDraft>({
    kind: "photo",
    imageUri: null,
  });
  const resetForm = () => {
    // Soru (default: foto)
    setQuestion({ kind: "photo", imageUri: null });

    // Ders / Konu
    setLesson("");
    setTopic("");

    // Cevaplar (1 tane başlangıç kartı)
    setAnswers([{ id: Date.now().toString(), kind: "choice" }]);

    // Tab geri al
    setActiveTab(0);
    pagerRef.current?.setPage(0);

    // (opsiyonel) en üste kaydırmak istersen scrollRef ile yapılır
  };

  const [lesson, setLesson] = useState("");
  const [topic, setTopic] = useState("");

  // ✅ Cevaplar: min 1 max 3
  const [answers, setAnswers] = useState<DraftAnswer[]>([
    { id: Date.now().toString(), kind: "choice" }, // başlangıçta 1 tane hazır
  ]);

  const [loading, setLoading] = useState(false);
  const { alert, confirm } = useAppAlert();

  const providedAnswers = useMemo(() => {
    return answers
      .map((a) => {
        if (a.kind === "choice") {
          if (!a.choice) return null;
          return a;
        }
        if (a.kind === "photo") {
          if (!a.imageUri) return null;
          return a;
        }
        // text
        if (!a.text?.trim()) return null;
        return a;
      })
      .filter(Boolean) as DraftAnswer[];
  }, [answers]);

  const draftSaveError = useMemo(() => {
    // soru
    if (question.kind === "photo") {
      if (!question.imageUri) return "Soru fotoğrafı eklenmemiş. Galeri/Kamera ile ekle veya metin seç.";
    } else {
      if (!question.text?.trim()) return "Soru metni boş.Lütfen Metin alanına soruyu yazınız.";
    }

    // ders / konu
    if (!lesson.trim()) return "Ders boş.Lütfen ders adını giririniz.";
    if (!topic.trim()) return "Konu boş.Lütfen Konu adını giririniz.";

    // cevap: en az 1 dolu çözüm
    if (providedAnswers.length < 1) return "En az 1 çözüm eklemelisin (Şıklı/Galeri/Metin).";

    // text limit kontrol (sadece doluysa)
    for (let i = 0; i < answers.length; i++) {
      const a = answers[i];
      if (a.kind === "text" && a.text && a.text.length > 200) {
        return `Çözüm ${i + 1}: Metin 200 karakteri geçemez.`;
      }
    }

    return null;
  }, [question, lesson, topic, answers, providedAnswers]);

  const requirements = useMemo(() => {
    const isQuestionOk =
      question.kind === "photo"
        ? !!question.imageUri
        : !!question.text?.trim();

    const isLessonOk = !!lesson.trim();
    const isTopicOk = !!topic.trim();
    const isAtLeastOneAnswerOk = providedAnswers.length >= 1;

    const isTextLimitOk = !answers.some(
      (a) => a.kind === "text" && (a.text?.length ?? 0) > 200
    );

    return [
      { key: "q", label: "Soru eklendi", ok: isQuestionOk },
      { key: "l", label: "Ders adı girildi", ok: isLessonOk },
      { key: "t", label: "Konu adı girildi", ok: isTopicOk },
      { key: "a", label: "En az 1 çözüm eklendi", ok: isAtLeastOneAnswerOk },
      { key: "tx", label: "Metin çözüm 200 karakteri geçmiyor", ok: isTextLimitOk },
    ];
  }, [question, lesson, topic, providedAnswers.length, answers]);

  const saveDisabled = loading || !!draftSaveError;

  const styles = useMemo(() => {
    return {
      pagePaddingBottom: insets.bottom + 90,
      headerPad: { paddingHorizontal: 16, paddingTop: 10 },

      pillWrap: {
        marginTop: 14,
        padding: 6,
        borderRadius: 999,
        backgroundColor: c.tabBg,
        borderWidth: 1,
        borderColor: c.tabBorder,
        flexDirection: "row" as const,
        gap: 6,
      },

      card: {
        backgroundColor: c.card,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: 20,
      },

      input: {
        backgroundColor: c.inputBg,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 12,
        color: c.text,
      },

      primaryBtn: {
        backgroundColor: c.buttonBg,
        borderRadius: 18,
        paddingVertical: 14,
        alignItems: "center" as const,
      },

      primaryBtnText: {
        color: c.buttonText,
        fontWeight: "900" as const,
      },

      secondaryBtn: {
        backgroundColor: c.card,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: 18,
        paddingVertical: 14,
        alignItems: "center" as const,
        flexDirection: "row" as const,
        justifyContent: "center" as const,
        gap: 8,
      },
    };
  }, [c, insets.bottom]);

  /* -------------------- helpers -------------------- */

  const gotoTab = (idx: 0 | 1) => {
    setActiveTab(idx);
    pagerRef.current?.setPage(idx);
  };

  const trimOrUndefined = (v?: string) => {
    const t = v?.trim();
    return t ? t : undefined;
  };

  /* -------------------- QUESTION PICKERS -------------------- */

  const pickQuestionImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.85,
      allowsEditing: true,
    });
    if (!res.canceled) {
      setQuestion({ kind: "photo", imageUri: res.assets[0].uri });
    }
  };

  const takeQuestionPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      alert("İzin gerekli", "Kamera izni olmadan fotoğraf çekemezsin.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: true,
    });
    if (!res.canceled) {
      setQuestion({ kind: "photo", imageUri: res.assets[0].uri });
    }
  };

  /* -------------------- ANSWER PICKERS -------------------- */

  const pickAnswerPhoto = async (id: string) => {
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.85,
      allowsEditing: true,
    });

    if (!res.canceled) {
      setAnswers((prev) =>
        prev.map((a) =>
          a.id === id && a.kind === "photo" ? { ...a, imageUri: res.assets[0].uri } : a
        )
      );
    }
  };

  const takeAnswerPhoto = async (id: string) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      alert("İzin gerekli", "Kamera izni olmadan fotoğraf çekemezsin.");
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: true,
    });

    if (!res.canceled) {
      setAnswers((prev) =>
        prev.map((a) =>
          a.id === id && a.kind === "photo" ? { ...a, imageUri: res.assets[0].uri } : a
        )
      );
    }
  };

  /* -------------------- ANSWER HANDLING -------------------- */

  const addAnswer = () => {
    if (answers.length >= 3) {
      alert("Limit", "En fazla 3 çözüm ekleyebilirsin.");
      return;
    }
    setAnswers((prev) => [...prev, { id: Date.now().toString(), kind: "choice" }]);
  };

  const removeAnswer = (id: string) => {
    if (answers.length <= 1) {
      alert("Zorunlu", "En az 1 çözüm eklemelisin.");
      return;
    }
    setAnswers((prev) => prev.filter((a) => a.id !== id));
  };

  const updateAnswer = (id: string, data: Partial<DraftAnswer>) => {
    setAnswers((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
  };

  const switchAnswerKind = (id: string, kind: "choice" | "photo" | "text") => {
    setAnswers((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;

        if (kind === "choice") {
          return { id, kind: "choice", choice: undefined, explanation: a.explanation };
        }
        if (kind === "photo") {
          return { id, kind: "photo", imageUri: undefined, explanation: a.explanation };
        }
        // text
        return { id, kind: "text", text: "", explanation: a.explanation };
      })
    );
  };

  /* -------------------- SAVE -------------------- */

  const onSave = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (draftSaveError) return;

    // soru
    if (question.kind === "photo") {
      if (!question.imageUri) {
        return alert("Eksik", "Soru için fotoğraf seç/çek ya da Tt ile metin gir.");
      }
    } else {
      if (!question.text.trim()) return alert("Eksik", "Soru metni boş olamaz.");
    }

    // ders/konu
    if (!lesson.trim()) return alert("Eksik", "Ders boş olamaz.");
    if (!topic.trim()) return alert("Eksik", "Konu boş olamaz.");

    // cevap
    if (answers.length < 1) return alert("Eksik", "En az 1 çözüm eklemelisin.");
    if (answers.length > 3) return alert("Limit", "En fazla 3 çözüm ekleyebilirsin.");

    try {
      setLoading(true);

      await addQuestionV3({
        userId: user.uid,
        lesson: lesson.trim(),
        topic: topic.trim(),
        question:
          question.kind === "photo"
            ? { kind: "photo", imageUri: question.imageUri! }
            : { kind: "text", text: question.text.trim() },
        answers: providedAnswers.map((a) => {
          if (a.kind === "choice") {
            return {
              id: a.id,
              kind: a.kind,
              choice: a.choice,
              explanation: trimOrUndefined(a.explanation),
            };
          }

          if (a.kind === "photo") {
            return {
              id: a.id,
              kind: a.kind,
              imageUri: a.imageUri,
              explanation: trimOrUndefined(a.explanation),
            };
          }

          // text
          return {
            id: a.id,
            kind: a.kind,
            text: a.text?.trim(),
            explanation: trimOrUndefined(a.explanation),
          };
        }),
      });
      alert("Başarılı", "Sorunuz Başarıyla Kaydedildi", { variant: "success" })
      resetForm();
      router.replace("/(tabs)/questions");
    } catch (e: any) {
      alert("Hata", e?.message ?? "Kaydedilemedi");
      console.error();
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- UI Pieces -------------------- */

  function SegTab({
    idx,
    label,
    icon,
  }: {
    idx: 0 | 1;
    label: string;
    icon: React.ReactNode;
  }) {
    const active = activeTab === idx;
    return (
      <Pressable
        onPress={() => gotoTab(idx)}
        style={{
          flex: 1,
          paddingVertical: 10,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          backgroundColor: active ? c.tabActiveBg : "transparent",
        }}
      >
        {icon}
        <Text style={{ color: active ? c.tabActive : c.tabInactive, fontWeight: "800" }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  function IconAction({
    onPress,
    icon,
    active,
  }: {
    onPress: () => void;
    icon: React.ReactNode;
    active?: boolean;
  }) {
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

  /* -------------------- RENDER -------------------- */
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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          {/* Header */}
          <View style={styles.headerPad}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  backgroundColor: c.tabActiveBg,
                  borderWidth: 1,
                  borderColor: c.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <PlusCircle size={20} color={c.accent} strokeWidth={2} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, fontWeight: "800", color: c.text }}>
                  Soru Ekle
                </Text>
                <Text style={{ marginTop: 2, color: c.mutedText, fontSize: 13 }}>
                  Soruyu ekle, çözümü ekle, dilediğinde tekrar et.
                </Text>
              </View>
            </View>

            {/* Segmented Tabs */}
            <View style={styles.pillWrap}>
              <SegTab
                idx={0}
                label="Soru"
                icon={<ImageIcon size={18} color={activeTab === 0 ? c.tabActive : c.tabInactive} />}
              />
              <SegTab
                idx={1}
                label="Cevap"
                icon={<CheckCircle2 size={18} color={activeTab === 1 ? c.tabActive : c.tabInactive} />}
              />
            </View>
          </View>

          {/* Pager */}
          <PagerView
            ref={pagerRef}
            style={{ flex: 1, marginTop: 10 }}
            initialPage={0}
            onPageSelected={(e) => setActiveTab(e.nativeEvent.position as 0 | 1)}
          >
            {/* -------------------- TAB 1: QUESTION -------------------- */}
            <ScrollView
              key="question"
              contentContainerStyle={{ padding: 16, paddingBottom: styles.pagePaddingBottom }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Actions (Gallery / Camera / Text) */}
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

              {/* Question box */}
              <View style={[styles.card, { padding: 12 }]}>
                {question.kind === "photo" ? (
                  question.imageUri ? (
                    <Image
                      source={{ uri: question.imageUri }}
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
                      <Text style={{ color: c.mutedText, fontWeight: "700" }}>
                        Soru fotoğrafını seç veya çek
                      </Text>
                    </View>
                  )
                ) : (
                  <TextInput
                    value={question.text}
                    onChangeText={(t) => setQuestion({ kind: "text", text: t })}
                    placeholder="Soruyu buraya yaz"
                    placeholderTextColor={c.mutedText}
                    multiline
                    style={[
                      styles.input,
                      {
                        minHeight: 160,
                        textAlignVertical: "top",
                        paddingTop: 12,
                      },
                    ]}
                  />
                )}
              </View>

              {/* Lesson / Topic */}
              <View style={{ marginTop: 12, gap: 10 }}>
                <TextInput
                  value={lesson}
                  onChangeText={setLesson}
                  placeholder="Ders adı"
                  placeholderTextColor={c.mutedText}
                  style={styles.input}
                />
                <TextInput
                  value={topic}
                  onChangeText={setTopic}
                  placeholder="Konu adı"
                  placeholderTextColor={c.mutedText}
                  style={styles.input}
                />
              </View>

              {/* Continue */}
              <Pressable onPress={() => gotoTab(1)} style={[styles.primaryBtn, { marginTop: 14 }]}>
                <Text style={styles.primaryBtnText}>Çözüme Geç</Text>
              </Pressable>
            </ScrollView>

            {/* -------------------- TAB 2: ANSWERS -------------------- */}
            <ScrollView
              key="answers"
              contentContainerStyle={{ padding: 16, paddingBottom: styles.pagePaddingBottom }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Answer cards */}
              {answers.map((a, index) => {
                const isChoice = a.kind === "choice";
                const isPhoto = a.kind === "photo";

                return (
                  <View key={a.id} style={[styles.card, { padding: 14, marginBottom: 12 }]}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: c.text, fontWeight: "900" }}>Çözüm {index + 1}</Text>
                      <Pressable onPress={() => removeAnswer(a.id)} hitSlop={10}>
                        <Trash2 size={18} color={"#FF5A6A"} />
                      </Pressable>
                    </View>

                    {/* Type switch (Choice/Photo) */}
                    {/* Type switch (Şıklı / Galeri / Metin) */}
                    <View
                      style={{
                        marginTop: 10,
                        padding: 6,
                        borderRadius: 25, // daha keskin rounded-2xl hissi
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
                    {isChoice && <ChoiceGrid a={a} />}

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
                          {a.imageUri ? (
                            <Image
                              source={{ uri: a.imageUri }}
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

                    {a.kind === "text" && (
                      <View style={{ marginTop: 12 }}>
                        <TextInput
                          value={a.text ?? ""}
                          onChangeText={(t) => updateAnswer(a.id, { text: t })}
                          placeholder="Çözümü metin olarak buraya yazabilirsin."
                          placeholderTextColor={c.mutedText}
                          maxLength={200}
                          multiline
                          style={[
                            styles.input,
                            { minHeight: 110, textAlignVertical: "top", paddingTop: 12 },
                          ]}
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
                      style={[
                        styles.input,
                        {
                          marginTop: 12,
                          minHeight: 90,
                          textAlignVertical: "top", // ANDROID için kritik
                          paddingTop: 14,
                        },
                      ]}
                    />
                  </View>
                );
              })}
              {answers.length === 1 &&
                <View className="my-4 px-2">
                  <Text style={{ color: c.mutedText, }}>
                    Birden fazla çözüm eklemek istiyorsan buradan ekleyebilirsin. Maximum 3 adet çözüm ekleyebilirsin.
                  </Text>
                </View>}

              {/* Add answer */}
              <Pressable onPress={addAnswer} style={[styles.secondaryBtn, { marginBottom: 12 }]}>
                <CheckCircle2Icon size={20} color={c.accent} />
                <Text style={{ color: c.text, fontWeight: "700" }}>Çözüm Ekle</Text>
              </Pressable>




              {/* Save */}
              <Pressable
                onPress={onSave}
                disabled={saveDisabled}
                style={[
                  styles.primaryBtn,
                  { opacity: saveDisabled ? 0.45 : 1 },
                ]}
              >
                {loading ? <ActivityIndicator /> : <Text style={styles.primaryBtnText}>Kaydet</Text>}
              </Pressable>
              {/* Draft reason (why disabled)
              {!!draftSaveError && (

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 12,
                    marginBottom: 12,
                    padding: 10,
                    borderRadius: 18,
                    backgroundColor: c.inputBg,
                    borderWidth: 1,
                    borderColor: "#FF5A6A33",
                  }}
                >

                  <BanIcon size={16} color="#FF5A6A" />
                  <Text style={{ color: "#FF5A6A", flex: 1, fontWeight: "600" }}>
                    {draftSaveError}
                  </Text>
                </View>
              )} */}

              {/* new */}

              {saveDisabled && (
                <View
                  style={{
                    marginTop: 14,
                    marginBottom: 14,
                    padding: 14,
                    borderRadius: 18,
                    backgroundColor: c.inputBg,
                    borderWidth: 1,
                    borderColor: c.border,
                  }}
                >
                  {/* Header */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <Text style={{ color: c.text, fontWeight: "900" }}>
                      Kaydetmek için gerekli
                    </Text>

                    <Text style={{ color: c.mutedText, fontWeight: "800" }}>
                      {requirements.filter(r => r.ok).length}/{requirements.length}
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 6,
                      borderRadius: 999,
                      backgroundColor: c.border,
                      marginBottom: 12,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        width: `${(requirements.filter(r => r.ok).length / requirements.length) * 100}%`,
                        height: "100%",
                        backgroundColor: "#22C55E",
                      }}
                    />
                  </View>
                  {/* Items */}
                  {requirements.map((r) => {
                    const isOk = r.ok;

                    return (
                      <View
                        key={r.key}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          paddingVertical: 6,
                        }}
                      >
                        {isOk ? (
                          <CheckCircle2 size={18} color="#22C55E" />
                        ) : (
                          <BanIcon size={18} color="#FF5A6A" />
                        )}

                        <Text
                          style={{
                            flex: 1,
                            fontWeight: "600",
                            color: isOk ? "#22C55E" : c.mutedText,
                          }}
                        >
                          {r.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

            </ScrollView>
          </PagerView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}