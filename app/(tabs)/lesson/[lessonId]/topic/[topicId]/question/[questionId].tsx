
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { auth, db } from "@/src/lib/firebase";
import { deleteQuestionCascade } from "@/src/services/question.service";

// ✅ Zoom/Pan için
import { Dimensions } from "react-native";
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

/** Firestore Timestamp -> Date format */
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
  // Modal içi image boyutu
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
      onShow={() => {
        resetTransform();
      }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className="flex-1 bg-black/95 justify-center items-center px-5">
          <View className="w-full items-end mb-4">
            <Pressable
              onPress={onClose}
              className="rounded-xl bg-white/10 px-4 py-2 border border-white/10"
            >
              <Text className="text-white font-semibold">Kapat</Text>
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
                },
                previewStyle,
              ]}
              resizeMode="contain"
            />
          </GestureDetector>

          <Text className="text-white/50 text-xs mt-3">
            Pinch: yakınlaştır • Sürükle: kaydır • Çift dokun: sıfırla
          </Text>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

/** ---- Yeni cevap modeli (UI için) ---- */
type Answer =
  | {
      id: string;
      kind: "choice";
      choice?: "A" | "B" | "C" | "D" | "E";
      explanation?: string;
    }
  | {
      id: string;
      kind: "photo";
      image?: { url: string; path: string };
      explanation?: string;
    };

/** ---- Yeni question doc şekli ---- */
type QuestionV3 = {
  id?: string;
  userId: string;
  lessonId: string;
  topicId: string;
  questionImage: { url: string; path: string };
  answers: Answer[];
  createdAt?: any;
  updatedAt?: any;
};

export default function QuestionDetailScreen() {
  const { lessonId, topicId, questionId } = useLocalSearchParams<{
    lessonId: string;
    topicId: string;
    questionId: string;
  }>();

  const [item, setItem] = useState<QuestionV3 | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const [lessonName, setLessonName] = useState("Ders");
  const [topicName, setTopicName] = useState("Konu");

  // ✅ Zoom viewer state (soru + cevap foto için ortak)
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  // ✅ Cevap toggle (default kapalı)
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user || !lessonId || !topicId || !questionId) return;

        // question
        const qSnap = await getDoc(
          doc(
            db,
            "users",
            user.uid,
            "lessons",
            lessonId,
            "topics",
            topicId,
            "questions",
            questionId
          )
        );
        if (qSnap.exists()) setItem(qSnap.data() as QuestionV3);

        // header names
        const [lSnap, tSnap] = await Promise.all([
          getDoc(doc(db, "users", user.uid, "lessons", lessonId)),
          getDoc(
            doc(db, "users", user.uid, "lessons", lessonId, "topics", topicId)
          ),
        ]);
        if (lSnap.exists()) setLessonName((lSnap.data() as any)?.name ?? "Ders");
        if (tSnap.exists()) setTopicName((tSnap.data() as any)?.name ?? "Konu");
      } finally {
        setLoading(false);
      }
    })();
  }, [lessonId, topicId, questionId]);

  const onDeletePress = () => {
    const user = auth.currentUser;
    if (!user || !lessonId || !topicId || !questionId) return;

    Alert.alert(
      "Soruyu sil?",
      "Bu işlem geri alınamaz. Soru ve ilgili görseller silinecek.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteQuestionCascade({
                userId: user.uid,
                lessonId,
                topicId,
                questionId,
              });
              router.back();
            } catch (e) {
              console.log("Silme hatası:", e);
              Alert.alert("Hata", "Silinirken bir problem oluştu.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const createdAtText = useMemo(
    () => formatCreatedAt(item?.createdAt),
    [item?.createdAt]
  );

  const answers = useMemo(() => item?.answers ?? [], [item?.answers]);

  const openViewer = (uri: string) => {
    setViewerUri(uri);
    setViewerOpen(true);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator />
      </View>
    );
  }

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center bg-black p-6">
        <Text className="text-white/70">Soru bulunamadı.</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-white px-4 py-3"
        >
          <Text className="font-semibold">Geri</Text>
        </Pressable>
      </View>
    );
  }

  const questionUri = item.questionImage?.url;

  return (
    <View className="flex-1 bg-black">
      {/* ✅ Header: sol geri, ortada konu adı, sağ sil */}
      <View className="pt-14 px-6 pb-4 flex-row items-center">
        <Pressable
          onPress={() => router.back()}
          className="rounded-xl bg-white/10 px-4 py-2 border border-white/10"
        >
          <Text className="text-white">Geri</Text>
        </Pressable>

        <View className="flex-1 items-center px-3">
          <Text className="text-xl font-bold text-white" numberOfLines={1}>
            {topicName}
          </Text>
          <Text className="text-white/50 text-xs mt-1" numberOfLines={1}>
            {lessonName} • {createdAtText}
          </Text>
        </View>

        <Pressable
          onPress={onDeletePress}
          disabled={deleting}
          className={`rounded-xl border px-4 py-2 ${
            deleting
              ? "bg-red-500/30 border-red-500/30"
              : "bg-red-500/20 border-red-500/30"
          }`}
        >
          <Text className="text-red-200 font-semibold">
            {deleting ? "Siliniyor..." : "Sil"}
          </Text>
        </Pressable>
      </View>

      {/* İçerik scroll */}
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 28 }}>
        {/* ✅ Soru görseli (dokununca full-screen viewer) */}
        <View className="px-6">
          <Pressable
            onPress={() => questionUri && openViewer(questionUri)}
            className="rounded-2xl overflow-hidden border border-white/10"
          >
            <Image
              source={{ uri: questionUri }}
              className="w-full h-96 bg-white/5"
              resizeMode="cover"
            />
          </Pressable>

          <Text className="text-white/40 text-xs mt-2">
            Tam ekran için görsele dokun • Pinch/Drag/DoubleTap destekli
          </Text>

          {/* ✅ Cevap toggle butonu */}
          <Pressable
            onPress={() => setShowAnswers((s) => !s)}
            className="mt-4 rounded-xl bg-white px-4 py-3 items-center"
          >
            <Text className="font-semibold">
              {showAnswers ? "Cevapları Gizle" : "Cevapları Göster"}
            </Text>
          </Pressable>

          {/* ✅ Cevaplar */}
          {showAnswers && (
            <View className="mt-4 gap-3">
              {answers.map((a, idx) => (
                <View
                  key={a.id ?? String(idx)}
                  className="rounded-2xl bg-white/10 border border-white/10 p-4"
                >
                  <Text className="text-white font-semibold">
                    Çözüm {idx + 1}
                  </Text>

                  {/* Choice cevap */}
                  {a.kind === "choice" ? (
                    <View className="mt-3 self-start px-3 py-2 rounded-lg bg-white">
                      <Text className="text-black font-bold">
                        Doğru Şık: {a.choice ?? "-"}
                      </Text>
                    </View>
                  ) : null}

                  {/* Photo cevap */}
                  {a.kind === "photo" ? (
                    <View className="mt-3">
                      {a.image?.url ? (
                        <Pressable
                          onPress={() => openViewer(a.image!.url)}
                          className="rounded-xl overflow-hidden border border-white/10"
                        >
                          <Image
                            source={{ uri: a.image.url }}
                            className="w-full h-56 bg-white/5"
                            resizeMode="cover"
                          />
                        </Pressable>
                      ) : (
                        <Text className="text-white/60 mt-2">
                          Fotoğraf yok
                        </Text>
                      )}
                      <Text className="text-white/40 text-xs mt-2">
                        Cevap fotoğrafını da tam ekran açabilirsin.
                      </Text>
                    </View>
                  ) : null}

                  {/* explanation opsiyonel */}
                  {a.explanation?.trim() ? (
                    <Text className="text-white/80 mt-3 leading-5">
                      {a.explanation}
                    </Text>
                  ) : null}
                </View>
              ))}

              {answers.length === 0 && (
                <View className="rounded-2xl bg-white/10 border border-white/10 p-4">
                  <Text className="text-white/70">
                    Cevap bulunamadı. (Normalde en az 1 olmalı.)
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ✅ Bilgi kutusu */}
          <View className="mt-4 rounded-2xl bg-white/10 border border-white/10 p-4">
            <Text className="text-white text-base font-semibold">Bilgi</Text>
            <Text className="text-white/70 mt-2">Eklenme: {createdAtText}</Text>
            <Text className="text-white/50 mt-1 text-xs">
              Cevaplar varsayılan gizli. Butonla aç/kapat.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ✅ Fullscreen viewer (soru + cevap foto ortak) */}
      <FullscreenZoomImage
        uri={viewerUri ?? questionUri}
        visible={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </View>
  );
}