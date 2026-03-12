// src/services/test.service.ts
import { auth, db } from "@/src/lib/firebase";
import type { Answer, Question } from "@/src/types/question";
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

// --------------------- / MOD 3 / -------------------------------

function toDateSafe(ts: any): Date | null {
  if (!ts) return null;
  // Firestore Timestamp
  if (typeof ts?.toDate === "function") return ts.toDate();
  // already Date-like
  if (ts instanceof Date) return ts;
  // string/number?
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

function daysSince(d: Date) {
  const ms = Date.now() - d.getTime();
  return ms / (1000 * 60 * 60 * 24);
}

/**
 * Mod3 (Kalıcılık Kontrolü) - ÖNERİLEN MVP:
 * - Öncelik: daha önce "solved" işaretlenmiş VE üzerinden X gün geçmiş sorular
 * - Sırala: daha eski lastAttemptAt > solvedCount yüksek
 * - Yetmezse: attempt görmüş diğer sorulardan tamamla
 */
export async function getMod3RetentionQuestions(params: {
  take?: number;
  poolLimit?: number;
  minDays?: number; // solved sorularda aradan kaç gün geçmiş olmalı
}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const take = params.take ?? 5;
  const poolLimit = params.poolLimit ?? 200;
  const minDays = params.minDays ?? 7; // <- bunu cevabına göre değiştireceğiz

  // 1) lessons
  const lSnap = await getDocs(
    query(lessonsCol(user.uid), orderBy("lastActivityAt", "desc")),
  );
  const lessonIds = lSnap.docs.map((d) => d.id);

  const pool: Question[] = [];

  // 2) pool topla
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

  // 3) adayları çıkar
  const solvedCandidates = pool
    .map((q) => {
      const last = toDateSafe((q as any).lastAttemptAt);
      const ds = last ? daysSince(last) : null;
      const attempts = (q.solvedCount ?? 0) + (q.unsolvedCount ?? 0);
      return { q, last, ds, attempts };
    })
    .filter((x) => x.attempts > 0) // attempt görmüş olsun
    .filter((x) => x.q.lastResult === "solved") // solved son durum
    .filter((x) => (x.ds ?? -1) >= minDays) // üzerinden X gün geçmiş
    .sort((a, b) => {
      // önce daha eski (daysSince büyük), sonra solvedCount büyük
      const d = (b.ds ?? 0) - (a.ds ?? 0);
      if (d !== 0) return d;
      return (b.q.solvedCount ?? 0) - (a.q.solvedCount ?? 0);
    })
    .map((x) => x.q);

  let selected = shuffle(solvedCandidates).slice(0, take);

  // 4) yetmezse fallback: attempt görmüş diğerlerinden tamamla
  if (selected.length < take) {
    const rest = pool
      .map((q) => {
        const attempts = (q.solvedCount ?? 0) + (q.unsolvedCount ?? 0);
        const last = toDateSafe((q as any).lastAttemptAt);
        const ds = last ? daysSince(last) : null;
        return { q, attempts, ds };
      })
      .filter((x) => x.attempts > 0)
      .sort((a, b) => (b.ds ?? 0) - (a.ds ?? 0))
      .map((x) => x.q);

    const fill = rest.filter((q) => !selected.some((s) => s.id === q.id));
    selected = uniqueById([...selected, ...shuffle(fill)]).slice(0, take);
  }

  return shuffle(selected);
}

//-----------------------/ Test Card Quality /------------------------------------

export type TestStats = {
  totalQuestions: number;
  attemptedQuestions: number;
  totalAttempts: number;
  solvedAttempts: number;
  unsolvedAttempts: number;
  qualityScore: number; // 0-100
  status: "empty" | "low" | "ok";
};

export async function getTestStats(params?: {
  poolLimit?: number;
}): Promise<TestStats> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const poolLimit = params?.poolLimit ?? 250;

  const lSnap = await getDocs(
    query(lessonsCol(user.uid), orderBy("lastActivityAt", "desc")),
  );
  const lessonIds = lSnap.docs.map((d) => d.id);

  let totalQuestions = 0;
  let attemptedQuestions = 0;
  let totalAttempts = 0;
  let solvedAttempts = 0;
  let unsolvedAttempts = 0;

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
        const q = { ...(d.data() as any), id: d.id } as Question;

        totalQuestions++;

        const s = q.solvedCount ?? 0;
        const u = q.unsolvedCount ?? 0;
        const attempts = s + u;

        if (attempts > 0) attemptedQuestions++;
        totalAttempts += attempts;
        solvedAttempts += s;
        unsolvedAttempts += u;

        if (totalQuestions >= poolLimit) break;
      }
      if (totalQuestions >= poolLimit) break;
    }
    if (totalQuestions >= poolLimit) break;
  }

  // Basit kalite puanı (MVP):
  // - soru sayısı ve attempt sayısı yükseldikçe artar
  const qScore = Math.min(1, totalQuestions / 30); // 30 soruda 1.0
  const aScore = Math.min(1, totalAttempts / 60); // 60 attemptte 1.0
  const coverage =
    totalQuestions > 0 ? Math.min(1, attemptedQuestions / totalQuestions) : 0;
  const qualityScore = Math.round(
    (qScore * 0.4 + aScore * 0.4 + coverage * 0.2) * 100,
  );

  let status: TestStats["status"] = "ok";
  if (totalQuestions === 0) status = "empty";
  else if (totalQuestions < 10 || totalAttempts < 15) status = "low";

  return {
    totalQuestions,
    attemptedQuestions,
    totalAttempts,
    solvedAttempts,
    unsolvedAttempts,
    qualityScore,
    status,
  };
}

//-----------------------/Günlük kart için yardımcı fonksiyon/---------------------------

export async function getMod1WeakQuestionsForTopic(params: {
  lessonId: string;
  topicId: string;
  take?: number;
  poolLimit?: number;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const take = params.take ?? 5;
  const poolLimit = params.poolLimit ?? 120;

  const pool: Question[] = [];
  const qSnap = await getDocs(
    query(
      collection(
        db,
        "users",
        user.uid,
        "lessons",
        params.lessonId,
        "topics",
        params.topicId,
        "questions",
      ),
      orderBy("createdAt", "desc"),
    ),
  );

  for (const d of qSnap.docs) {
    pool.push({ ...(d.data() as any), id: d.id } as Question);
    if (pool.length >= poolLimit) break;
  }

  const sorted = pool
    .map((q: any) => ({
      q,
      unsolved: q.unsolvedCount ?? 0,
      solved: q.solvedCount ?? 0,
      attempts: (q.unsolvedCount ?? 0) + (q.solvedCount ?? 0),
    }))
    .sort((a, b) => {
      if (a.attempts === 0 && b.attempts > 0) return 1;
      if (b.attempts === 0 && a.attempts > 0) return -1;
      return b.unsolved - a.unsolved;
    })
    .map((x) => x.q);

  // topic içinden al
  let picked = sorted.slice(0, take);

  // yetmezse global mod1’den tamamla
  if (picked.length < take) {
    const rest = await getMod1WeakQuestions({
      take: take - picked.length,
      poolLimit: 120,
    });
    const seen = new Set(picked.map((x) => x.id));
    picked = [...picked, ...rest.filter((x) => !seen.has(x.id))].slice(0, take);
  }

  return picked;
}

export async function getMod3RetentionQuestionsForTopic(params: {
  lessonId: string;
  topicId: string;
  take?: number;
  poolLimit?: number;
  minDays?: number;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const take = params.take ?? 5;
  const poolLimit = params.poolLimit ?? 200;
  const minDays = params.minDays ?? 7;

  const pool: Question[] = [];
  const qSnap = await getDocs(
    query(
      collection(
        db,
        "users",
        user.uid,
        "lessons",
        params.lessonId,
        "topics",
        params.topicId,
        "questions",
      ),
      orderBy("createdAt", "desc"),
    ),
  );

  for (const d of qSnap.docs) {
    pool.push({ ...(d.data() as any), id: d.id } as Question);
    if (pool.length >= poolLimit) break;
  }

  const solvedCandidates = pool
    .map((q) => {
      const last = toDateSafe((q as any).lastAttemptAt);
      const ds = last ? daysSince(last) : null;
      const attempts = (q.solvedCount ?? 0) + (q.unsolvedCount ?? 0);
      return { q, ds, attempts };
    })
    .filter((x) => x.attempts > 0)
    .filter((x) => x.q.lastResult === "solved")
    .filter((x) => (x.ds ?? -1) >= minDays)
    .sort((a, b) => (b.ds ?? 0) - (a.ds ?? 0))
    .map((x) => x.q);

  let picked = solvedCandidates.slice(0, take);

  if (picked.length < take) {
    // fallback global mod3
    const rest = await getMod3RetentionQuestions({
      take: take - picked.length,
      poolLimit: 200,
      minDays,
    });
    const seen = new Set(picked.map((x) => x.id));
    picked = [...picked, ...rest.filter((x) => !seen.has(x.id))].slice(0, take);
  }

  return picked;
}

// --------------------- / MOD 4 / -------------------------------

function getCorrectChoice(q: Question): "A" | "B" | "C" | "D" | "E" | null {
  const choiceAnswer = q.answers?.find(
    (a): a is Extract<Answer, { kind: "choice" }> =>
      a.kind === "choice" && !!a.choice,
  );

  return choiceAnswer?.choice ?? null;
}

function isValidMod4Question(q: Question) {
  return !!getCorrectChoice(q);
}

/**
 * Mod4 (Test Sınavı):
 * - sadece doğru şıkkı tanımlanmış choice soruları alır
 * - havuzdan rastgele 5 soru seçer
 */
export async function getMod4ChoiceQuestions(params?: {
  take?: number;
  poolLimit?: number;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const take = params?.take ?? 5;
  const poolLimit = params?.poolLimit ?? 220;

  const lSnap = await getDocs(
    query(lessonsCol(user.uid), orderBy("lastActivityAt", "desc")),
  );
  const lessonIds = lSnap.docs.map((d) => d.id);

  const pool: Question[] = [];

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
        const q = { ...(d.data() as any), id: d.id } as Question;

        if (isValidMod4Question(q)) {
          pool.push(q);
        }

        if (pool.length >= poolLimit) break;
      }

      if (pool.length >= poolLimit) break;
    }

    if (pool.length >= poolLimit) break;
  }

  if (pool.length < take) return [];

  return shuffle(pool).slice(0, take);
}
