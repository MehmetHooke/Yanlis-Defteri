import { auth, db } from "@/src/lib/firebase";
import type { Question } from "@/src/types/question";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniqueByQuestionId(items: DailyReviewItem[]) {
  const seen = new Set<string>();
  const out: DailyReviewItem[] = [];

  for (const item of items) {
    if (seen.has(item.question.id)) continue;
    seen.add(item.question.id);
    out.push(item);
  }

  return out;
}

type PickReason = "weak" | "retention" | "fresh";

export type DailyReviewStreak = {
  current: number;
  best: number;
  lastCompletedDate?: string;
};

export type DailyReviewItem = {
  question: Question;
  lessonName?: string;
  topicName?: string;
  reason: PickReason;
  reasonLabel: string;
};

export type DailyReviewPlan = {
  dateKey: string;
  targetCount: number;
  items: DailyReviewItem[];
  counts: {
    weak: number;
    retention: number;
    fresh: number;
  };
  completed: boolean;
  streak: DailyReviewStreak;
};

type QuestionPoolItem = {
  question: Question;
  lessonName?: string;
  topicName?: string;
  attempts: number;
  solved: number;
  unsolved: number;
  successRate: number | null;
  daysSinceLastAttempt: number | null;
  isFresh: boolean;
};

async function loadQuestionPool(
  uid: string,
  poolLimit: number,
): Promise<QuestionPoolItem[]> {
  const lessonSnap = await getDocs(
    query(lessonsCol(uid), orderBy("lastActivityAt", "desc")),
  );

  const lessonNameById = new Map<string, string>();
  for (const d of lessonSnap.docs) {
    lessonNameById.set(d.id, ((d.data() as any)?.name ?? "") as string);
  }

  const out: QuestionPoolItem[] = [];

  for (const lesson of lessonSnap.docs) {
    const lessonId = lesson.id;
    const topicSnap = await getDocs(
      query(topicsCol(uid, lessonId), orderBy("lastActivityAt", "desc")),
    );

    const topicNameById = new Map<string, string>();
    for (const t of topicSnap.docs) {
      topicNameById.set(t.id, ((t.data() as any)?.name ?? "") as string);
    }

    for (const topic of topicSnap.docs) {
      const topicId = topic.id;
      const qSnap = await getDocs(
        query(
          questionsCol(uid, lessonId, topicId),
          orderBy("createdAt", "desc"),
        ),
      );

      for (const d of qSnap.docs) {
        const question = { ...(d.data() as any), id: d.id } as Question;
        const solved = question.solvedCount ?? 0;
        const unsolved = question.unsolvedCount ?? 0;
        const attempts = solved + unsolved;
        const lastAttempt = toDateSafe(question.lastAttemptAt);

        out.push({
          question,
          lessonName: lessonNameById.get(lessonId) || undefined,
          topicName: topicNameById.get(topicId) || undefined,
          attempts,
          solved,
          unsolved,
          successRate: attempts > 0 ? solved / attempts : null,
          daysSinceLastAttempt: lastAttempt ? daysSince(lastAttempt) : null,
          isFresh: attempts === 0,
        });

        if (out.length >= poolLimit) return out;
      }
    }
  }

  return out;
}

function buildDailyItems(pool: QuestionPoolItem[], targetCount: number) {
  const weak = pool
    .filter((x) => x.attempts > 0)
    .sort((a, b) => {
      if ((b.unsolved ?? 0) !== (a.unsolved ?? 0)) {
        return (b.unsolved ?? 0) - (a.unsolved ?? 0);
      }
      return (a.successRate ?? 1) - (b.successRate ?? 1);
    })
    .slice(0, Math.max(4, targetCount));

  const retention = pool
    .filter((x) => x.attempts > 0)
    .filter((x) => (x.daysSinceLastAttempt ?? -1) >= 5)
    .sort(
      (a, b) => (b.daysSinceLastAttempt ?? 0) - (a.daysSinceLastAttempt ?? 0),
    )
    .slice(0, Math.max(4, targetCount));

  const fresh = pool
    .filter((x) => x.isFresh)
    .sort((a, b) => {
      const aCreated = toDateSafe(a.question.createdAt)?.getTime() ?? 0;
      const bCreated = toDateSafe(b.question.createdAt)?.getTime() ?? 0;
      return bCreated - aCreated;
    })
    .slice(0, Math.max(4, targetCount));

  const selected = uniqueByQuestionId(
    [
      ...shuffle(weak).slice(0, Math.min(2, targetCount)),
      ...shuffle(retention).slice(0, Math.min(2, targetCount)),
      ...shuffle(fresh).slice(0, Math.min(1, targetCount)),
    ].map((x) => ({
      question: x.question,
      lessonName: x.lessonName,
      topicName: x.topicName,
      reason: "weak" as PickReason,
      reasonLabel: "",
    })),
  );

  const pickedIds = new Set<string>(selected.map((x) => x.question.id));

  const pickedWithReasons: DailyReviewItem[] = [
    ...selected.map((item) => item),
  ];

  for (const item of pickedWithReasons) {
    const inWeak = weak.some((x) => x.question.id === item.question.id);
    const inRetention = retention.some(
      (x) => x.question.id === item.question.id,
    );
    const inFresh = fresh.some((x) => x.question.id === item.question.id);

    if (inRetention) {
      item.reason = "retention";
      item.reasonLabel = "Uzun süredir tekrar edilmedi";
    } else if (inWeak) {
      item.reason = "weak";
      item.reasonLabel = "Zorlandiğin soru";
    } else if (inFresh) {
      item.reason = "fresh";
      item.reasonLabel = "Yeni eklenen soru";
    } else {
      item.reason = "weak";
      item.reasonLabel = "Bugun için seçildi";
    }
  }

  if (pickedWithReasons.length < targetCount) {
    const fallback = pool
      .slice()
      .sort((a, b) => {
        const scoreA =
          (a.unsolved ?? 0) * 4 +
          (a.daysSinceLastAttempt ?? 0) * 2 +
          (a.isFresh ? 3 : 0);
        const scoreB =
          (b.unsolved ?? 0) * 4 +
          (b.daysSinceLastAttempt ?? 0) * 2 +
          (b.isFresh ? 3 : 0);
        return scoreB - scoreA;
      })
      .filter((x) => !pickedIds.has(x.question.id));

    for (const x of fallback) {
      if (pickedWithReasons.length >= targetCount) break;
      pickedWithReasons.push({
        question: x.question,
        lessonName: x.lessonName,
        topicName: x.topicName,
        reason: x.isFresh
          ? "fresh"
          : (x.daysSinceLastAttempt ?? 0) >= 5
            ? "retention"
            : "weak",
        reasonLabel: x.isFresh
          ? "Yeni eklenen soru"
          : (x.daysSinceLastAttempt ?? 0) >= 5
            ? "Tekrar zamani geldi"
            : "Zorlandığın soru",
      });
      pickedIds.add(x.question.id);
    }
  }

  return pickedWithReasons.slice(0, targetCount);
}

function buildPlanFromItems(
  dateKey: string,
  targetCount: number,
  items: DailyReviewItem[],
  completed: boolean,
  streak: DailyReviewStreak,
): DailyReviewPlan {
  return {
    dateKey,
    targetCount,
    items,
    counts: {
      weak: items.filter((x) => x.reason === "weak").length,
      retention: items.filter((x) => x.reason === "retention").length,
      fresh: items.filter((x) => x.reason === "fresh").length,
    },
    completed,
    streak,
  };
}

function addDays(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + amount);
  return yyyyMmDd(d);
}

async function getStoredStreak(): Promise<DailyReviewStreak> {
  const raw = await AsyncStorage.getItem("daily_review_streak_v1");
  if (!raw) return { current: 0, best: 0 };

  try {
    const parsed = JSON.parse(raw) as DailyReviewStreak;
    return {
      current: Number(parsed.current ?? 0),
      best: Number(parsed.best ?? 0),
      lastCompletedDate: parsed.lastCompletedDate,
    };
  } catch {
    return { current: 0, best: 0 };
  }
}

async function saveStoredStreak(streak: DailyReviewStreak) {
  await AsyncStorage.setItem(
    "daily_review_streak_v1",
    JSON.stringify(streak),
  );
}

export async function getDailyReviewPlan(params?: {
  take?: number;
  poolLimit?: number;
  forceRefresh?: boolean;
}): Promise<DailyReviewPlan> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const dateKey = yyyyMmDd();
  const targetCount = params?.take ?? 5;
  const planKey = `daily_review_plan_v1_${dateKey}`;
  const doneKey = `daily_review_done_v1_${dateKey}`;

  const completed = (await AsyncStorage.getItem(doneKey)) === "1";
  const streak = await getStoredStreak();

  if (!params?.forceRefresh) {
    const cached = await AsyncStorage.getItem(planKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Omit<
          DailyReviewPlan,
          "completed" | "streak"
        >;
        return { ...parsed, completed, streak };
      } catch {
        // ignore broken cache
      }
    }
  }

  const pool = await loadQuestionPool(user.uid, params?.poolLimit ?? 280);
  const items = buildDailyItems(pool, targetCount);
  const plan = buildPlanFromItems(
    dateKey,
    targetCount,
    items,
    completed,
    streak,
  );

  await AsyncStorage.setItem(
    planKey,
    JSON.stringify({
      dateKey: plan.dateKey,
      targetCount: plan.targetCount,
      items: plan.items,
      counts: plan.counts,
    }),
  );

  return plan;
}

export async function markDailyReviewCompleted() {
  const dateKey = yyyyMmDd();
  await AsyncStorage.setItem(`daily_review_done_v1_${dateKey}`, "1");
  const streak = await getStoredStreak();

  if (streak.lastCompletedDate === dateKey) {
    return streak;
  }

  const yesterdayKey = addDays(dateKey, -1);
  const nextCurrent =
    streak.lastCompletedDate === yesterdayKey ? streak.current + 1 : 1;

  const nextStreak: DailyReviewStreak = {
    current: nextCurrent,
    best: Math.max(streak.best, nextCurrent),
    lastCompletedDate: dateKey,
  };

  await saveStoredStreak(nextStreak);
  return nextStreak;
}

export async function getDailyReviewCompleted() {
  const dateKey = yyyyMmDd();
  return (
    (await AsyncStorage.getItem(`daily_review_done_v1_${dateKey}`)) === "1"
  );
}

export async function getDailyReviewStreak() {
  return getStoredStreak();
}
