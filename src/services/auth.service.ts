// src/services/auth.service.ts
import { auth, db } from "@/src/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

export async function register(args: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  const { email, password, firstName, lastName } = args;

  const cred = await createUserWithEmailAndPassword(auth, email, password);

  // İsteğe bağlı: Firebase Auth displayName
  await updateProfile(cred.user, {
    displayName: `${firstName} ${lastName}`.trim(),
  });

  // Firestore user doc
  await setDoc(doc(db, "users", cred.user.uid), {
    uid: cred.user.uid,
    firstName,
    lastName,
    email,
    createdAt: serverTimestamp(),
  });

  return cred.user;
}

export async function login(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}
