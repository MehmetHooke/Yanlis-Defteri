import { auth } from "@/src/lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

const ONBOARDING_DONE_KEY = "onboarding_done_v1";

export default function Index() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    const boot = async () => {
      try {
        // 1) Onboarding bitti mi?
        const done = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);

        if (done !== "1") {
          // Onboarding ilk kez göster
          router.replace("/onboarding");
          return;
        }

        // 2) Onboarding bittiyse auth’a göre devam et
        unsub = onAuthStateChanged(auth, (user) => {
          router.replace(user ? "/(tabs)" : "/(auth)/login");
        });
      } finally {
        setChecking(false);
      }
    };

    boot();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  if (checking) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return null;
}