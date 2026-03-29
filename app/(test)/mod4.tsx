// app/(test)/mod4.tsx
import FullscreenZoomImage from "@/src/components/FullscreenZoomImage";
import TestProgressPill from "@/src/components/TestProgressPill";
import { useAppAlert } from "@/src/components/common/AppAlertProvider";
import { useTheme } from "@/src/context/ThemeContext";
import { useTestExitToHomeOnBack } from "@/src/hooks/useTestExitToHomeOnBack";
import { addAttemptAndUpdateQuestion } from "@/src/services/attempt.service";
import {
    formatChoiceLabel,
    getChoiceOptions,
    getChoiceText,
    getQuestionExplanation,
    getQuestionImageUrl,
    getQuestionText,
    setMod4Session,
    type Mod4Choice,
    type Mod4QuestionResult,
} from "@/src/services/mod4-session.service";
import { getMod4ChoiceQuestions } from "@/src/services/test.service";
import type { Answer, Question } from "@/src/types/question";
import { router } from "expo-router";
import { CheckCircle2 } from "lucide-react-native";
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

const CHOICES: Mod4Choice[] = ["A", "B", "C", "D", "E"];

function getCorrectChoice(q: Question): Mod4Choice | null {
  const choiceAnswer = q.answers?.find(
    (a): a is Extract<Answer, { kind: "choice" }> =>
      a.kind === "choice" && !!a.choice
  );

  return (choiceAnswer?.choice as Mod4Choice | undefined) ?? null;
}

export default function TestMod4Screen() {
  const { theme } = useTheme();
  const c = theme.colors;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [i, setI] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);

  const [selectedChoice, setSelectedChoice] = useState<Mod4Choice | null>(null);
  const [results, setResults] = useState<Mod4QuestionResult[]>([]);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUri, setViewerUri] = useState("");

  const current = questions[i] ?? null;

  const questionUri = useMemo(() => getQuestionImageUrl(current), [current]);
  const questionText = useMemo(() => getQuestionText(current), [current]);
  const choiceOptions = useMemo(() => getChoiceOptions(current), [current]);

  const api = useAppAlert();
  const { alert, confirm } = api;

  useTestExitToHomeOnBack({
    api,
    goHome: () => router.replace("/(tabs)"),
    title: "Testten çık",
    message: "Testten çıkıp anasayfaya dönmek istiyor musun?",
    confirmText: "Çık",
    cancelText: "Vazgeç",
    destructive: true,
  });

  const openViewer = (uri: string) => {
    setViewerUri(uri);
    setViewerOpen(true);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const qs = await getMod4ChoiceQuestions({
          take: 5,
          poolLimit: 220,
        });

        if (qs.length < 5) {
          confirm({
            title: "Yeterli şıklı soru yok",
            message:
              "Test Sınavı için en az 5 adet şıklı soru gerekli. Şimdi soru ekleme ekranına gidip yeni soru ekleyebilirsin.",
            confirmText: "Soru ekle",
            cancelText: "Geri",
            onConfirm: () => router.replace("/(tabs)/add"),
          });
          setQuestions([]);
          return;
        }

        setQuestions(qs);
        setI(0);
        setSolvedCount(0);
        setSelectedChoice(null);
        setResults([]);
      } catch (e: any) {
        console.log("MOD4 LOAD ERROR:", e?.code, e?.message, e);
        alert("Hata", e?.message ?? "Test Sınavı hazırlanamadı", {
          variant: "danger",
        });
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setSelectedChoice(null);
  }, [i]);

  const handleContinue = async () => {
    if (!current || !selectedChoice || submitting) return;

    const correctChoice = getCorrectChoice(current);
    if (!correctChoice) {
      alert("Hata", "Bu sorunun doğru şıkkı bulunamadı.", {
        variant: "danger",
      });
      return;
    }

    try {
      setSubmitting(true);

      const isCorrect = selectedChoice === correctChoice;
      const resultValue: "solved" | "unsolved" = isCorrect
        ? "solved"
        : "unsolved";

      await addAttemptAndUpdateQuestion({
        lessonId: current.lessonId,
        topicId: current.topicId,
        questionId: current.id,
        result: resultValue,
        hintViewed: false,
        answerViewed: false,
        source: "test_mod4",
      });

      const nextSolvedCount = isCorrect ? solvedCount + 1 : solvedCount;

      if (isCorrect) {
        setSolvedCount(nextSolvedCount);
      }

      const row: Mod4QuestionResult = {
        questionId: current.id,
        lessonId: current.lessonId,
        topicId: current.topicId,
        questionText: getQuestionText(current),
        questionImageUrl: getQuestionImageUrl(current),
        selectedChoice,
        correctChoice,
        selectedChoiceText: getChoiceText(current, selectedChoice),
        correctChoiceText: getChoiceText(current, correctChoice),
        isCorrect,
        explanation: getQuestionExplanation(current),
      };

      const nextResults = [...results, row];

      if (i + 1 >= questions.length) {
        setMod4Session({
          results: nextResults,
          total: questions.length,
          solved: nextSolvedCount,
          createdAt: Date.now(),
        });

        router.replace("/(test)/mod4-result");
        return;
      }

      setResults(nextResults);
      setI((p) => p + 1);
    } catch (e: any) {
      console.log("MOD4 SUBMIT ERROR:", e?.code, e?.message, e);
      alert("Hata", e?.message ?? "Cevap kaydedilemedi", {
        variant: "danger",
      });
    } finally {
      setSubmitting(false);
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
            Test Sınavı başlatılamadı.
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
      <View style={{ paddingTop: 60, paddingHorizontal: 18, paddingBottom: 15 }}>
        <Text
          className="text-center"
          style={{ color: c.text, fontSize: 18, fontWeight: "900" }}
        >
          Test Sınavı
        </Text>

        <View style={{ marginTop: 8 }}>
          <TestProgressPill index={i} total={questions.length} color="green" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 28 }}>
        <View
          style={{
            borderRadius: 18,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: c.borderStrong,
            backgroundColor: c.card,
            marginBottom: 14,
          }}
        >
          {questionUri ? (
            <Pressable onPress={() => openViewer(questionUri)} style={{ width: "100%" }}>
              <Image
                source={{ uri: questionUri }}
                style={{ width: "100%", height: 220, backgroundColor: c.inputBg }}
                resizeMode="cover"
              />
            </Pressable>
          ) : (
            <View style={{ padding: 16, minHeight: 220, justifyContent: "center" }}>
              <Text style={{ color: c.mutedText, fontSize: 12, fontWeight: "800" }}>
                Soru
              </Text>
              <Text
                style={{
                  color: c.text,
                  marginTop: 10,
                  lineHeight: 22,
                  fontWeight: "700",
                  fontSize: 16,
                }}
              >
                {questionText?.trim() ? questionText : "—"}
              </Text>
            </View>
          )}
        </View>

        <Text style={{ color: c.text, fontWeight: "800", fontSize: 15, marginBottom: 10 }}>
          Doğru şıkkı seç
        </Text>

        <View style={{ gap: 10 }}>
          {CHOICES.map((choice) => {
            const selected = selectedChoice === choice;

            return (
              <Pressable
                key={choice}
                onPress={() => setSelectedChoice(choice)}
                style={{
                  minHeight: 54,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: selected ? c.accent : c.border,
                  backgroundColor: selected ? c.tabActiveBg : c.card,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: selected ? c.accent : c.text,
                    fontWeight: "900",
                    fontSize: 16,
                    textAlign: "center",
                  }}
                >
                  {formatChoiceLabel(
                    choice,
                    choiceOptions.find((opt) => opt.key === choice)?.text
                  )}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!selectedChoice ? (
          <Text
            style={{
              color: c.mutedText,
              marginTop: 12,
              textAlign: "center",
              fontSize: 12,
            }}
          >
            Bir şık seçmeden devam edemezsin.
          </Text>
        ) : (
          <>
            <Text
              style={{
                color: c.mutedText,
                marginTop: 12,
                textAlign: "center",
                fontSize: 12,
              }}
            >
              Şıkkını değiştirebilirsin. Hazırsan devam et.
            </Text>

            <Pressable
              onPress={handleContinue}
              disabled={submitting}
              style={{
                marginTop: 14,
                minHeight: 52,
                borderRadius: 16,
                backgroundColor: c.buttonBg,
                alignItems: "center",
                justifyContent: "center",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <CheckCircle2 size={18} color={c.buttonText} />
                <Text
                  style={{
                    marginLeft: 8,
                    fontSize: 15,
                    fontWeight: "900",
                    color: c.buttonText,
                  }}
                >
                  {i + 1 >= questions.length ? "Sınavı Bitir" : "Devam Et"}
                </Text>
              </View>
            </Pressable>
          </>
        )}
      </ScrollView>

      <FullscreenZoomImage
        uri={viewerUri}
        visible={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </ImageBackground>
  );
}
