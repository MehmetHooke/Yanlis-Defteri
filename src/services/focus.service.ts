// src/services/focus.service.ts
import { auth, db } from "@/src/lib/firebase";
import type { Question } from "@/src/types/question";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

function lessonsCol(uid: string) {
  return collection(db, "users", uid, "lessons");
}
function lessonDoc(uid: string, lessonId: string) {
  return doc(db, "users", uid, "lessons", lessonId);
}
function topicsCol(uid: string, lessonId: string) {
  return collection(db, "users", uid, "lessons", lessonId, "topics");
}
function topicDoc(uid: string, lessonId: string, topicId: string) {
  return doc(db, "users", uid, "lessons", lessonId, "topics", topicId);
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

type FocusReason =
  | { kind: "successRate"; rate: number; windowDays: number }
  | { kind: "lastResult"; last: "solved" | "unsolved" }
  | { kind: "noRepeat"; days: number }
  | { kind: "starter" };

export type DailyFocusCard = {
  dateKey: string; // YYYY-MM-DD
  lessonId?: string;
  topicId?: string;
  lessonName?: string;
  topicName?: string;

  focusType: "forget_risk" | "weakness" | "starter";
  reason: FocusReason;

  ctaMode: "mod1" | "mod3";

  meta?: {
    daysSinceLastAttempt?: number;
    successRateAll?: number; // MVP: overall rate
    lastResult?: "solved" | "unsolved";
    lastAttemptAt?: string; // ✅ ISO string
  };
};
function yyyyMmDd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toDateSafe(ts: any): Date | null {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (ts instanceof Date) return ts;
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}
function daysSince(d: Date) {
  const ms = Date.now() - d.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

type TopicAgg = {
  lessonId: string;
  topicId: string;

  totalQuestions: number;
  attemptedQuestions: number;

  lastAttemptAt: Date | null;
  lastResult: "solved" | "unsolved" | null;

  solvedAll: number;
  unsolvedAll: number;

  // MVP: overall rate (attempt dokümanı yoksa)
  successRateAll: number | null;

  daysSinceLastAttempt: number | null;
};

async function buildTopicAggPool(
  uid: string,
  poolLimit = 260,
): Promise<TopicAgg[]> {
  const lSnap = await getDocs(
    query(lessonsCol(uid), orderBy("lastActivityAt", "desc")),
  );
  const lessonIds = lSnap.docs.map((d) => d.id);

  const byTopic = new Map<string, TopicAgg>();
  let readCount = 0;

  for (const lessonId of lessonIds) {
    const tSnap = await getDocs(
      query(topicsCol(uid, lessonId), orderBy("lastActivityAt", "desc")),
    );
    const topicIds = tSnap.docs.map((d) => d.id);

    for (const topicId of topicIds) {
      const key = `${lessonId}__${topicId}`;
      if (!byTopic.has(key)) {
        byTopic.set(key, {
          lessonId,
          topicId,
          totalQuestions: 0,
          attemptedQuestions: 0,
          lastAttemptAt: null,
          lastResult: null,
          solvedAll: 0,
          unsolvedAll: 0,
          successRateAll: null,
          daysSinceLastAttempt: null,
        });
      }

      const qSnap = await getDocs(
        query(
          questionsCol(uid, lessonId, topicId),
          orderBy("createdAt", "desc"),
        ),
      );

      for (const d of qSnap.docs) {
        const q = { ...(d.data() as any), id: d.id } as Question;

        const agg = byTopic.get(key)!;
        agg.totalQuestions += 1;

        const solved = q.solvedCount ?? 0;
        const unsolved = q.unsolvedCount ?? 0;
        const attempts = solved + unsolved;

        agg.solvedAll += solved;
        agg.unsolvedAll += unsolved;

        if (attempts > 0) agg.attemptedQuestions += 1;

        const last = toDateSafe((q as any).lastAttemptAt);
        if (last) {
          if (
            !agg.lastAttemptAt ||
            last.getTime() > agg.lastAttemptAt.getTime()
          ) {
            agg.lastAttemptAt = last;
            agg.lastResult = (q as any).lastResult ?? null;
          }
        }

        readCount++;
        if (readCount >= poolLimit) break;
      }

      if (readCount >= poolLimit) break;
    }
    if (readCount >= poolLimit) break;
  }

  const out = Array.from(byTopic.values()).map((a) => {
    const attemptsAll = a.solvedAll + a.unsolvedAll;
    a.successRateAll = attemptsAll > 0 ? a.solvedAll / attemptsAll : null;
    a.daysSinceLastAttempt = a.lastAttemptAt
      ? daysSince(a.lastAttemptAt)
      : null;
    return a;
  });

  return out;
}

async function hydrateNames(uid: string, lessonId: string, topicId: string) {
  const [l, t] = await Promise.all([
    getDoc(lessonDoc(uid, lessonId)),
    getDoc(topicDoc(uid, lessonId, topicId)),
  ]);
  const lessonName =
    (l.exists() ? (l.data() as any)?.name : undefined) ?? undefined;
  const topicName =
    (t.exists() ? (t.data() as any)?.name : undefined) ?? undefined;
  return { lessonName, topicName };
}

/**
 * Günün Odağı:
 * Öncelik:
 * 1) daysSinceLastAttempt >= 10 olan topic varsa -> forget_risk (Mod3)
 * 2) yoksa başarı oranı en düşük topic -> weakness (Mod1)
 * 3) hiç attempt yoksa -> starter (Mod1 öner)
 *
 * Günlük stabil:
 * AsyncStorage: focus_card_v1_{YYYY-MM-DD}
 */
export async function getDailyFocusCard(params?: {
  poolLimit?: number;
}): Promise<DailyFocusCard> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const dateKey = yyyyMmDd();
  const cacheKey = `focus_card_v2_${dateKey}`;

  const cached = await AsyncStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as DailyFocusCard;
    } catch {
      // ignore parse
    }
  }

  const pool = await buildTopicAggPool(user.uid, params?.poolLimit ?? 260);

  const hasAnyAttempt = pool.some((p) => p.solvedAll + p.unsolvedAll > 0);

  // 3) starter
  if (!hasAnyAttempt) {
    const card: DailyFocusCard = {
      dateKey,
      focusType: "starter",
      reason: { kind: "starter" },
      ctaMode: "mod1",
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(card));
    return card;
  }

  // 1) forget risk
  const forgetCandidates = pool
    .filter((p) => p.solvedAll + p.unsolvedAll > 0)
    .filter((p) => (p.daysSinceLastAttempt ?? -1) >= 10)
    .sort(
      (a, b) => (b.daysSinceLastAttempt ?? 0) - (a.daysSinceLastAttempt ?? 0),
    );

  if (forgetCandidates.length) {
    const pick = forgetCandidates[0];
    const names = await hydrateNames(user.uid, pick.lessonId, pick.topicId);

    const card: DailyFocusCard = {
      dateKey,
      lessonId: pick.lessonId,
      topicId: pick.topicId,
      lessonName: names.lessonName,
      topicName: names.topicName,
      focusType: "forget_risk",
      reason: { kind: "noRepeat", days: pick.daysSinceLastAttempt ?? 10 },
      ctaMode: "mod3",
      meta: {
        daysSinceLastAttempt: pick.daysSinceLastAttempt ?? undefined,
        successRateAll: pick.successRateAll ?? undefined,
        lastResult: pick.lastResult ?? undefined,
        lastAttemptAt: pick.lastAttemptAt
          ? pick.lastAttemptAt.toISOString()
          : undefined, // ✅
      },
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(card));
    return card;
  }

  // 2) weakness (MVP: overall rate kullanıyoruz)
  const weakCandidates = pool
    .filter((p) => p.solvedAll + p.unsolvedAll > 0)
    .filter((p) => p.successRateAll !== null)
    .sort((a, b) => (a.successRateAll ?? 1) - (b.successRateAll ?? 1));

  const pick =
    weakCandidates[0] ?? pool.find((p) => p.solvedAll + p.unsolvedAll > 0)!;

  const names = await hydrateNames(user.uid, pick.lessonId, pick.topicId);

  const rate01 = clamp01(pick.successRateAll ?? 0);
  const rate = Math.round(rate01 * 100);

  const lastAttemptIso = pick.lastAttemptAt
    ? pick.lastAttemptAt.toISOString()
    : undefined;

  // ✅ Akıllı kural: zayıf + uzun süredir denenmemiş => Mod3 (unutma riski)
  // - eşikler: rate <= 55 ve daysSince >= 7
  // İstersen bu değerleri sonra oynarız.
  const ds = pick.daysSinceLastAttempt ?? null;
  const shouldSwitchToMod3 = ds !== null && ds >= 7 && rate <= 55;

  if (shouldSwitchToMod3) {
    const card: DailyFocusCard = {
      dateKey,
      lessonId: pick.lessonId,
      topicId: pick.topicId,
      lessonName: names.lessonName,
      topicName: names.topicName,
      focusType: "forget_risk",
      reason: { kind: "noRepeat", days: ds },
      ctaMode: "mod3",
      meta: {
        daysSinceLastAttempt: pick.daysSinceLastAttempt ?? undefined,
        successRateAll: pick.successRateAll ?? undefined,
        lastResult: pick.lastResult ?? undefined,
        lastAttemptAt: lastAttemptIso,
      },
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(card));
    return card;
  }

  // reason: başarı veya son sonuç
  let reason: FocusReason = { kind: "successRate", rate, windowDays: 0 }; // windowDays UI'da artık kullanılmayacak
  if (pick.lastResult === "unsolved") {
    reason = { kind: "lastResult", last: "unsolved" };
  }

  const card: DailyFocusCard = {
    dateKey,
    lessonId: pick.lessonId,
    topicId: pick.topicId,
    lessonName: names.lessonName,
    topicName: names.topicName,
    focusType: "weakness",
    reason,
    ctaMode: "mod1",
    meta: {
      daysSinceLastAttempt: pick.daysSinceLastAttempt ?? undefined,
      successRateAll: pick.successRateAll ?? undefined,
      lastResult: pick.lastResult ?? undefined,
      lastAttemptAt: lastAttemptIso,
    },
  };

  await AsyncStorage.setItem(cacheKey, JSON.stringify(card));
  return card;
}
