// app/(tabs)/lesson/[lessonId]/topic/[topicId].tsx
import { auth, db } from "@/src/lib/firebase";
import { getTopicQuestions } from "@/src/services/question.service";
import type { Question } from "@/src/types/question";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Pressable, Text, View } from "react-native";

function QuestionRow({ item, onPress }: { item: Question; onPress: () => void }) {
  const img = item.questionImage?.url ?? item.imageUrl;

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-2xl bg-white/10 border border-white/10 overflow-hidden"
    >
      <Image
        source={{ uri: img }}
        className="w-full h-44 bg-white/5"
        resizeMode="cover"
      />
      <View className="p-4">
        <Text className="text-white/70 text-sm">Soru</Text>
        <Text className="text-white text-sm mt-1">Detay için dokun</Text>
      </View>
    </Pressable>
  );
}

export default function TopicQuestionsScreen() {
  const { lessonId, topicId } = useLocalSearchParams<{ lessonId: string; topicId: string }>();

  const [items, setItems] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [lessonName, setLessonName] = useState<string>("Ders");
  const [topicName, setTopicName] = useState<string>("Konu");

  // ✅ Header için ders + konu adını çek
  useEffect(() => {
    (async () => {
      const user = auth.currentUser;
      if (!user || !lessonId || !topicId) return;

      try {
        const [lSnap, tSnap] = await Promise.all([
          getDoc(doc(db, "users", user.uid, "lessons", lessonId)),
          getDoc(doc(db, "users", user.uid, "lessons", lessonId, "topics", topicId)),
        ]);

        if (lSnap.exists()) setLessonName((lSnap.data() as any)?.name ?? "Ders");
        if (tSnap.exists()) setTopicName((tSnap.data() as any)?.name ?? "Konu");
      } catch (e) {
        console.log("Header name fetch error:", e);
      }
    })();
  }, [lessonId, topicId]);

  const fetchData = async () => {
    const user = auth.currentUser;
    setLoading(true);

    try {
      if (!user || !lessonId || !topicId) {
        setItems([]);
        return;
      }

      const data = await getTopicQuestions({ userId: user.uid, lessonId, topicId });
      setItems(data);
    } catch (e: any) {
      console.log("Topic questions HATA =", e);
      Alert.alert("Liste Hatası", e?.message ?? "Bilinmeyen hata");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [lessonId, topicId])
  );

  return (
    <View className="flex-1 bg-black">
      {/* ✅ Sol üst geri + dinamik başlık */}
      <View className="pt-14 px-6 pb-4 flex-row items-center">
        <Pressable
          onPress={() => router.back()}
          className="rounded-xl bg-white/10 px-4 py-2 border border-white/10"
        >
          <Text className="text-white">Geri</Text>
        </Pressable>

        <View className="flex-1 items-center">
          <Text className="text-xl font-bold text-white" numberOfLines={1}>
            {topicName}
          </Text>
          <Text className="text-white/50 text-xs mt-1" numberOfLines={1}>
            {lessonName} • Sorular
          </Text>
        </View>

        <View style={{ width: 72 }} />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-white/70 text-center">Bu konuda henüz soru yok.</Text>
          <Text className="text-white/40 text-center mt-2">
            Yeni soru eklediğinde burada görünecek.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <QuestionRow
              item={item}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/lesson/[lessonId]/topic/[topicId]/question/[questionId]",
                  params: { lessonId, topicId, questionId: item.id },
                })
              }
            />
          )}
        />
      )}
    </View>
  );
}