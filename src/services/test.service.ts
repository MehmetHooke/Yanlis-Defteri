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

// --------------------- / MOD 2 / -------------------------------

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniqueById(qs: Question[]) {
  const seen = new Set<string>();
  const out: Question[] = [];
  for (const q of qs) {
    if (!seen.has(q.id)) {
      seen.add(q.id);
      out.push(q);
    }
  }
  return out;
}

function getStats(q: Question) {
  const unsolved = q.unsolvedCount ?? 0;
  const solved = q.solvedCount ?? 0;
  const attempts = unsolved + solved;
  const successRate = attempts > 0 ? solved / attempts : null; // null => hiç attempt yok
  return { unsolved, solved, attempts, successRate };
}

/**
 * Mod2 (Karma Tekrar):
 * - 2 zayıf + 2 orta + 1 güçlü
 * - Amaç: toparlama + moral
 */
export async function getMod2MixedQuestions(params: {
  takeWeak?: number;
  takeMedium?: number;
  takeStrong?: number;
  poolLimit?: number;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const takeWeak = params.takeWeak ?? 2;
  const takeMedium = params.takeMedium ?? 2;
  const takeStrong = params.takeStrong ?? 1;
  const takeTotal = takeWeak + takeMedium + takeStrong;

  const poolLimit = params.poolLimit ?? 180;

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

  if (!pool.length) return [];

  // 3) bucketla
  const weak: Question[] = [];
  const medium: Question[] = [];
  const strong: Question[] = [];

  for (const q of pool) {
    const { attempts, successRate, unsolved } = getStats(q);

    // hiç attempt yoksa: orta (yeni soru = nötr)
    if (!attempts || successRate === null) {
      medium.push(q);
      continue;
    }

    // zayıf: başarı < 40%  (unsolved da yüksekse daha zayıf)
    if (successRate < 0.4) {
      weak.push(q);
      continue;
    }

    // güçlü: başarı > 70%
    if (successRate > 0.7) {
      strong.push(q);
      continue;
    }

    // geri kalan: orta
    medium.push(q);
  }

  // 4) zayıfları kendi içinde daha “zayıf” öncelikle (unsolved yüksek)
  const weakSorted = [...weak].sort(
    (a, b) => (b.unsolvedCount ?? 0) - (a.unsolvedCount ?? 0),
  );
  // güçlüleri kendi içinde daha “güçlü” öncelikle (success yüksek)
  const strongSorted = [...strong].sort((a, b) => {
    const sa = getStats(a).successRate ?? 0;
    const sb = getStats(b).successRate ?? 0;
    return sb - sa;
  });

  const pickWeak = shuffle(weakSorted).slice(0, takeWeak);
  const pickMedium = shuffle(medium).slice(0, takeMedium);
  const pickStrong = shuffle(strongSorted).slice(0, takeStrong);

  let selected = uniqueById([...pickWeak, ...pickMedium, ...pickStrong]);

  // 5) fallback: kategori eksikse havuzdan tamamla
  if (selected.length < takeTotal) {
    const rest = shuffle(pool).filter(
      (q) => !selected.some((s) => s.id === q.id),
    );
    selected = uniqueById([...selected, ...rest]).slice(0, takeTotal);
  }

  // 6) ekranda karışık gelsin
  return shuffle(selected);
}
