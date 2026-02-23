// app/(tabs)/lesson/[lessonId]/topic/[topicId]/question/[questionId].tsx
import type { Question } from "@/src/types/question";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, Text, View } from "react-native";

import { auth, db } from "@/src/lib/firebase";
import { deleteQuestionCascade } from "@/src/services/question.service";

export default function QuestionDetailScreen() {
  const { lessonId, topicId, questionId } = useLocalSearchParams<{
    lessonId: string;
    topicId: string;
    questionId: string;
  }>();

  const [item, setItem] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user || !lessonId || !topicId || !questionId) return;

        const snap = await getDoc(
          doc(db, "users", user.uid, "lessons", lessonId, "topics", topicId, "questions", questionId)
        );

        if (snap.exists()) setItem(snap.data() as Question);
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
      "Bu işlem geri alınamaz. Soru ve görseli (varsa) silinecek.",
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
        <Pressable onPress={() => router.back()} className="mt-4 rounded-xl bg-white px-4 py-3">
          <Text className="font-semibold">Geri</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black p-6 pt-14">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-2xl font-bold text-white">Detay</Text>

        <Pressable
          onPress={onDeletePress}
          disabled={deleting}
          className={`px-3 py-2 rounded-xl border ${
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

      <Image source={{ uri: item.imageUrl }} className="w-full h-80 rounded-2xl mb-4" resizeMode="cover" />

      <View className="rounded-2xl bg-white/10 border border-white/10 p-4">
        <Text className="text-white text-lg font-semibold">Soru</Text>
        <Text className="text-white/70 mt-1">
          Bu soru bu konu altında kayıtlı.
        </Text>
      </View>
    </View>
  );
}