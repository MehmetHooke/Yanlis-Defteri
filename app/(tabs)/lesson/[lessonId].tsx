// app/(tabs)/lesson/[lessonId].tsx
import { auth, db } from "@/src/lib/firebase";
import { getLessonTopics } from "@/src/services/question.service";
import type { Topic } from "@/src/types/topic";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from "react-native";

function TopicCard({ item, onPress }: { item: Topic; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-2xl bg-white/10 border border-white/10 p-4"
    >
      <Text className="text-white text-lg font-semibold">{item.name}</Text>

      <View className="mt-2 flex-row gap-2">
        <View className="rounded-full bg-white/10 border border-white/10 px-3 py-1">
          <Text className="text-white/70 text-xs">{item.questionCount ?? 0} soru</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function LessonTopicsScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const [items, setItems] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  const [lessonName, setLessonName] = useState<string>("Ders");

  // ✅ Ders adını çek (header için)
  useEffect(() => {
    (async () => {
      const user = auth.currentUser;
      if (!user || !lessonId) return;

      try {
        const snap = await getDoc(doc(db, "users", user.uid, "lessons", lessonId));
        if (snap.exists()) {
          const data = snap.data() as any;
          setLessonName(data?.name ?? "Ders");
        }
      } catch (e) {
        console.log("Lesson name fetch error:", e);
      }
    })();
  }, [lessonId]);

  const fetchData = async () => {
    const user = auth.currentUser;
    setLoading(true);

    try {
      if (!user || !lessonId) {
        setItems([]);
        return;
      }

      const data = await getLessonTopics(user.uid, lessonId);
      setItems(data);
    } catch (e: any) {
      console.log("Lesson topics HATA =", e);
      Alert.alert("Liste Hatası", e?.message ?? "Bilinmeyen hata");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [lessonId])
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
            {lessonName}
          </Text>
          <Text className="text-white/50 text-xs mt-1">Konular</Text>
        </View>

        {/* sağ tarafta boşluk (başlık ortalansın diye) */}
        <View style={{ width: 72 }} />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-white/70 text-center">Bu derste henüz konu yok.</Text>
          <Text className="text-white/40 text-center mt-2">
            Yeni soru eklediğinde konu otomatik oluşacak.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <TopicCard
              item={item}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/lesson/[lessonId]/topic/[topicId]",
                  params: { lessonId, topicId: item.id },
                })
              }
            />
          )}
        />
      )}
    </View>
  );
}