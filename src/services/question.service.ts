// src/services/question.service.ts
import { db, storage } from "@/src/lib/firebase";
import type { Lesson } from "@/src/types/lesson";
import type { Question } from "@/src/types/question";
import type { Topic } from "@/src/types/topic";

import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
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
  writeBatch
} from "firebase/firestore";

import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

type ChoiceKey = "A" | "B" | "C" | "D" | "E";
type ChoiceOption = { key: ChoiceKey; text: string };

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

export function lessonDoc(userId: string, lessonId: string) {
  return doc(db, "users", userId, "lessons", lessonId);
}

function topicsCol(userId: string, lessonId: string) {
  return collection(db, "users", userId, "lessons", lessonId, "topics");
}

export function topicDoc(userId: string, lessonId: string, topicId: string) {
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

export function questionDoc(
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

export async function topicHasAnyQuestion(
  userId: string,
  lessonId: string,
  topicId: string,
) {
  const ref = collection(
    db,
    "users",
    userId,
    "lessons",
    lessonId,
    "topics",
    topicId,
    "questions",
  );
  const snap = await getDocs(query(ref, limit(1)));
  return !snap.empty;
}

export async function lessonHasAnyQuestion(userId: string, lessonId: string) {
  // Lesson altındaki tüm topic’lere bak, herhangi birinde question varsa true.
  const topicsRef = collection(
    db,
    "users",
    userId,
    "lessons",
    lessonId,
    "topics",
  );
  const topicsSnap = await getDocs(topicsRef);

  for (const topicDoc of topicsSnap.docs) {
    const tId = topicDoc.id;
    const has = await topicHasAnyQuestion(userId, lessonId, tId);
    if (has) return true; // ✅ ilk bulduğunda çık
  }
  return false;
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

  answers: Array<
    | {
        id: string;
        kind: "choice";
        choice?: ChoiceKey;
        options?: ChoiceOption[];
        explanation?: string;
      }
    | {
        id: string;
        kind: "photo";
        imageUri?: string;
        explanation?: string;
      }
    | {
        id: string;
        kind: "text";
        text?: string;
        explanation?: string;
      }
  >;
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
  // ✅ en az 1, max 3 kart
  if (answers.length < 1) throw new Error("En az 1 çözüm kartı olmalı.");
  if (answers.length > 3) throw new Error("En fazla 3 çözüm ekleyebilirsin.");

  for (const a of answers) {
    if (a.kind !== "choice") continue;

    const normalizedOptions =
      a.options?.map((opt) => ({
        key: opt.key,
        text: opt.text.trim(),
      })) ?? [];

    if (normalizedOptions.some((opt) => !opt.text)) {
      throw new Error("Şıklı çözüm için tüm şık metinlerini doldurun.");
    }

    if (normalizedOptions.length > 0 && !a.choice) {
      throw new Error("Doğru şıkkı seçin.");
    }
  }

  // ✅ sadece "dolu" cevapları dikkate al
  const providedAnswers = answers.filter((a) => {
    if (a.kind === "choice") {
      const optionCount =
        a.options?.filter((opt) => opt.text?.trim().length).length ?? 0;
      return optionCount === 5;
    }
    if (a.kind === "photo") return !!a.imageUri;
    return !!a.text?.trim();
  });

  // ✅ en az 1 dolu çözüm
  if (providedAnswers.length < 1) {
    throw new Error("En az 1 çözüm eklemelisin (Şıklı / Görsel / Metin).");
  }

  // ✅ text limit (istersen)
  for (const a of providedAnswers) {
    if (a.kind === "choice") {
      if (!a.choice) {
        throw new Error("Doğru şıkkı seçin.");
      }

      const normalizedOptions =
        a.options?.map((opt) => ({
          key: opt.key,
          text: opt.text.trim(),
        })) ?? [];

      if (normalizedOptions.length !== 5 || normalizedOptions.some((opt) => !opt.text)) {
        throw new Error("Şıklı çözüm için tüm şık metinlerini doldurun.");
      }
    }

    if (a.kind === "text" && (a.text?.length ?? 0) > 200) {
      throw new Error("Metin çözüm 200 karakteri geçemez.");
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

  for (const a of providedAnswers) {
    if (a.kind === "photo") {
      // burada imageUri garanti var
      const img = await uploadImageUri(userId, a.imageUri!, "answers");
      const obj: any = { id: a.id, kind: "photo", image: img };

      const exp = a.explanation?.trim();
      if (exp) obj.explanation = exp;

      uploadedAnswers.push(obj);
      continue;
    }

    if (a.kind === "choice") {
      const obj: any = {
        id: a.id,
        kind: "choice",
        choice: a.choice,
        options:
          a.options?.map((opt) => ({
            key: opt.key,
            text: opt.text.trim(),
          })) ?? [],
      };

      const exp = a.explanation?.trim();
      if (exp) obj.explanation = exp;

      uploadedAnswers.push(obj);
      continue;
    }

    // text
    const obj: any = { id: a.id, kind: "text", text: a.text!.trim() };

    const exp = a.explanation?.trim();
    if (exp) obj.explanation = exp;

    uploadedAnswers.push(obj);
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

  // ✅ attempts cleanup (best effort)
  try {
    const attemptsQ = query(
      collection(db, "users", userId, "attempts"),
      where("questionId", "==", questionId),
      limit(450),
    );

    // büyükse parça parça sil
    while (true) {
      const snap = await getDocs(attemptsQ);
      if (snap.empty) break;

      const b = writeBatch(db);
      snap.docs.forEach((d) => b.delete(d.ref));
      await b.commit();

      // 450'dan fazla varsa döngü devam eder
      if (snap.size < 450) break;
    }
  } catch (e) {
    console.log("Attempts cleanup failed:", e);
  }

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

/** ------------------------------- * V3 types (service input) * ------------------------------- */

type RemoteImage = { url: string; path: string };

type UpdateDraftQuestion =
  | { kind: "photo"; imageUri?: string; image?: RemoteImage }
  | { kind: "text"; text: string };

type UpdateDraftAnswer =
  | {
      id: string;
      kind: "choice";
      choice?: ChoiceKey;
      options?: ChoiceOption[];
      explanation?: string;
    }
  | {
      id: string;
      kind: "photo";
      imageUri?: string;
      image?: RemoteImage;
      explanation?: string;
    }
  | {
      id: string;
      kind: "text";
      text?: string;
      explanation?: string;
    };

async function safeDeleteStoragePath(path?: string | null) {
  if (!path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch (e) {
    console.log("Storage delete failed:", path, e);
  }
}

export async function updateQuestionV3(params: {
  userId: string;
  questionId: string;

  oldLessonId: string;
  oldTopicId: string;

  lesson: string;
  topic: string;

  question: UpdateDraftQuestion;
  answers: UpdateDraftAnswer[];
}) {
  const { userId, questionId, oldLessonId, oldTopicId } = params;

  const lessonInput = params.lesson.trim();
  const topicInput = params.topic.trim();
  if (!lessonInput) throw new Error("Ders boş olamaz.");
  if (!topicInput) throw new Error("Konu boş olamaz.");

  // ✅ Validasyon - soru
  if (params.question.kind === "photo") {
    const hasNew = !!params.question.imageUri;
    const hasOld = !!params.question.image;
    if (!hasNew && !hasOld) throw new Error("Soru fotoğrafı seçilmedi.");
  } else {
    if (!params.question.text?.trim())
      throw new Error("Soru metni boş olamaz.");
  }

  // ✅ Validasyon - cevaplar
  const answers = params.answers ?? [];
  if (answers.length < 1) throw new Error("En az 1 çözüm kartı olmalı.");
  if (answers.length > 3) throw new Error("En fazla 3 çözüm ekleyebilirsin.");

  for (const a of answers) {
    if (a.kind !== "choice") continue;

    const normalizedOptions =
      a.options?.map((opt) => ({
        key: opt.key,
        text: opt.text.trim(),
      })) ?? [];

    if (normalizedOptions.some((opt) => !opt.text)) {
      throw new Error("Şıklı çözüm için tüm şık metinlerini doldurun.");
    }

    if (normalizedOptions.length > 0 && !a.choice) {
      throw new Error("Doğru şıkkı seçin.");
    }
  }

  const providedAnswers = answers.filter((a) => {
    if (a.kind === "choice") {
      const optionCount =
        a.options?.filter((opt) => opt.text?.trim().length).length ?? 0;
      return optionCount === 5;
    }
    if (a.kind === "photo") return !!a.imageUri || !!a.image;
    return !!a.text?.trim();
  });

  if (providedAnswers.length < 1) {
    throw new Error("En az 1 çözüm eklemelisin (Şıklı / Görsel / Metin).");
  }

  for (const a of providedAnswers) {
    if (a.kind === "choice") {
      if (!a.choice) {
        throw new Error("Doğru şıkkı seçin.");
      }

      const normalizedOptions =
        a.options?.map((opt) => ({
          key: opt.key,
          text: opt.text.trim(),
        })) ?? [];

      if (normalizedOptions.length !== 5 || normalizedOptions.some((opt) => !opt.text)) {
        throw new Error("Şıklı çözüm için tüm şık metinlerini doldurun.");
      }
    }

    if (a.kind === "text" && (a.text?.length ?? 0) > 200) {
      throw new Error("Metin çözüm 200 karakteri geçemez.");
    }
  }

  console.log("[SVC] ENTER updateQuestionV3 ✅", {
    userId,
    questionId,
    oldLessonId,
    oldTopicId,
  });

  // 1) oldRef + oldData
  const oldRef = questionDoc(userId, oldLessonId, oldTopicId, questionId);
  console.log("[SVC] fetching old question:", oldRef.path);

  const oldSnap = await getDoc(oldRef);
  if (!oldSnap.exists()) throw new Error("Soru bulunamadı (oldRef).");
  const oldData = oldSnap.data() as Question;

  // 2) ensure new lesson/topic
  const { lessonId: newLessonId } = await ensureLesson(userId, lessonInput);
  const { topicId: newTopicId } = await ensureTopic(
    userId,
    newLessonId,
    topicInput,
  );

  const moved = oldLessonId !== newLessonId || oldTopicId !== newTopicId;

  // 3) eski storage path’leri yakala (soru + cevaplar)
  const pathsToDeleteAfterCommit: string[] = [];

  const oldQuestionPhotoPath =
    oldData?.question?.kind === "photo"
      ? (oldData.question.image?.path ?? null)
      : ((oldData as any)?.questionImage?.path ??
        (oldData as any)?.imagePath ??
        null);

  const oldAnswers = (oldData as any)?.answers ?? [];
  const oldAnswerPhotoById = new Map<string, string>();
  for (const oa of oldAnswers) {
    if (oa?.kind === "photo" && oa?.image?.path) {
      oldAnswerPhotoById.set(String(oa.id), oa.image.path);
    }
  }

  // 4) question payload
  let newQuestionPayload: any;

  if (params.question.kind === "photo") {
    if (params.question.imageUri) {
      const img = await uploadImageUri(
        userId,
        params.question.imageUri,
        "questions",
      );
      newQuestionPayload = { kind: "photo", image: img };

      // eski soru foto varsa, commit’ten sonra sil
      if (oldQuestionPhotoPath)
        pathsToDeleteAfterCommit.push(oldQuestionPhotoPath);
    } else if (params.question.image) {
      newQuestionPayload = { kind: "photo", image: params.question.image };
    } else {
      throw new Error("Soru fotoğrafı eksik.");
    }
  } else {
    newQuestionPayload = { kind: "text", text: params.question.text.trim() };

    // eğer eskiden photo ise, commit’ten sonra eski foto sil
    if (oldQuestionPhotoPath)
      pathsToDeleteAfterCommit.push(oldQuestionPhotoPath);
  }

  // 5) answers payload
  const newAnswersPayload: any[] = [];
  const newIds = new Set<string>();

  for (const a of providedAnswers) {
    newIds.add(String(a.id));

    if (a.kind === "photo") {
      if (a.imageUri) {
        const up = await uploadImageUri(userId, a.imageUri, "answers");
        newAnswersPayload.push({
          id: a.id,
          kind: "photo",
          image: up,
          ...(a.explanation?.trim()
            ? { explanation: a.explanation.trim() }
            : {}),
        });

        // bu id eskiden photo ise, commit’ten sonra eskiyi sil
        const oldPath = oldAnswerPhotoById.get(String(a.id));
        if (oldPath) pathsToDeleteAfterCommit.push(oldPath);
      } else {
        const existing =
          (a as any).image ??
          (oldAnswers.find((x: any) => String(x.id) === String(a.id)) as any)
            ?.image;

        if (!existing?.path)
          throw new Error(`Çözüm görseli bulunamadı (id=${a.id}).`);

        newAnswersPayload.push({
          id: a.id,
          kind: "photo",
          image: existing,
          ...(a.explanation?.trim()
            ? { explanation: a.explanation.trim() }
            : {}),
        });
      }
      continue;
    }

    if (a.kind === "choice") {
      // eskiden photo id’siyse commit’ten sonra sil
      const oldPath = oldAnswerPhotoById.get(String(a.id));
      if (oldPath) pathsToDeleteAfterCommit.push(oldPath);

      newAnswersPayload.push({
        id: a.id,
        kind: "choice",
        choice: a.choice,
        options:
          a.options?.map((opt) => ({
            key: opt.key,
            text: opt.text.trim(),
          })) ?? [],
        ...(a.explanation?.trim() ? { explanation: a.explanation.trim() } : {}),
      });
      continue;
    }

    // text
    const oldPath = oldAnswerPhotoById.get(String(a.id));
    if (oldPath) pathsToDeleteAfterCommit.push(oldPath);

    newAnswersPayload.push({
      id: a.id,
      kind: "text",
      text: a.text?.trim(),
      ...(a.explanation?.trim() ? { explanation: a.explanation.trim() } : {}),
    });
  }

  // 6) tamamen silinen answer id’lerinin eski fotoğrafları
  for (const [oldId, oldPath] of oldAnswerPhotoById.entries()) {
    if (!newIds.has(oldId)) pathsToDeleteAfterCommit.push(oldPath);
  }

  // 7) newDocData (undefined yok!)
  // deleteField burada kullanılmayacak (set merge:false var)
  // legacy alanları silmeyi batch.update ile yapacağız.
  const newDocData: any = {
    ...oldData, // metrics vb kalsın
    id: questionId,
    lessonId: newLessonId,
    topicId: newTopicId,

    question: newQuestionPayload,
    answers: newAnswersPayload,

    createdAt: oldData.createdAt,
    updatedAt: serverTimestamp(),

    userId,
  };

  // 8) batch commit
  const batch = writeBatch(db);

  const newRef = doc(questionsCol(userId, newLessonId, newTopicId), questionId);

  if (moved) {
    batch.set(newRef, newDocData, { merge: false });
    batch.delete(oldRef);

    // counter - old
    batch.update(topicDoc(userId, oldLessonId, oldTopicId), {
      questionCount: increment(-1),
      updatedAt: serverTimestamp(),
    });
    batch.update(lessonDoc(userId, oldLessonId), {
      questionCount: increment(-1),
      updatedAt: serverTimestamp(),
    });

    // counter + new
    batch.update(topicDoc(userId, newLessonId, newTopicId), {
      questionCount: increment(1),
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });
    batch.update(lessonDoc(userId, newLessonId), {
      questionCount: increment(1),
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });

    // ✅ legacy alanları yeni doc üstünden sil
    batch.update(newRef, {
      questionImage: deleteField(),
      imageUrl: deleteField(),
      imagePath: deleteField(),
    });
  } else {
    batch.set(oldRef, newDocData, { merge: false });

    batch.update(topicDoc(userId, newLessonId, newTopicId), {
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });
    batch.update(lessonDoc(userId, newLessonId), {
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });

    // ✅ legacy alanları aynı doc üstünden sil
    batch.update(oldRef, {
      questionImage: deleteField(),
      imageUrl: deleteField(),
      imagePath: deleteField(),
    });
  }

  await batch.commit();

  // 9) Storage delete (commit sonrası, best effort)
  // duplicate path varsa tekrarlı silmesin diye:
  const uniqPaths = Array.from(new Set(pathsToDeleteAfterCommit)).filter(
    Boolean,
  );
  for (const p of uniqPaths) {
    await safeDeleteStoragePath(p);
  }

  // 10) moved ise cleanup + lastActivity
  if (moved) {
    const oldTopicSnap = await getDoc(
      topicDoc(userId, oldLessonId, oldTopicId),
    );
    if (oldTopicSnap.exists()) {
      const t = oldTopicSnap.data() as Topic;
      if ((t.questionCount ?? 0) <= 0) {
        const b2 = writeBatch(db);
        b2.delete(topicDoc(userId, oldLessonId, oldTopicId));
        b2.update(lessonDoc(userId, oldLessonId), {
          topicCount: increment(-1),
          updatedAt: serverTimestamp(),
        });
        await b2.commit();
      }
    }

    const oldLessonSnap = await getDoc(lessonDoc(userId, oldLessonId));
    if (oldLessonSnap.exists()) {
      const l = oldLessonSnap.data() as Lesson;
      const qc = l.questionCount ?? 0;
      const tc = l.topicCount ?? 0;
      if (qc <= 0 && tc <= 0) {
        await deleteDoc(lessonDoc(userId, oldLessonId));
      }
    }

    await recomputeLastActivity(userId, oldLessonId, oldTopicId);
    await recomputeLastActivity(userId, newLessonId, newTopicId);
  }

  return { moved, newLessonId, newTopicId, questionId };
}
