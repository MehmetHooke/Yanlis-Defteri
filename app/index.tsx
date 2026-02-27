import { auth } from "@/src/lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

const ONBOARDING_DONE_KEY = "onboarding_done_v1";

export default function Index() {
  const [checking, setChecking] = useState(true);
  const routedRef = useRef(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    (async () => {
      try {
        // 1) Onboarding
        const done = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);

        if (done !== "1") {
          if (!routedRef.current) {
            routedRef.current = true;
            router.replace("/onboarding");
          }
          setChecking(false);
          return;
        }

        // 2) Auth state
        unsub = onAuthStateChanged(auth, (user) => {
          console.log("AUTH USER:", user?.uid ?? "null");
          if (routedRef.current) return;

          routedRef.current = true;
          router.replace(user ? "/(tabs)" : "/(auth)/login");
          setChecking(false);
        });
      } catch (e) {
        console.log("Index boot error:", e);
        if (!routedRef.current) {
          routedRef.current = true;
          router.replace("/(auth)/login");
        }
        setChecking(false);
      }
    })();

    return () => unsub?.();
  }, []);

  if (checking) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
        <Text className="mt-4 text-lg font-bold text-[#0C94B9]">
          Yanlış Defterim Yükleniyor...
        </Text>
      </View>
    );
  }

  return null;
}