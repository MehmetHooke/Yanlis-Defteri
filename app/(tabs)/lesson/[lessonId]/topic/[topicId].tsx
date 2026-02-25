import EmptyState from "@/src/components/EmptyState";
import { useTheme } from "@/src/context/ThemeContext";
import { auth, db } from "@/src/lib/firebase";
import { getTopicQuestions } from "@/src/services/question.service";
import type { Question } from "@/src/types/question";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { ChevronLeft } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  Text,
  View,
} from "react-native";
// AppAlert varsa:
// import { useAppAlert } from "@/src/components/common/AppAlertProvider";

function QuestionRow({ item, onPress }: { item: Question; onPress: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;

  const img = item.questionImage?.url ?? item.imageUrl;

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
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.borderStrong,
        overflow: "hidden",
      }}
    >
      <Image
        source={{ uri: img }}
        style={{ width: "100%", height: 176, backgroundColor: c.inputBg }}
        resizeMode="cover"
      />

      <View style={{ padding: 14 }}>
        <Text style={{ color: c.mutedText, fontSize: 12, fontWeight: "700" }}>
          Soru
        </Text>

        <Text style={{ color: c.text, fontSize: 13, fontWeight: "800", marginTop: 4 }}>
          Detay için dokun
        </Text>

        <View style={{ marginTop: 10 }}>
          <View style={chipStyle}>
            <Text style={{ color: c.mutedText, fontSize: 11, fontWeight: "700" }}>
              Görsel
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function TopicQuestionsScreen() {
  const { lessonId, topicId, from } = useLocalSearchParams<{
    lessonId: string;
    topicId: string;
    from?: string;
  }>();

  const [items, setItems] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [lessonName, setLessonName] = useState<string>("Ders");
  const [topicName, setTopicName] = useState<string>("Konu");

  const { theme } = useTheme();
  const c = theme.colors;

  // const { alert } = useAppAlert();

  const handleBack = () => {
    // 1) from varsa kesin oraya dön
    if (from) return router.replace(from as any);

    // 2) yoksa ders sayfasına dön (topics listesi)
    if (lessonId) {
      return router.replace({
        pathname: "/(tabs)/lesson/[lessonId]",
        params: { lessonId, from: "/(tabs)/questions" },
      });
    }

    // 3) fallback
    return router.replace("/(tabs)/questions");
  };

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
      // alert("Liste Hatası", e?.message ?? "Bilinmeyen hata", { variant: "danger" });
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
              {lessonName} • Sorular
            </Text>
          </View>

          <View style={{ width: 42 }} />
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, paddingHorizontal: 18 }}>
          <EmptyState
            title="Bu konuda henüz soru yok"
            subtitle="Yeni soru eklediğinde burada görünecek."
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 110 }}
          renderItem={({ item }) => (
            <QuestionRow
              item={item}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/lesson/[lessonId]/topic/[topicId]/question/[questionId]",
                  params: {
                    lessonId,
                    topicId,
                    questionId: item.id,
                    from: from ?? "/(tabs)/questions",
                  },
                })
              }
            />
          )}
        />
      )}
    </ImageBackground>
  );
}