// question.service.ts
import { db, storage } from "@/src/lib/firebase";
import type { Question } from "@/src/types/question";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import {
    deleteObject,
    getDownloadURL,
    ref,
    uploadBytes,
} from "firebase/storage";

export async function addQuestion(params: {
  userId: string;
  imageUri: string;
  lesson: string;
  topic: string;
}) {
  const { userId, imageUri, lesson, topic } = params;

  const res = await fetch(imageUri);
  const blob = await res.blob();

  const fileRef = ref(storage, `questions/${userId}/${Date.now()}.jpg`);
  await uploadBytes(fileRef, blob);
  const imageUrl = await getDownloadURL(fileRef);

  const docRef = await addDoc(collection(db, "questions"), {
    userId,
    imageUrl,
    lesson: lesson.trim(),
    topic: topic.trim(),
    createdAt: serverTimestamp(),
  });

  await updateDoc(docRef, { id: docRef.id });

  return docRef.id;
}

export async function getUserQuestions(userId: string): Promise<Question[]> {
  const q = query(
    collection(db, "questions"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Question);
}

/**
 * Sadece Firestore belgesini siler.
 * @param questionId questions koleksiyonundaki doc id
 */
export async function deleteQuestion(questionId: string): Promise<void> {
  if (!questionId) throw new Error("questionId is required");
  await deleteDoc(doc(db, "questions", questionId));
}

/**
 * Firestore belgesi + (opsiyonel) storage'daki görseli siler.
 * Not: imageUrl bir download URL ise path'e çevirmeye çalışırız.
 */
export async function deleteQuestionWithImage(params: {
  questionId: string;
  imageUrl?: string;
}): Promise<void> {
  const { questionId, imageUrl } = params;
  if (!questionId) throw new Error("questionId is required");

  // Önce firestore doc'u sil
  await deleteDoc(doc(db, "questions", questionId));

  // Sonra storage objesini sil (varsa)
  if (imageUrl) {
    try {
      // imageUrl download url ise ref(storage, imageUrl) çalışır (Firebase v9+ destekler)
      const fileRef = ref(storage, imageUrl);
      await deleteObject(fileRef);
    } catch (e) {
      // Storage silme başarısız olsa da doc silinmiş olabilir; MVP için sessiz geçilebilir
      console.log("Storage image delete failed:", e);
    }
  }
}
