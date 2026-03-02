// src/services/test.service.ts
import { auth, db } from "@/src/lib/firebase";
import type { Question } from "@/src/types/question";
import {
    collectionGroup,
    getDocs,
    limit,
    orderBy,
    query,
    where,
} from "firebase/firestore";

/**
 * Mod1 (Zayıf Nokta Testi) — MVP:
 * - En yüksek unsolvedCount'a göre soruları getir
 * - (solved+unsolved) olanlarda başarı oranını hesapla
 * - Aynı topic'ten aşırı yığılmayı engelle (max 2 tane / topic)
 */
export async function getMod1WeakQuestions(params?: {
  take?: number; // testte kaç soru olsun
  poolLimit?: number; // havuzdan kaç soru çekelim
  minAttempts?: number; // min solved+unsolved
}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const take = params?.take ?? 5;
  const poolLimit = params?.poolLimit ?? 40;
  const minAttempts = params?.minAttempts ?? 1;

  // 🔥 collectionGroup: users/*/lessons/*/topics/*/questions/*
  // Sadece bu kullanıcıya ait question doc'lar:
  const q = query(
    collectionGroup(db, "questions"),
    where("userId", "==", user.uid),
    orderBy("unsolvedCount", "desc"),
    limit(poolLimit),
  );

  const snap = await getDocs(q);

  const pool: Question[] = snap.docs.map((d) => {
    const data = d.data() as any;
    return { ...(data as Question), id: data.id ?? d.id };
  });

  // Score = unsolved / (solved+unsolved), attempts < minAttempts ise zayıflık sayma
  const scored = pool
    .map((q) => {
      const solved = q.solvedCount ?? 0;
      const unsolved = q.unsolvedCount ?? 0;
      const attempts = solved + unsolved;
      const rate = attempts > 0 ? unsolved / attempts : 0;
      return { q, attempts, rate };
    })
    .filter((x) => x.attempts >= minAttempts)
    .sort((a, b) => {
      // önce rate yüksek, eşitse unsolved fazla
      if (b.rate !== a.rate) return b.rate - a.rate;
      return (b.q.unsolvedCount ?? 0) - (a.q.unsolvedCount ?? 0);
    });

  // topic bazlı limit: max 2 soru / topic
  const perTopicCount = new Map<string, number>();
  const selected: Question[] = [];

  for (const item of scored) {
    const topicKey = `${item.q.lessonId}:${item.q.topicId}`;
    const cnt = perTopicCount.get(topicKey) ?? 0;
    if (cnt >= 2) continue;

    selected.push(item.q);
    perTopicCount.set(topicKey, cnt + 1);

    if (selected.length >= take) break;
  }

  // Eğer yeterli soru yoksa, attempt'i olmayanlardan da doldur (MVP fallback)
  if (selected.length < take) {
    for (const q of pool) {
      if (selected.find((s) => s.id === q.id)) continue;
      selected.push(q);
      if (selected.length >= take) break;
    }
  }

  return selected.slice(0, take);
}
