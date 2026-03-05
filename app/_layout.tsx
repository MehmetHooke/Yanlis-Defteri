import "react-native-gesture-handler";
import "./global.css";

import { AppAlertProvider } from "@/src/components/common/AppAlertProvider";
import { ThemeProvider } from "@/src/context/ThemeContext";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppAlertProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            {/* ✅ modal ekran */}
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