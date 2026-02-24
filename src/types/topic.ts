export type Topic = {
  id: string;
  userId: string;
  lessonId: string;
  name: string;
  key: string;

  questionCount?: number;
  createdAt?: any;
  updatedAt?: any;
  lastActivityAt?: any;
};
