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
    };

export type Question = {
  id: string;
  userId: string;
  lessonId: string;
  topicId: string;

  // ✅ V3
  questionImage?: { url: string; path: string };
  answers?: Answer[];

  // ✅ V2 (fallback)
  imageUrl?: string;
  imagePath?: string;

  createdAt?: any;
  updatedAt?: any;
};
