// src/services/test.service.ts
import { auth, db } from "@/src/lib/firebase";
import type { Question } from "@/src/types/question";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

function lessonsCol(uid: string) {
  return collection(db, "users", uid, "lessons");
}
function topicsCol(uid: string, lessonId: string) {
  return collection(db, "users", uid, "lessons", lessonId, "topics");
}
function questionsCol(uid: string, lessonId: string, topicId: string) {
  return collection(
    db,
    "users",
    uid,
    "lessons",
    lessonId,
    "topics",
    topicId,
    "questions",
  );
}

/**
 * Mod1 (MVP):
 * - user path'inden soruları topla
 * - unsolvedCount yüksek olanlardan seç
 */
export async function getMod1WeakQuestions(params: {
  take?: number;
  poolLimit?: number; // toplam okunacak soru üst limiti (performans)
}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const take = params.take ?? 5;
  const poolLimit = params.poolLimit ?? 120;

  // 1) lessons (en aktiften)
  const lSnap = await getDocs(
    query(lessonsCol(user.uid), orderBy("lastActivityAt", "desc")),
  );
  const lessonIds = lSnap.docs.map((d) => d.id);

  const pool: Question[] = [];

  // 2) lesson -> topics -> questions
  for (const lessonId of lessonIds) {
    const tSnap = await getDocs(
      query(topicsCol(user.uid, lessonId), orderBy("lastActivityAt", "desc")),
    );
    const topicIds = tSnap.docs.map((d) => d.id);

    for (const topicId of topicIds) {
      const qSnap = await getDocs(
        query(
          questionsCol(user.uid, lessonId, topicId),
          orderBy("createdAt", "desc"),
        ),
      );

      for (const d of qSnap.docs) {
        pool.push({ ...(d.data() as any), id: d.id } as Question);
        if (pool.length >= poolLimit) break;
      }
      if (pool.length >= poolLimit) break;
    }
    if (pool.length >= poolLimit) break;
  }

  // 3) sadece attempt görmüş olanları öne al (unsolvedCount/solvedCount yoksa 0 say)
  const sorted = pool
    .map((q: any) => ({
      q,
      unsolved: q.unsolvedCount ?? 0,
      solved: q.solvedCount ?? 0,
      attempts: (q.unsolvedCount ?? 0) + (q.solvedCount ?? 0),
    }))
    .sort((a, b) => {
      // önce attempts olanlar, sonra unsolved yüksek
      if (a.attempts === 0 && b.attempts > 0) return 1;
      if (b.attempts === 0 && a.attempts > 0) return -1;
      return b.unsolved - a.unsolved;
    })
    .map((x) => x.q)
    .slice(0, take);

  return sorted;
}
