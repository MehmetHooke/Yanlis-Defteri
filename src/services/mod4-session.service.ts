import type { ChoiceKey, Question } from "@/src/types/question";

export type Mod4Choice = "A" | "B" | "C" | "D" | "E";

export type Mod4QuestionResult = {
  questionId: string;
  lessonId: string;
  topicId: string;

  questionText?: string;
  questionImageUrl?: string | null;

  selectedChoice: Mod4Choice;
  correctChoice: Mod4Choice;
  selectedChoiceText?: string;
  correctChoiceText?: string;
  isCorrect: boolean;

  explanation?: string;
};

type Mod4SessionData = {
  results: Mod4QuestionResult[];
  total: number;
  solved: number;
  createdAt: number;
};

let mod4Session: Mod4SessionData | null = null;

export function setMod4Session(data: Mod4SessionData) {
  mod4Session = data;
}

export function getMod4Session() {
  return mod4Session;
}

export function clearMod4Session() {
  mod4Session = null;
}

export function getQuestionImageUrl(item: Question | null) {
  const fromNew =
    item?.question?.kind === "photo" ? item.question.image?.url : undefined;
  const fromLegacyV3 = (item as any)?.questionImage?.url;
  const fromLegacyV2 = (item as any)?.imageUrl;
  return fromNew || fromLegacyV3 || fromLegacyV2 || null;
}

export function getQuestionText(item: Question | null) {
  if (item?.question?.kind === "text") return item.question.text;
  return "";
}

export function getQuestionExplanation(item: Question | null) {
  if (!item?.answers?.length) return undefined;

  const withExplanation = item.answers.find(
    (a) => typeof a.explanation === "string" && a.explanation.trim().length > 0,
  );

  return withExplanation?.explanation?.trim() || undefined;
}

export function getChoiceAnswer(item: Question | null) {
  const choiceAnswer = item?.answers?.find(
    (a): a is Extract<NonNullable<Question["answers"]>[number], { kind: "choice" }> =>
      a.kind === "choice",
  );

  return choiceAnswer ?? null;
}

export function getChoiceOptions(item: Question | null) {
  return getChoiceAnswer(item)?.options ?? [];
}

export function getChoiceText(
  item: Question | null,
  choice: ChoiceKey | Mod4Choice | null | undefined,
) {
  if (!choice) return undefined;
  return getChoiceOptions(item).find((opt) => opt.key === choice)?.text?.trim() || undefined;
}

export function formatChoiceLabel(
  choice: ChoiceKey | Mod4Choice | null | undefined,
  text?: string | null,
) {
  if (!choice) return "-";
  const normalizedText = text?.trim();
  return normalizedText ? `${choice}) ${normalizedText}` : choice;
}
