
import type { Question } from "@/src/types/question";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, Text, View } from "react-native";

import { db } from "@/src/lib/firebase";
import { deleteQuestionWithImage } from "@/src/services/question.service"; // <-- yolunu kendi yapına göre düzelt

export default function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        const snap = await getDoc(doc(db, "questions", id));
        if (snap.exists()) setItem(snap.data() as Question);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const onDeletePress = () => {
    if (!id || !item) return;

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
              await deleteQuestionWithImage({
                questionId: id,
                imageUrl: item.imageUrl, // varsa silinsin
              });
              router.back(); // listeye dön
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

        <Pressable
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-white px-4 py-3"
        >
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

      <Image
        source={{ uri: item.imageUrl }}
        className="w-full h-80 rounded-2xl mb-4"
        resizeMode="cover"
      />

      <View className="rounded-2xl bg-white/10 border border-white/10 p-4">
        <Text className="text-white text-lg font-semibold">{item.lesson}</Text>
        <Text className="text-white/70 mt-1">{item.topic}</Text>
      </View>
    </View>
  );
}