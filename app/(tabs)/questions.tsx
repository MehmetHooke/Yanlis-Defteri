import EmptyState from "@/src/components/EmptyState";
import { useTheme } from "@/src/context/ThemeContext";
import { auth } from "@/src/lib/firebase";
import { getUserLessons } from "@/src/services/question.service";
import type { Lesson } from "@/src/types/lesson";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { BookOpen } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ImageBackground,
  Pressable,
  Text,
  View,
} from "react-native";

function LessonCard({
  item,
  onPress,
}: {
  item: Lesson;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  const chipStyle = useMemo(
    () => ({
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.border,
    }),
    [c]
  );

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.borderStrong,
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <Text style={{ color: c.text, fontSize: 16, fontWeight: "700" }}>
        {item.name}
      </Text>

      <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
        <View style={chipStyle}>
          <Text style={{ color: c.mutedText, fontSize: 12, fontWeight: "600" }}>
            {item.topicCount ?? 0} konu
          </Text>
        </View>

        <View style={chipStyle}>
          <Text style={{ color: c.mutedText, fontSize: 12, fontWeight: "600" }}>
            {item.questionCount ?? 0} soru
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function QuestionsScreen() {
  const [items, setItems] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme, themeLoading } = useTheme();
  const c = theme.colors;

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
      console.log("Lessons HATA =", e);
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

  if (themeLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ paddingTop: 52, paddingHorizontal: 18, paddingBottom: 10 }}>
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
            <BookOpen size={20} color={c.accent} strokeWidth={2} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: c.text }}>
              Sorularım
            </Text>
            <Text style={{ marginTop: 2, color: c.mutedText, fontSize: 13 }}>
              Derslere göre tüm sorularına buradan ulaş.
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : items.length === 0 ? (
        <View style={{flex:1, paddingHorizontal: 18, paddingTop: 12 }}>
          <EmptyState />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 110 }}
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
    </ImageBackground>
  );
}