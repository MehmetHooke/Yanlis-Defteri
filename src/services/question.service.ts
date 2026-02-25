// src/services/question.service.ts
import { db, storage } from "@/src/lib/firebase";
import type { Lesson } from "@/src/types/lesson";
import type { Question } from "@/src/types/question";
import type { Topic } from "@/src/types/topic";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

/** ---------- helpers ---------- **/
function normalizeKey(input: string) {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

function toDisplayName(input: string) {
  const clean = input.trim().replace(/\s+/g, " ");
  if (!clean) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

/** ---------- refs ---------- **/
function lessonsCol(userId: string) {
  return collection(db, "users", userId, "lessons");
}

function lessonDoc(userId: string, lessonId: string) {
  return doc(db, "users", userId, "lessons", lessonId);
}

function topicsCol(userId: string, lessonId: string) {
  return collection(db, "users", userId, "lessons", lessonId, "topics");
}

function topicDoc(userId: string, lessonId: string, topicId: string) {
  return doc(db, "users", userId, "lessons", lessonId, "topics", topicId);
}

function questionsCol(userId: string, lessonId: string, topicId: string) {
  return collection(
    db,
    "users",
    userId,
    "lessons",
    lessonId,
    "topics",
    topicId,
    "questions",
  );
}

function questionDoc(
  userId: string,
  lessonId: string,
  topicId: string,
  questionId: string,
) {
  return doc(
    db,
    "users",
    userId,
    "lessons",
    lessonId,
    "topics",
    topicId,
    "questions",
    questionId,
  );
}

async function uploadImageUri(userId: string, uri: string, folder: string) {
  const res = await fetch(uri);
  const blob = await res.blob();

  const imagePath = `${folder}/${userId}/${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}.jpg`;

  const fileRef = ref(storage, imagePath);
  await uploadBytes(fileRef, blob);
  const url = await getDownloadURL(fileRef);

  return { url, path: imagePath };
}

/** ---------- ensure lesson/topic exists ---------- **/
async function ensureLesson(userId: string, lessonInput: string) {
  const key = normalizeKey(lessonInput);
  const name = toDisplayName(lessonInput);
  if (!key) throw new Error("lesson is required");

  const q = query(lessonsCol(userId), where("key", "==", key), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0];
    return { lessonId: d.id, lesson: d.data() as Lesson };
  }

  const docRef = await addDoc(lessonsCol(userId), {
    userId,
    name,
    key,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
    topicCount: 0,
    questionCount: 0,
  });

  await updateDoc(docRef, { id: docRef.id });
  const createdSnap = await getDoc(docRef);
  return { lessonId: docRef.id, lesson: createdSnap.data() as Lesson };
}

async function ensureTopic(
  userId: string,
  lessonId: string,
  topicInput: string,
) {
  const key = normalizeKey(topicInput);
  const name = toDisplayName(topicInput);
  if (!key) throw new Error("topic is required");

  const q = query(
    topicsCol(userId, lessonId),
    where("key", "==", key),
    limit(1),
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0];
    return { topicId: d.id, topic: d.data() as Topic };
  }

  const docRef = await addDoc(topicsCol(userId, lessonId), {
    userId,
    lessonId,
    name,
    key,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
    questionCount: 0,
  });

  await updateDoc(docRef, { id: docRef.id });

  // lesson.topicCount++
  await updateDoc(lessonDoc(userId, lessonId), {
    topicCount: increment(1),
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  });

  const createdSnap = await getDoc(docRef);
  return { topicId: docRef.id, topic: createdSnap.data() as Topic };
}

/** ---------- add question (creates lesson/topic if needed) ---------- **/
export async function addQuestionV2(params: {
  userId: string;
  imageUri: string;
  lesson: string;
  topic: string;
}) {
  const { userId, imageUri, lesson, topic } = params;

  const { lessonId } = await ensureLesson(userId, lesson);
  const { topicId } = await ensureTopic(userId, lessonId, topic);

  // upload image
  const res = await fetch(imageUri);
  const blob = await res.blob();

  const imagePath = `questions/${userId}/${Date.now()}.jpg`;
  const fileRef = ref(storage, imagePath);
  await uploadBytes(fileRef, blob);
  const imageUrl = await getDownloadURL(fileRef);

  // create question doc
  const qRef = await addDoc(questionsCol(userId, lessonId, topicId), {
    userId,
    lessonId,
    topicId,
    imageUrl,
    imagePath,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(qRef, { id: qRef.id });

  // update topic + lesson activity & counts
  const batch = writeBatch(db);
  batch.update(topicDoc(userId, lessonId, topicId), {
    questionCount: increment(1),
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  });
  batch.update(lessonDoc(userId, lessonId), {
    questionCount: increment(1),
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  });
  await batch.commit();

  return { lessonId, topicId, questionId: qRef.id };
}

export async function addQuestionV3(params: {
  userId: string;

  // ✅ soru foto zorunlu değil artık
  question:
    | { kind: "photo"; imageUri: string }
    | { kind: "text"; text: string };

  lesson: string;
  topic: string;

  answers: Array<{
    id: string;
    kind: "choice" | "photo";
    choice?: "A" | "B" | "C" | "D" | "E";
    explanation?: string;
    imageUri?: string; // kind=photo ise zorunlu
  }>;
}) {
  const { userId, lesson, topic } = params;
  const answers = params.answers ?? [];
  const question = params.question;

  if (!lesson.trim()) throw new Error("Ders boş olamaz.");
  if (!topic.trim()) throw new Error("Konu boş olamaz.");

  // ✅ soru validasyonu
  if (question.kind === "photo") {
    if (!question.imageUri) throw new Error("Soru fotoğrafı seçilmedi.");
  } else {
    if (!question.text?.trim()) throw new Error("Soru metni boş olamaz.");
  }

  // ✅ en az 1, max 3 cevap
  if (answers.length < 1) throw new Error("En az 1 cevap eklemelisin.");
  if (answers.length > 3) throw new Error("En fazla 3 cevap ekleyebilirsin.");

  for (const a of answers) {
    if (a.kind === "choice") {
      if (!a.choice) throw new Error("Şık seçilmemiş cevap var.");
    } else {
      if (!a.imageUri) throw new Error("Fotoğraf seçilmemiş cevap var.");
    }
  }

  const { lessonId } = await ensureLesson(userId, lesson);
  const { topicId } = await ensureTopic(userId, lessonId, topic);

  // 1) soru upload (photo ise)
  let questionPayload: any;
  if (question.kind === "photo") {
    const qImg = await uploadImageUri(userId, question.imageUri, "questions");
    questionPayload = { kind: "photo", image: qImg };
  } else {
    questionPayload = { kind: "text", text: question.text.trim() };
  }

  // 2) cevap upload (photo ise)
  const uploadedAnswers: any[] = [];

  for (const a of answers) {
    if (a.kind === "photo" && a.imageUri) {
      const img = await uploadImageUri(userId, a.imageUri, "answers");
      const obj: any = { id: a.id, kind: "photo", image: img };

      // ✅ undefined göndermiyoruz
      const exp = a.explanation?.trim();
      if (exp) obj.explanation = exp;

      uploadedAnswers.push(obj);
    } else {
      const obj: any = { id: a.id, kind: "choice", choice: a.choice };

      const exp = a.explanation?.trim();
      if (exp) obj.explanation = exp;

      uploadedAnswers.push(obj);
    }
  }

  // 3) question doc
  const qRef = await addDoc(questionsCol(userId, lessonId, topicId), {
    userId,
    lessonId,
    topicId,

    // ✅ yeni alan
    question: questionPayload,

    answers: uploadedAnswers,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(qRef, { id: qRef.id });

  // 4) counter + activity
  const batch = writeBatch(db);
  batch.update(topicDoc(userId, lessonId, topicId), {
    questionCount: increment(1),
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  });
  batch.update(lessonDoc(userId, lessonId), {
    questionCount: increment(1),
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  });
  await batch.commit();

  return { lessonId, topicId, questionId: qRef.id };
}

/** ---------- list lessons/topics/questions ---------- **/
export async function getUserLessons(userId: string): Promise<Lesson[]> {
  const q = query(lessonsCol(userId), orderBy("lastActivityAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as Lesson), id: d.id }));
}

export async function getLessonTopics(
  userId: string,
  lessonId: string,
): Promise<Topic[]> {
  const q = query(
    topicsCol(userId, lessonId),
    orderBy("lastActivityAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as Topic), id: d.id }));
}

export async function getTopicQuestions(params: {
  userId: string;
  lessonId: string;
  topicId: string;
}): Promise<Question[]> {
  const { userId, lessonId, topicId } = params;
  const q = query(
    questionsCol(userId, lessonId, topicId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as Question), id: d.id }));
}

/** ---------- delete question with image + cleanup empty topic/lesson ---------- **/
export async function deleteQuestionCascade(params: {
  userId: string;
  lessonId: string;
  topicId: string;
  questionId: string;
}) {
  const { userId, lessonId, topicId, questionId } = params;

  const qSnap = await getDoc(
    questionDoc(userId, lessonId, topicId, questionId),
  );
  if (!qSnap.exists()) return;

  const qData = qSnap.data() as Question;

  // ✅ V3 + V2 uyumlu: silinecek tüm path’leri topla
  const pathsToDelete: string[] = [];

  // V3 soru foto
  if ((qData as any)?.questionImage?.path) {
    pathsToDelete.push((qData as any).questionImage.path);
  }

  // V2 soru foto
  if ((qData as any)?.imagePath) {
    pathsToDelete.push((qData as any).imagePath);
  }

  // V3 cevap fotoğrafları
  const answers = (qData as any)?.answers ?? [];
  for (const a of answers) {
    if (a?.kind === "photo" && a?.image?.path) {
      pathsToDelete.push(a.image.path);
    }
  }

  // delete doc + update counters (senin mevcut halin aynı)
  const batch = writeBatch(db);
  batch.delete(questionDoc(userId, lessonId, topicId, questionId));
  batch.update(topicDoc(userId, lessonId, topicId), {
    questionCount: increment(-1),
    updatedAt: serverTimestamp(),
  });
  batch.update(lessonDoc(userId, lessonId), {
    questionCount: increment(-1),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();

  // ✅ storage delete (best effort)
  for (const p of pathsToDelete) {
    try {
      await deleteObject(ref(storage, p));
    } catch (e) {
      console.log("Storage delete failed:", p, e);
    }
  }

  // if topic empty => delete topic
  const topicSnap = await getDoc(topicDoc(userId, lessonId, topicId));
  if (topicSnap.exists()) {
    const t = topicSnap.data() as Topic;
    if ((t.questionCount ?? 0) <= 0) {
      const b2 = writeBatch(db);
      b2.delete(topicDoc(userId, lessonId, topicId));
      b2.update(lessonDoc(userId, lessonId), {
        topicCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
      await b2.commit();
    }
  }

  // if lesson empty => delete lesson
  const lessonSnap = await getDoc(lessonDoc(userId, lessonId));
  if (lessonSnap.exists()) {
    const l = lessonSnap.data() as Lesson;
    const qc = l.questionCount ?? 0;
    const tc = l.topicCount ?? 0;
    if (qc <= 0 && tc <= 0) {
      await deleteDoc(lessonDoc(userId, lessonId));
    }
  }

  // lastActivityAt düzeltmesi (MVP ama sıralama bozulmasın diye):
  await recomputeLastActivity(userId, lessonId, topicId);
}

async function recomputeLastActivity(
  userId: string,
  lessonId: string,
  topicId?: string,
) {
  // topic lastActivityAt -> en yeni soru
  if (topicId) {
    const qQ = query(
      questionsCol(userId, lessonId, topicId),
      orderBy("createdAt", "desc"),
      limit(1),
    );
    const qSnap = await getDocs(qQ);
    if (!qSnap.empty) {
      const newest = qSnap.docs[0].data() as Question;
      await updateDoc(topicDoc(userId, lessonId, topicId), {
        lastActivityAt: newest.createdAt ?? serverTimestamp(),
      });
    }
  }

  // lesson lastActivityAt -> en yeni topic activity
  const tQ = query(
    topicsCol(userId, lessonId),
    orderBy("lastActivityAt", "desc"),
    limit(1),
  );
  const tSnap = await getDocs(tQ);
  if (!tSnap.empty) {
    const newestTopic = tSnap.docs[0].data() as Topic;
    await updateDoc(lessonDoc(userId, lessonId), {
      lastActivityAt: newestTopic.lastActivityAt ?? serverTimestamp(),
    });
  }
}

/** ---------- rename lesson/topic ---------- **/
export async function renameLesson(params: {
  userId: string;
  lessonId: string;
  newName: string;
}) {
  const { userId, lessonId, newName } = params;
  const name = toDisplayName(newName);
  const key = normalizeKey(newName);
  if (!key) throw new Error("newName is required");

  // aynı key'e sahip başka lesson var mı?
  const q = query(lessonsCol(userId), where("key", "==", key), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty && snap.docs[0].id !== lessonId) {
    throw new Error("Bu ders adı zaten var.");
  }

  await updateDoc(lessonDoc(userId, lessonId), {
    name,
    key,
    updatedAt: serverTimestamp(),
  });
}

export async function renameTopic(params: {
  userId: string;
  lessonId: string;
  topicId: string;
  newName: string;
}) {
  const { userId, lessonId, topicId, newName } = params;
  const name = toDisplayName(newName);
  const key = normalizeKey(newName);
  if (!key) throw new Error("newName is required");

  const q = query(
    topicsCol(userId, lessonId),
    where("key", "==", key),
    limit(1),
  );
  const snap = await getDocs(q);
  if (!snap.empty && snap.docs[0].id !== topicId) {
    throw new Error("Bu konu adı zaten var.");
  }

  await updateDoc(topicDoc(userId, lessonId, topicId), {
    name,
    key,
    updatedAt: serverTimestamp(),
  });
}
