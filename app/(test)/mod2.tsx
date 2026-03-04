// app/(test)/mod2.tsx
import FullscreenZoomImage from "@/src/components/FullscreenZoomImage";
import TestProgressPill from "@/src/components/TestProgressPill";
import { useAppAlert } from "@/src/components/common/AppAlertProvider";
import { useTheme } from "@/src/context/ThemeContext";
import { addAttemptAndUpdateQuestion } from "@/src/services/attempt.service";
import { getMod2MixedQuestions } from "@/src/services/test.service";
import type { Question } from "@/src/types/question";
import { router } from "expo-router";
import { CheckCircle2, XCircle } from "lucide-react-native";
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
  const fromNew = item?.question?.kind === "photo" ? item.question.image?.url : undefined;
  const fromLegacyV3 = (item as any)?.questionImage?.url;
  const fromLegacyV2 = (item as any)?.imageUrl;
  return fromNew || fromLegacyV3 || fromLegacyV2 || null;
}

function getQuestionText(item: Question | null) {
  if (item?.question?.kind === "text") return item.question.text;
  return "";
}

export default function TestMod2Screen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { alert } = useAppAlert();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [i, setI] = useState(0);

  const current = questions[i] ?? null;

  const questionUri = useMemo(() => getQuestionImageUrl(current), [current]);
  const questionText = useMemo(() => getQuestionText(current), [current]);

  const [solvedCount, setSolvedCount] = useState(0);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUri, setViewerUri] = useState("");

  const openViewer = (uri: string) => {
    setViewerUri(uri);
    setViewerOpen(true);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // 2 zayıf + 2 orta + 1 güçlü
        const qs = await getMod2MixedQuestions({
          takeWeak: 2,
          takeMedium: 2,
          takeStrong: 1,
          poolLimit: 180,
        });

        setQuestions(qs);
        setI(0);
        setSolvedCount(0);
      } catch (e: any) {
        console.log("MOD2 LOAD ERROR:", e?.code, e?.message, e);
        alert("Hata", e?.message ?? "Mod2 hazırlanamadı", { variant: "danger" });
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const next = (nextSolvedCount: number) => {
    if (i + 1 >= questions.length) {
      router.replace({
        pathname: "/(test)/result" as any,
        params: {
          mode: "mod2",
          total: String(questions.length),
          solved: String(nextSolvedCount),
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
        source: "test_mod2",
      });

      const nextSolved = result === "solved" ? solvedCount + 1 : solvedCount;
      if (result === "solved") setSolvedCount(nextSolved);

      next(nextSolved);
    } catch (e: any) {
      console.log("MOD2 MARK ERROR:", e?.code, e?.message, e);
      alert("Hata", e?.message ?? "Kaydedilemedi", { variant: "danger" });
    }
  };

  if (loading) {
    return (
      <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      </ImageBackground>
    );
  }

  if (!current) {
    return (
      <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 18 }}>
          <Text style={{ color: c.text, fontWeight: "900", fontSize: 16, textAlign: "center" }}>
            "Karma Tekrar" için yeterli soru bulunamadı.
          </Text>
          <Text style={{ color: c.mutedText, marginTop: 8, textAlign: "center" }}>
            Bu mod: 2 kolay + 2 orta + 1 güçlü soruyu karışık getirir.
            Eğer yeterince soru çözmediysen eklediğin sorulardan 5 adet önüne çıkartır.
            Biraz daha soru ekleyip birkaç deneme yaptıktan sonra daha iyi çalışır.
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={{
              marginTop: 14,
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: c.buttonBg,
            }}
          >
            <Text style={{ color: c.buttonText, fontWeight: "900" }}>Geri</Text>
          </Pressable>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 18, paddingBottom: 15 }}>
        <Text className="text-center" style={{ color: c.text, fontSize: 18, fontWeight: "900" }}>
          Karma Tekrar
        </Text>
        <View style={{ marginTop: 8 }}>
          <TestProgressPill index={i} total={questions.length} color={c.testButtonTextColorGreen} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}>
        {/* Question card */}
        <View
          style={{
            borderRadius: 18,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: c.borderStrong,
            backgroundColor: c.card,
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
              <Text style={{ color: c.text, marginTop: 10, lineHeight: 20, fontWeight: "700" }}>
                {questionText?.trim() ? questionText : "—"}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
          <Pressable
            onPress={() => mark("solved")}
            style={{
              flex: 1,
              marginRight: 10,
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
                Çözdüm
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => mark("unsolved")}
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: 16,
              backgroundColor: "rgba(239,68,68,0.18)",
              borderWidth: 1,
              borderColor: "rgba(239,68,68,0.55)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <XCircle size={18} color="rgba(239,68,68,0.95)" />
              <Text
                style={{
                  marginLeft: 8,
                  fontSize: 15,
                  fontWeight: "800",
                  color: "rgba(239,68,68,0.95)",
                }}
              >
                Çözemedim
              </Text>
            </View>
          </Pressable>
        </View>

        <Text style={{ color: c.mutedText, marginTop: 10, textAlign: "center", fontSize: 12 }}>
          İşaretleyince otomatik sıradaki soruya geçer.
        </Text>
      </ScrollView>

      <FullscreenZoomImage uri={viewerUri} visible={viewerOpen} onClose={() => setViewerOpen(false)} />
    </ImageBackground>
  );
}