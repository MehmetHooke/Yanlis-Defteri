 // app/(tabs)/lesson/[lessonId]/topic/[topicId].tsx
import { auth } from "@/src/lib/firebase";
import { getTopicQuestions } from "@/src/services/question.service";
import type { Question } from "@/src/types/question";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Pressable, Text, View } from "react-native";

function QuestionRow({
  item,
  onPress,
}: {
  item: Question;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-2xl bg-white/10 border border-white/10 overflow-hidden"
    >
      <Image source={{ uri: item.imageUrl }} className="w-full h-44" resizeMode="cover" />
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

  const fetchData = async () => {
    const user = auth.currentUser;
    setLoading(true);

    try {
      if (!user || !lessonId || !topicId) {
        setItems([]);
        return;
      }

      const data = await getTopicQuestions({
        userId: user.uid,
        lessonId,
        topicId,
      });

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
      <View className="pt-14 px-6 pb-4 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-white">Sorular</Text>

        <Pressable
          onPress={() => router.back()}
          className="rounded-xl bg-white/10 px-4 py-2 border border-white/10"
        >
          <Text className="text-white">Geri</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-white/70 text-center">
            Bu konuda henüz soru yok.
          </Text>
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
                  pathname:
                    "/(tabs)/lesson/[lessonId]/topic/[topicId]/question/[questionId]",
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