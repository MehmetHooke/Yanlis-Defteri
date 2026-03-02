// src/services/attempt.service.ts
import { auth, db } from "@/src/lib/firebase";
import {
    collection,
    doc,
    increment,
    runTransaction,
    serverTimestamp,
} from "firebase/firestore";

export type AttemptSource = "normal" | "test_mod1" | "test_mod2" | "test_mod3";

export type AttemptResult = "solved" | "unsolved";

export type AttemptDoc = {
  id?: string;
  userId: string;

  questionId: string;
  lessonId: string;
  topicId: string;

  result: AttemptResult;
  createdAt: any;

  hintViewed: boolean;
  answerViewed: boolean;

  source: AttemptSource;
};

function attemptsCol(userId: string) {
  return collection(db, "users", userId, "attempts");
}

function questionRef(
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

export async function addAttemptAndUpdateQuestion(params: {
  lessonId: string;
  topicId: string;
  questionId: string;

  result: AttemptResult;
  hintViewed: boolean;
  answerViewed: boolean;

  source?: AttemptSource;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const source: AttemptSource = params.source ?? "normal";

  const aRef = doc(attemptsCol(user.uid)); // auto id
  const qRef = questionRef(
    user.uid,
    params.lessonId,
    params.topicId,
    params.questionId,
  );

  await runTransaction(db, async (tx) => {
    tx.set(aRef, {
      userId: user.uid,
      questionId: params.questionId,
      lessonId: params.lessonId,
      topicId: params.topicId,
      result: params.result,
      hintViewed: !!params.hintViewed,
      answerViewed: !!params.answerViewed,
      source,
      createdAt: serverTimestamp(),
    } satisfies AttemptDoc);

    tx.update(qRef, {
      solvedCount: params.result === "solved" ? increment(1) : increment(0),
      unsolvedCount: params.result === "unsolved" ? increment(1) : increment(0),
      lastResult: params.result,
      lastAttemptAt: serverTimestamp(),
      lastHintViewed: !!params.hintViewed,
      lastAnswerViewed: !!params.answerViewed,
      updatedAt: serverTimestamp(),
    });
  });

  return { attemptId: aRef.id };
}
