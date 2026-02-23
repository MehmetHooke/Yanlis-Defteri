// app/(tabs)/_layout.tsx
import { auth } from "@/src/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function TabsLayout() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace("/(auth)/login");
      setChecking(false);
    });
    return unsub;
  }, []);

  if (checking) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#000" },
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "rgba(255,255,255,0.5)",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dersler",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="add"
        options={{
          title: "Ekle",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />



      {/* Yeni hiyerarşi route'larını TAB’da gösterme */}
      <Tabs.Screen name="lesson/[lessonId]" options={{ href: null }} />
      <Tabs.Screen name="lesson/[lessonId]/topic/[topicId]" options={{ href: null }} />
      <Tabs.Screen
        name="lesson/[lessonId]/topic/[topicId]/question/[questionId]"
        options={{ href: null }}
      />
    </Tabs>
  );
}