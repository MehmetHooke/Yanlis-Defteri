import EmptyState from "@/src/components/EmptyState";
import { useTheme } from "@/src/context/ThemeContext";
import { auth } from "@/src/lib/firebase";
import { logout } from "@/src/services/auth.service";
import { getUserLessons } from "@/src/services/question.service";
import type { Lesson } from "@/src/types/lesson";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from "react-native";

function LessonCard({
  item,
  onPress,
}: {
  item: Lesson;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-2xl bg-white/10 border border-white/10 p-4"
    >
      <Text className="text-white text-lg font-semibold">{item.name}</Text>

      <View className="mt-2 flex-row gap-2">
        <View className="rounded-full bg-white/10 border border-white/10 px-3 py-1">
          <Text className="text-white/70 text-xs">
            {item.topicCount ?? 0} konu
          </Text>
        </View>
        <View className="rounded-full bg-white/10 border border-white/10 px-3 py-1">
          <Text className="text-white/70 text-xs">
            {item.questionCount ?? 0} soru
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const [items, setItems] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme, themeLoading } = useTheme();
  const fetchData = async () => {
    const user = auth.currentUser;

    setLoading(true);
    try {
      if (!user) {
        setItems([]);
        return;
      }

      const data = await getUserLessons(user.uid);
      setItems(data);
    } catch (e: any) {
      console.log("Home lessons HATA =", e);
      Alert.alert("Liste Hatası", e?.message ?? "Bilinmeyen hata");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  return (
    <View className="flex-1 bg-black">
      <View className="pt-14 px-6 pb-4 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-white">Yanlış Defterim</Text>

        <Pressable
          onPress={async () => {
            await logout();
            router.replace("/(auth)/login");
          }}
          className="rounded-xl bg-white/10 px-4 py-2 border border-white/10"
        >
          <Text className="text-white">Çıkış</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <LessonCard
              item={item}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/lesson/[lessonId]",
                  params: { lessonId: item.id },
                })
              }
            />
          )}
        />
      )}
    </View>
  );
}