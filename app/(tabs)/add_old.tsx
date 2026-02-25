// app/(tabs)/add.tsx

import { auth } from "@/src/lib/firebase";
import { addQuestionV3 } from "@/src/services/question.service";

import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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

import { useTheme } from "@/src/context/ThemeContext";
import {
    Camera,
    CheckCircle2,
    Image as ImageIcon,
    Plus,
    Trash2,
    Type as TypeIcon,
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

  const [lesson, setLesson] = useState("");
  const [topic, setTopic] = useState("");

  // ✅ Cevaplar: min 1 max 3
  const [answers, setAnswers] = useState<DraftAnswer[]>([
    { id: Date.now().toString(), kind: "choice" }, // başlangıçta 1 tane hazır
  ]);

  const [loading, setLoading] = useState(false);

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
      Alert.alert("İzin gerekli", "Kamera izni olmadan fotoğraf çekemezsin.");
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
      Alert.alert("İzin gerekli", "Kamera izni olmadan fotoğraf çekemezsin.");
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
      Alert.alert("Limit", "En fazla 3 çözüm ekleyebilirsin.");
      return;
    }
    setAnswers((prev) => [...prev, { id: Date.now().toString(), kind: "choice" }]);
  };

  const removeAnswer = (id: string) => {
    if (answers.length <= 1) {
      Alert.alert("Zorunlu", "En az 1 çözüm eklemelisin.");
      return;
    }
    setAnswers((prev) => prev.filter((a) => a.id !== id));
  };

  const updateAnswer = (id: string, data: Partial<DraftAnswer>) => {
    setAnswers((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
  };

  const switchAnswerKind = (id: string, kind: "choice" | "photo") => {
    setAnswers((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;

        if (kind === "choice") {
          return { id, kind: "choice", choice: undefined, explanation: a.explanation };
        }
        return { id, kind: "photo", imageUri: undefined, explanation: a.explanation };
      })
    );
  };

  /* -------------------- SAVE -------------------- */

  const onSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    // soru
    if (question.kind === "photo") {
      if (!question.imageUri) {
        return Alert.alert("Eksik", "Soru için fotoğraf seç/çek ya da Tt ile metin gir.");
      }
    } else {
      if (!question.text.trim()) return Alert.alert("Eksik", "Soru metni boş olamaz.");
    }

    // ders/konu
    if (!lesson.trim()) return Alert.alert("Eksik", "Ders boş olamaz.");
    if (!topic.trim()) return Alert.alert("Eksik", "Konu boş olamaz.");

    // cevap
    if (answers.length < 1) return Alert.alert("Eksik", "En az 1 çözüm eklemelisin.");
    if (answers.length > 3) return Alert.alert("Limit", "En fazla 3 çözüm ekleyebilirsin.");

    for (const a of answers) {
      if (a.kind === "choice" && !a.choice) return Alert.alert("Eksik", "Şık seçilmemiş çözüm var.");
      if (a.kind === "photo" && !a.imageUri) return Alert.alert("Eksik", "Fotoğraf seçilmemiş çözüm var.");
    }

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
        answers: answers.map((a) => ({
          id: a.id,
          kind: a.kind,
          choice: a.kind === "choice" ? a.choice : undefined,
          imageUri: a.kind === "photo" ? a.imageUri : undefined,
          // ✅ boşsa undefined (serviste zaten yazmıyoruz ama double safety)
          explanation: trimOrUndefined(a.explanation),
        })),
      });

      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Hata", e?.message ?? "Kaydedilemedi");
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
            <Text style={{ color: c.text, fontSize: 22, fontWeight: "900" }}>Soru Ekle</Text>
            <Text style={{ color: c.mutedText, marginTop: 4 }}>
              Soruyu ekle, çözümü ekle, arşivle.
            </Text>

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
                  placeholder="Ders"
                  placeholderTextColor={c.mutedText}
                  style={styles.input}
                />
                <TextInput
                  value={topic}
                  onChangeText={setTopic}
                  placeholder="Konu"
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
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                      <Pressable
                        onPress={() => switchAnswerKind(a.id, "choice")}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 14,
                          alignItems: "center",
                          borderWidth: 1,
                          borderColor: isChoice ? "transparent" : c.border,
                          backgroundColor: isChoice ? c.tabActiveBg : c.card,
                        }}
                      >
                        <Text style={{ color: isChoice ? c.tabActive : c.mutedText, fontWeight: "900" }}>
                          Çoktan Seçmeli
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => switchAnswerKind(a.id, "photo")}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 14,
                          alignItems: "center",
                          borderWidth: 1,
                          borderColor: isPhoto ? "transparent" : c.border,
                          backgroundColor: isPhoto ? c.tabActiveBg : c.card,
                        }}
                      >
                        <Text style={{ color: isPhoto ? c.tabActive : c.mutedText, fontWeight: "900" }}>
                          Görsel
                        </Text>

                      </Pressable>
                    </View>

                    {/* Choice */}
                    {isChoice && <ChoiceGrid a={a} />}

                    {/* Photo */}
                    {isPhoto && (
                      <View style={{ marginTop: 12 }}>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <Pressable
                            onPress={() => pickAnswerPhoto(a.id)}
                            style={{
                              flex: 1,
                              borderRadius: 16,
                              paddingVertical: 12,
                              alignItems: "center",
                              borderWidth: 1,
                              borderColor: c.border,
                              backgroundColor: c.inputBg,
                            }}
                          >
                            <Text style={{ color: c.text, fontWeight: "900" }}>Galeri</Text>
                          </Pressable>

                          <Pressable
                            onPress={() => takeAnswerPhoto(a.id)}
                            style={{
                              flex: 1,
                              borderRadius: 16,
                              paddingVertical: 12,
                              alignItems: "center",
                              borderWidth: 1,
                              borderColor: c.border,
                              backgroundColor: c.inputBg,
                            }}
                          >
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
                          {"imageUri" in a && a.imageUri ? (
                            <Image
                              source={{ uri: a.imageUri }}
                              style={{ width: "100%", height: "100%" }}
                              resizeMode="cover"
                            />
                          ) : (
                            <Text style={{ color: c.mutedText, fontWeight: "700" }}>
                              Çözüm fotoğrafı ekle
                            </Text>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Explanation */}
                    <TextInput
                      value={a.explanation ?? ""}
                      onChangeText={(t) => updateAnswer(a.id, { explanation: t })}
                      placeholder="Püf noktaları / not (opsiyonel)"
                      placeholderTextColor={c.mutedText}
                      style={[styles.input, { marginTop: 12 }]}
                    />
                  </View>
                );
              })}

              {/* Add answer */}
              <Pressable onPress={addAnswer} style={[styles.secondaryBtn, { marginBottom: 12 }]}>
                <Plus size={18} color={c.accent} />
                <Text style={{ color: c.text, fontWeight: "900" }}>Çözüm Ekle</Text>
              </Pressable>

              {/* Save */}
              <Pressable onPress={onSave} disabled={loading} style={[styles.primaryBtn, { opacity: loading ? 0.7 : 1 }]}>
                {loading ? <ActivityIndicator /> : <Text style={styles.primaryBtnText}>Kaydet</Text>}
              </Pressable>
            </ScrollView>
          </PagerView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}