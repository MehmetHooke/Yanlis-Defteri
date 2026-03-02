import { useTheme } from "@/src/context/ThemeContext";
import { auth, db } from "@/src/lib/firebase";
import { getLessonTopics } from "@/src/services/question.service";
import type { Topic } from "@/src/types/topic";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { ChevronLeft } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  Pressable,
  Text,
  View,
} from "react-native";


function TopicCard({ item, onPress }: { item: Topic; onPress: () => void }) {
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
      alignSelf: "flex-start" as const,
    }),
    [c]
  );

  return (
    <Pressable
      onPress={onPress}
      style={{
        marginBottom: 12,
        borderRadius: 18,
      }}
    >
      <LinearGradient
        colors={theme.lessonCard.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 18,
          padding: 14,
          borderWidth: theme.lessonCard.edgeBorderWidth,
          borderColor: theme.lessonCard.edgeBorderColor,
          ...theme.lessonCard.shadow,
        }}
      >
      <Text style={{ color: c.text, fontSize: 16, fontWeight: "800" }}>
        {item.name}
      </Text>

      <View style={{ marginTop: 10 }}>
        <View style={chipStyle}>
          <Text style={{ color: c.mutedText, fontSize: 12, fontWeight: "700" }}>
            {item.questionCount ?? 0} soru
          </Text>
        </View>
      </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function LessonTopicsScreen() {
  const { lessonId, from } = useLocalSearchParams<{ lessonId: string; from?: string }>();
  const [items, setItems] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [lessonName, setLessonName] = useState<string>("Ders");

  const { theme } = useTheme();
  const c = theme.colors;


  const handleBack = () => {
    if (from) {
      router.replace(from as any);
      return;
    }
    router.replace("/(tabs)/questions");
  };

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
      // AppAlert varsa:
      // alert("Liste Hatası", e?.message ?? "Bilinmeyen hata", { variant: "danger" });
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

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 18, paddingBottom: 10 }}>
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
              Konular
            </Text>
            <Text style={{ color: c.text, fontSize: 14, marginTop: 2 }} numberOfLines={1}>
              {lessonName} Dersi
            </Text>
          </View>

          {/* başlığı ortalamak için spacer */}
          <View style={{ width: 42 }} />
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 }}>
          <Text style={{ color: c.text, fontWeight: "800", fontSize: 16 }}>
            Bu derste henüz konu yok.
          </Text>
          <Text style={{ color: c.mutedText, textAlign: "center", marginTop: 6 }}>
            Yeni soru eklediğinde konu otomatik oluşacak.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 110 }}
          renderItem={({ item }) => (
            <TopicCard
              item={item}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/lesson/[lessonId]/topic/[topicId]",
                  params: { lessonId, topicId: item.id, from: `/(tabs)/lesson/${lessonId}?from=${from ?? "/(tabs)/questions"}` },
                })
              }
            />
          )}
        />
      )}
    </ImageBackground>
  );
}