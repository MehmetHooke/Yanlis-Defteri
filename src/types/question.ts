export type Question = {
  id: string;
  userId: string;
  imageUrl: string;
  lesson: string;
  topic: string;
  createdAt?: any; // Firestore Timestamp (MVP için)
};
