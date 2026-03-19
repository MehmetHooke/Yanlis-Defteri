import "react-native-gesture-handler";
import "./global.css";

import { AppAlertProvider } from "@/src/components/common/AppAlertProvider";
import { ThemeProvider } from "@/src/context/ThemeContext";
import { setupNotificationChannel } from "@/src/services/notification.service";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  useEffect(() => {
    setupNotificationChannel();
  }, []);

  return (
    <ThemeProvider>
      <AppAlertProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="question/edit/[id]"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
              }}
            />
          </Stack>
        </GestureHandlerRootView>
      </AppAlertProvider>
    </ThemeProvider>
  );
}