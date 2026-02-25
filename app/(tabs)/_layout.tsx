import { auth } from "@/src/lib/firebase";
import { Tabs, router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import ModernTabBar from "@/src/components/ModernTabBar";
import { useTheme } from "@/src/context/ThemeContext";

export default function TabsLayout() {
  const [checking, setChecking] = useState(true);
  const { themeLoading } = useTheme();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace("/(auth)/login");
      setChecking(false);
    });
    return unsub;
  }, []);

  if (checking || themeLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <ModernTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Anasayfa" }} />
      <Tabs.Screen name="questions" options={{ title: "Sorularım" }} />
      <Tabs.Screen name="add" options={{ title: "Ekle" }} />
      <Tabs.Screen name="settings" options={{ title: "Ayarlar" }} />

      {/* gizli stack/route */}
      <Tabs.Screen
        name="lesson"
        options={{
          
          tabBarButton: () => null,     // 🔥 asıl garanti bu
          tabBarItemStyle: { display: "none" }, // ekstra garanti
        }}
      />
    </Tabs>
  );
}