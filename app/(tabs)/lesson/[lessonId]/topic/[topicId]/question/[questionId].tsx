import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { auth, db } from "@/src/lib/firebase";
import { deleteQuestionCascade } from "@/src/services/question.service";

// sende bu var
import { useTheme } from "@/src/context/ThemeContext"; // sende bu var

import { ChevronDown, ChevronLeft, ChevronUp, Trash2 } from "lucide-react-native";

import { useAppAlert } from "@/src/components/common/AppAlertProvider";
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

/** Timestamp -> readable */
function formatCreatedAt(createdAt: any) {
  try {
    const d: Date | null =
      createdAt?.toDate?.() ??
      (createdAt?.seconds ? new Date(createdAt.seconds * 1000) : null);

    if (!d) return "Tarih yok";
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "Tarih yok";
  }
}

/** Fullscreen zoomable image */
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

/** ---- Types (new + legacy compatible) ---- */
type Answer =
  | { id: string; kind: "choice"; choice?: "A" | "B" | "C" | "D" | "E"; explanation?: string }
  | { id: string; kind: "photo"; image?: { url: string; path: string }; explanation?: string };

type QuestionDoc = {
  id?: string;
  userId: string;
  lessonId: string;
  topicId: string;

  // ✅ NEW (after your change)
  question?:
  | { kind: "photo"; image: { url: string; path: string } }
  | { kind: "text"; text: string };

  // ✅ LEGACY V3 (old)
  questionImage?: { url: string; path: string };

  // ✅ LEGACY V2
  imageUrl?: string;
  imagePath?: string;

  answers?: Answer[];

  createdAt?: any;
  updatedAt?: any;
};

function getQuestionImageUrl(q: QuestionDoc | null) {
  const fromNew =
    q?.question?.kind === "photo" ? q.question.image?.url : undefined;
  const fromLegacyV3 = q?.questionImage?.url;
  const fromLegacyV2 = q?.imageUrl;
  return fromNew || fromLegacyV3 || fromLegacyV2 || null;
}

function getQuestionText(q: QuestionDoc | null) {
  if (q?.question?.kind === "text") return q.question.text;
  return "";
}

export default function QuestionDetailScreen() {
  const { lessonId, topicId, questionId } = useLocalSearchParams<{
    lessonId: string;
    topicId: string;
    questionId: string;
  }>();

  const { theme } = useTheme();
  const c = theme.colors;

  const { alert, confirm } = useAppAlert();

  const [item, setItem] = useState<QuestionDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const [lessonName, setLessonName] = useState("Ders");
  const [topicName, setTopicName] = useState("Konu");

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUri, setViewerUri] = useState<string>("");

  const [showAnswers, setShowAnswers] = useState(false);

  // accordion anim
  const aHeight = useSharedValue(0);
  const aOpacity = useSharedValue(0);

  const answersAnimStyle = useAnimatedStyle(() => ({
    height: aHeight.value,
    opacity: aOpacity.value,
  }));

  const toggleAnswers = () => {
    const next = !showAnswers;
    setShowAnswers(next);

    // içerik fazla olursa bile yeterli kalsın diye büyük bir değer
    const OPEN_H = 1200;

    aHeight.value = withTiming(next ? OPEN_H : 0, { duration: 220 });
    aOpacity.value = withTiming(next ? 1 : 0, { duration: 180 });
  };

  const createdAtText = useMemo(() => formatCreatedAt(item?.createdAt), [item?.createdAt]);
  const answers = useMemo(() => item?.answers ?? [], [item?.answers]);

  const questionUri = useMemo(() => getQuestionImageUrl(item), [item]);
  const questionText = useMemo(() => getQuestionText(item), [item]);

  const openViewer = (uri: string) => {
    setViewerUri(uri);
    setViewerOpen(true);
  };

  const handleBack = () => {
    router.replace({
      pathname: "/(tabs)/lesson/[lessonId]/topic/[topicId]",
      params: { lessonId, topicId },
    });
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [lessonId, topicId]);
  useEffect(() => {
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user || !lessonId || !topicId || !questionId) return;

        const qRef = doc(
          db,
          "users",
          user.uid,
          "lessons",
          lessonId,
          "topics",
          topicId,
          "questions",
          questionId
        );

        const qSnap = await getDoc(qRef);
        if (qSnap.exists()) {
          setItem({ id: qSnap.id, ...(qSnap.data() as any) } as QuestionDoc);
        } else {
          setItem(null);
        }

        const [lSnap, tSnap] = await Promise.all([
          getDoc(doc(db, "users", user.uid, "lessons", lessonId)),
          getDoc(doc(db, "users", user.uid, "lessons", lessonId, "topics", topicId)),
        ]);

        if (lSnap.exists()) setLessonName((lSnap.data() as any)?.name ?? "Ders");
        if (tSnap.exists()) setTopicName((tSnap.data() as any)?.name ?? "Konu");
      } catch (e: any) {
        console.log("Question detail fetch error:", e);
        alert("Hata", e?.message ?? "Soru yüklenemedi", { variant: "danger" });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, topicId, questionId]);

  const doDelete = async () => {
    const user = auth.currentUser;
    if (!user || !lessonId || !topicId || !questionId) return;

    try {
      setDeleting(true);
      await deleteQuestionCascade({ userId: user.uid, lessonId, topicId, questionId });
      handleBack();
    } catch (e: any) {
      console.log("Silme hatası:", e);
      alert("Hata", e?.message ?? "Silinirken bir problem oluştu.", { variant: "danger" });
    } finally {
      setDeleting(false);
    }
  };

  const onDeletePress = () => {
    confirm({
      title: "Soruyu sil?",
      message: "Bu işlem geri alınamaz. Soru ve ilgili görseller silinecek.",
      destructive: true,
      confirmText: "Sil",
      cancelText: "Vazgeç",
      onConfirm: doDelete,
    });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!item) {
    return (
      <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 18 }}>
          <Text style={{ color: c.mutedText, fontWeight: "700" }}>Soru bulunamadı.</Text>

          <Pressable
            onPress={handleBack}
            style={{
              marginTop: 12,
              borderRadius: 14,
              backgroundColor: c.accent,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>Geri</Text>
          </Pressable>
        </View>
      </ImageBackground>
    );
  }

  if (loading) {
    return (
      <View  style={{ flex: 1, backgroundColor: c.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  return (
    <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ paddingTop: 52, paddingHorizontal: 18, paddingBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable
            onPress={handleBack}
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
            <ChevronLeft size={22} color={c.text} />
          </Pressable>

          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ color: c.text, fontSize: 18, fontWeight: "900" }} numberOfLines={1}>
              {topicName}
            </Text>
            <Text style={{ color: c.mutedText, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
              {lessonName} • {createdAtText}
            </Text>
          </View>

          <Pressable
            onPress={onDeletePress}
            disabled={deleting}
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              backgroundColor: "rgba(239,68,68,0.14)",
              borderWidth: 1,
              borderColor: "rgba(239,68,68,0.28)",
              alignItems: "center",
              justifyContent: "center",
              opacity: deleting ? 0.7 : 1,
            }}
          >
            <Trash2 size={18} color={"rgba(239,68,68,0.95)"} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 120 }}>
        {/* Question (photo or text) */}
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
            <Pressable onPress={() => openViewer(questionUri!)}>
              <Image
                source={{ uri: questionUri }}
                style={{ width: "100%", height: 420, backgroundColor: c.inputBg }}
                resizeMode="cover"
              />
            </Pressable>
          ) : (
            <View
              style={{
                padding: 16,
                minHeight: 220,
                justifyContent: "center",
                backgroundColor: c.card,
              }}
            >
              <Text style={{ color: c.mutedText, fontSize: 12, fontWeight: "800" }}>
                Bu soru metin olarak kaydedilmiş
              </Text>
              {!!questionText && (
                <Text style={{ color: c.text, marginTop: 10, lineHeight: 20, fontWeight: "700" }}>
                  {questionText}
                </Text>
              )}
            </View>
          )}
        </View>

        <Text style={{ color: c.mutedText, fontSize: 12, marginTop: 8 }}>
          {questionUri ? "Tam ekran için dokun • Pinch/Drag/DoubleTap destekli" : ""}
        </Text>

        {/* Answers toggle */}
        <Pressable
          onPress={toggleAnswers}
          style={{
            marginTop: 14,
            borderRadius: 16,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.borderStrong,
            paddingVertical: 12,
            paddingHorizontal: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ color: c.text, fontWeight: "900" }}>
            {showAnswers ? "Cevapları Gizle" : "Cevapları Göster"}
          </Text>
          {showAnswers ? (
            <ChevronUp size={18} color={c.mutedText} />
          ) : (
            <ChevronDown size={18} color={c.mutedText} />
          )}
        </Pressable>

        {/* Answers list */}
        <Animated.View style={[{ overflow: "hidden" }, answersAnimStyle]}>
          <View style={{ marginTop: 12, gap: 12 }}>
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
                <Text style={{ color: c.text, fontWeight: "900" }}>Çözüm {idx + 1}</Text>

                {a.kind === "choice" ? (
                  <View
                    style={{
                      marginTop: 10,
                      alignSelf: "flex-start",
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 12,
                      backgroundColor: c.tabActiveBg,
                      borderWidth: 1,
                      borderColor: c.border,
                    }}
                  >
                    <Text style={{ color: c.accent, fontWeight: "900" }}>
                      Doğru Şık: {a.choice ?? "-"}
                    </Text>
                  </View>
                ) : null}

                {a.kind === "photo" ? (
                  <View style={{ marginTop: 10 }}>
                    {a.image?.url ? (
                      <Pressable
                        onPress={() => openViewer(a.image!.url)}
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
                      <Text style={{ color: c.mutedText, marginTop: 6 }}>Fotoğraf yok</Text>
                    )}
                  </View>
                ) : null}

                {a.explanation?.trim() ? (
                  <Text style={{ color: c.text, marginTop: 10, lineHeight: 20 }}>
                    {a.explanation}
                  </Text>
                ) : null}
              </View>
            ))}

            {answers.length === 0 ? (
              <View
                style={{
                  borderRadius: 18,
                  backgroundColor: c.card,
                  borderWidth: 1,
                  borderColor: c.borderStrong,
                  padding: 14,
                }}
              >
                <Text style={{ color: c.mutedText }}>Cevap bulunamadı.</Text>
              </View>
            ) : null}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Viewer */}
      <FullscreenZoomImage
        uri={viewerUri}
        visible={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </ImageBackground>
  );
}