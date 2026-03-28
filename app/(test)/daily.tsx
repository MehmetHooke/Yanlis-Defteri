import FullscreenZoomImage from "@/src/components/FullscreenZoomImage";
import TestProgressPill from "@/src/components/TestProgressPill";
import { useAppAlert } from "@/src/components/common/AppAlertProvider";
import TestAnswersAccordion from "@/src/components/test/TestAnswersAccordion";
import TestHintsAccordion from "@/src/components/test/TestHintsAccordion";
import { useTheme } from "@/src/context/ThemeContext";
import { useTestExitToHomeOnBack } from "@/src/hooks/useTestExitToHomeOnBack";
import { addAttemptAndUpdateQuestion } from "@/src/services/attempt.service";
import {
  getDailyReviewPlan,
  markDailyReviewCompleted,
  type DailyReviewItem,
  type DailyReviewPlan,
} from "@/src/services/daily-review.service";
import type { Question } from "@/src/types/question";
import { router } from "expo-router";
import {
  CheckCircle2,
  Flame,
  Sparkles,
  TimerReset,
  XCircle,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

function getQuestionImageUrl(item: Question | null) {
  const fromNew =
    item?.question?.kind === "photo" ? item.question.image?.url : undefined;
  const fromLegacyV3 = (item as any)?.questionImage?.url;
  const fromLegacyV2 = (item as any)?.imageUrl;
  return fromNew || fromLegacyV3 || fromLegacyV2 || null;
}

function getQuestionText(item: Question | null) {
  if (item?.question?.kind === "text") return item.question.text;
  return "";
}

export default function DailyReviewScreen() {
  const { theme } = useTheme();
  const c = theme.colors;

  const api = useAppAlert();
  const { alert } = api;

  useTestExitToHomeOnBack({
    api,
    goHome: () => router.replace("/(tabs)"),
    title: "Gunluk tekrardan cik",
    message: "Gunluk tekrari kapatip anasayfaya donmek istiyor musun?",
    confirmText: "Cik",
    cancelText: "Vazgec",
    destructive: true,
  });

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<DailyReviewPlan | null>(null);
  const [items, setItems] = useState<DailyReviewItem[]>([]);
  const [i, setI] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUri, setViewerUri] = useState("");

  const currentItem = items[i] ?? null;
  const current = currentItem?.question ?? null;

  const questionUri = useMemo(() => getQuestionImageUrl(current), [current]);
  const questionText = useMemo(() => getQuestionText(current), [current]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const nextPlan = await getDailyReviewPlan({ take: 5, poolLimit: 280 });
        setPlan(nextPlan);
        setItems(nextPlan.items);
        setI(0);
        setSolvedCount(0);
      } catch (e: any) {
        console.log("DAILY REVIEW LOAD ERROR:", e?.code, e?.message, e);
        alert("Hata", e?.message ?? "Gunluk tekrar hazirlanamadi", {
          variant: "danger",
        });
        setPlan(null);
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [alert]);

  const openViewer = (uri: string) => {
    setViewerUri(uri);
    setViewerOpen(true);
  };

  const next = async (nextSolved: number) => {
    if (i + 1 >= items.length) {
      const nextStreak = await markDailyReviewCompleted();
      router.replace({
        pathname: "/(test)/result" as any,
        params: {
          mode: "daily",
          total: String(items.length),
          solved: String(nextSolved),
          streak: String(nextStreak.current),
          bestStreak: String(nextStreak.best),
        },
      });
      return;
    }

    setI((p) => p + 1);
  };

  const mark = async (result: "solved" | "unsolved") => {
    if (!current) return;

    try {
      await addAttemptAndUpdateQuestion({
        lessonId: current.lessonId,
        topicId: current.topicId,
        questionId: current.id,
        result,
        hintViewed: false,
        answerViewed: false,
        source: "normal",
      });

      const nextSolved = result === "solved" ? solvedCount + 1 : solvedCount;
      if (result === "solved") setSolvedCount(nextSolved);
      await next(nextSolved);
    } catch (e: any) {
      console.log("DAILY REVIEW MARK ERROR:", e?.code, e?.message, e);
      alert("Hata", e?.message ?? "Kaydedilemedi", { variant: "danger" });
    }
  };

  const reasonIcon = useMemo(() => {
    if (!currentItem) return null;
    if (currentItem.reason === "retention") {
      return <TimerReset size={16} color={c.accent} />;
    }
    if (currentItem.reason === "fresh") {
      return <Sparkles size={16} color={c.accent} />;
    }
    return <Flame size={16} color={c.accent} />;
  }, [currentItem, c.accent]);

  if (loading) {
    return (
      <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      </ImageBackground>
    );
  }

  if (!currentItem) {
    return (
      <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <Text
            style={{
              color: c.text,
              fontWeight: "900",
              fontSize: 16,
              textAlign: "center",
            }}
          >
            Gunluk tekrar icin yeterli soru bulunamadi.
          </Text>
          <Text
            style={{
              color: c.mutedText,
              marginTop: 8,
              textAlign: "center",
            }}
          >
            Biraz daha soru ekledikce ve cozdum/cozemedim isaretledikce gunluk
            plan daha anlamli hale gelecek.
          </Text>

          <Pressable
            onPress={() => router.replace("/(tabs)")}
            style={{
              marginTop: 14,
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: c.buttonBg,
            }}
          >
            <Text style={{ color: c.buttonText, fontWeight: "900" }}>
              Ana Sayfaya Don
            </Text>
          </Pressable>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 18, paddingBottom: 15 }}>
        <Text
          className="text-center"
          style={{ color: c.text, fontSize: 18, fontWeight: "900" }}
        >
          Gunluk Tekrar
        </Text>

        <Text
          style={{
            color: c.mutedText,
            marginTop: 4,
            textAlign: "center",
            fontWeight: "700",
          }}
        >
          {plan?.completed
            ? "Bugunun gunluk tekrarini bir kez tamamladin, istersen tekrar cozebilirsin."
            : "Bugun icin secilen kisa tekrar plani."}
        </Text>

        <View style={{ marginTop: 8 }}>
          <TestProgressPill index={i} total={items.length} color={c.accent} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}>
        <View
          style={{
            borderRadius: 18,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.borderStrong,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              marginTop: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            {reasonIcon}
            <Text style={{ color: c.text, fontWeight: "800", flex: 1 }}>
              {currentItem.reasonLabel}
            </Text>
          </View>

          <Text style={{ color: c.mutedText, marginTop: 6 }}>
            {(currentItem.lessonName ?? "Ders") +
              " • " +
              (currentItem.topicName ?? "Konu")}
          </Text>
        </View>

        <View
          style={{
            borderRadius: 18,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: c.borderStrong,
            backgroundColor: c.card,
            marginBottom: 10,
          }}
        >
          {questionUri ? (
            <Pressable onPress={() => openViewer(questionUri)} style={{ width: "100%" }}>
              <Image
                source={{ uri: questionUri }}
                style={{ width: "100%", height: 360, backgroundColor: c.inputBg }}
                resizeMode="cover"
              />
            </Pressable>
          ) : (
            <View style={{ padding: 16, minHeight: 220, justifyContent: "center" }}>
              <Text style={{ color: c.mutedText, fontSize: 12, fontWeight: "800" }}>
                Metin sorusu
              </Text>
              <Text
                style={{
                  color: c.text,
                  marginTop: 10,
                  lineHeight: 20,
                  fontWeight: "700",
                }}
              >
                {questionText?.trim() ? questionText : "-"}
              </Text>
            </View>
          )}
        </View>

        <TestHintsAccordion hints={current?.answers} />

        <TestAnswersAccordion
          answers={current?.answers}
          onOpenImage={(uri) => openViewer(uri)}
        />

        <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
          <Pressable
            onPress={() => mark("solved")}
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: 16,
              backgroundColor: c.testButtonBackgroundGreen,
              borderWidth: 1,
              borderColor: "rgba(34,197,94,0.55)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <CheckCircle2 size={18} color={c.testButtonTextColorGreen} />
              <Text
                style={{
                  marginLeft: 8,
                  fontSize: 15,
                  fontWeight: "800",
                  color: c.testButtonTextColorGreen,
                }}
              >
                Cozdum
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => mark("unsolved")}
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: 16,
              backgroundColor: "rgba(239,68,68,0.12)",
              borderWidth: 1,
              borderColor: "rgba(239,68,68,0.45)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <XCircle size={18} color={"rgba(239,68,68,0.95)"} />
              <Text
                style={{
                  marginLeft: 8,
                  fontSize: 15,
                  fontWeight: "800",
                  color: "rgba(239,68,68,0.95)",
                }}
              >
                Cozemedim
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      <FullscreenZoomImage
        visible={viewerOpen}
        uri={viewerUri}
        onClose={() => setViewerOpen(false)}
      />
    </ImageBackground>
  );
}
