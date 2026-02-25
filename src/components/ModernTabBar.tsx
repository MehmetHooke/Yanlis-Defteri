import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/src/context/ThemeContext";
import { BookOpen, Home, PlusCircle, Settings } from "lucide-react-native";

function getIcon(routeName: string) {
  switch (routeName) {
    case "index":
      return Home;
    case "questions":
      return BookOpen;
    case "add":
      return PlusCircle;
    case "settings":
      return Settings;
    default:
      return BookOpen;
  }
}

export default function ModernTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme, effectiveTheme } = useTheme();
  const c = theme.colors;

  const bottom = Math.max(insets.bottom, 10);

  // lesson gibi gizli route'ları filtrele
const visibleRoutes = state.routes.filter((route) => {
  // lesson segmentini asla tab'a çizme
  if (route.name === "lesson" || route.name.startsWith("lesson/")) return false;

  // ayrıca tabBarButton null olanları da çizme
  const opts = descriptors[route.key]?.options as any;
  if (opts?.tabBarButton === null) return false;

  return true;
});
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 14,
        right: 14,
        bottom,
        height: 64,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: "100%",
          height: 64,
          borderRadius: 22,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: c.tabBorder,
          shadowColor: "#000",
          shadowOpacity: effectiveTheme === "dark" ? 0.35 : 0.14,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 10 },
          elevation: 16,
        }}
      >
        <BlurView
          intensity={Platform.OS === "ios" ? 28 : 18}
          tint={effectiveTheme === "dark" ? "dark" : "light"}
          style={{ flex: 1, backgroundColor: c.tabBg, paddingHorizontal: 10 }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
            }}
          >
            {visibleRoutes.map((route) => {
              const { options } = descriptors[route.key];
              const label = options.title ?? route.name;

              const isFocused = state.routes[state.index].key === route.key;

              const onPress = () => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              const Icon = getIcon(route.name);

              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    backgroundColor: isFocused ? c.tabActiveBg : "transparent",
                  }}
                >
                  <Icon
                    size={22}
                    color={isFocused ? c.tabActive : c.tabInactive}
                    strokeWidth={2}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: isFocused ? c.text : c.tabInactive,
                    }}
                    numberOfLines={1}
                  >
                    {String(label)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}