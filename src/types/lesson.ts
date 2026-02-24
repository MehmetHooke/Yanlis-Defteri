export type Lesson = {
  id: string;
  userId: string;
  name: string;
  key: string;

  topicCount?: number;
  questionCount?: number;
  createdAt?: any;
  updatedAt?: any;
  lastActivityAt?: any;
};
