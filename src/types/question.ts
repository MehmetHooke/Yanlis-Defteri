export type Question = {
  id: string;
  userId: string;
  lessonId: string;
  topicId: string;
  imageUrl: string;
  imagePath?: string; // storage silmek için garanti
  createdAt?: any;
  updatedAt?: any;
};
