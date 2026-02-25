// src/types/question.ts

export type Answer =
  | {
      id: string;
      kind: "choice";
      choice?: "A" | "B" | "C" | "D" | "E";
      explanation?: string;
    }
  | {
      id: string;
      kind: "photo";
      image?: { url: string; path: string };
      explanation?: string;
    }
  | {
      id: string;
      kind: "text";
      text?: string;
      explanation?: string;
    };

// ✅ NEW V3 (after your last changes)
export type QuestionV3Question =
  | {
      kind: "photo";
      image: { url: string; path: string };
    }
  | {
      kind: "text";
      text: string;
    };

export type Question = {
  id: string;
  userId: string;
  lessonId: string;
  topicId: string;

  // ✅ NEW (primary)
  question?: QuestionV3Question;

  // ✅ LEGACY V3 (older data)
  questionImage?: { url: string; path: string };
  answers?: Answer[];

  // ✅ LEGACY V2 (fallback)
  imageUrl?: string;
  imagePath?: string;

  createdAt?: any;
  updatedAt?: any;
};
