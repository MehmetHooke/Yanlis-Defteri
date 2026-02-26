import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
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

export default function ModernTabBar({
    state,
    descriptors,
    navigation,
}: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const { theme, effectiveTheme } = useTheme();
    const c = theme.colors;

    const bottom = Math.max(insets.bottom, 10);

    const [tabLayouts, setTabLayouts] = useState<
        { x: number; width: number; key: string }[]
    >([]);

    const x = useSharedValue(0);
    const w = useSharedValue(0);

    const visibleRoutes = useMemo(() => {
        return state.routes.filter((route) => {
            if (route.name === "lesson") return false;

            const opts: any = descriptors[route.key]?.options;
            if (opts?.tabBarItemStyle?.display === "none") return false;

            return true;
        });
    }, [state.routes, descriptors]);

    const focusedKey = state.routes[state.index]?.key;

    const SPRING = {
        damping: 26,
        stiffness: 140,
        mass: 0.9,
        overshootClamping: true,
        restDisplacementThreshold: 0.5,
        restSpeedThreshold: 0.5,
    };

    useEffect(() => {
        const layout = tabLayouts.find((l) => l.key === focusedKey);
        if (!layout) return;

        x.value = withSpring(layout.x, SPRING);
        w.value = withSpring(layout.width, SPRING);
    }, [focusedKey, tabLayouts]);

    const pillStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: x.value }],
        width: w.value,
    }));

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
                    style={{
                        flex: 1,
                        backgroundColor: c.tabBg,
                        paddingHorizontal: 10,
                    }}
                >
                    <View
                        style={{
                            flex: 1,
                            flexDirection: "row",
                            alignItems: "center",
                            position: "relative",
                        }}
                    >
                        {/* 🔥 GERÇEK KONUMA KAYAN PILL */}
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                {
                                    position: "absolute",
                                    top: 8,
                                    height: 48,
                                    borderRadius: 16,
                                    backgroundColor: c.tabActiveBg,
                                },
                                pillStyle,
                            ]}
                        />

                        {visibleRoutes.map((route) => {
                            const { options } = descriptors[route.key];
                            const label = options.title ?? route.name;
                            const isFocused = focusedKey === route.key;
                            const Icon = getIcon(route.name);

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

                            return (
                                <Pressable
                                    key={route.key}
                                    onLayout={(e) => {
                                        const { x, width } = e.nativeEvent.layout;
                                        setTabLayouts((prev) => {
                                            const filtered = prev.filter(
                                                (p) => p.key !== route.key
                                            );
                                            return [...filtered, { x, width, key: route.key }];
                                        });
                                    }}
                                    onPress={onPress}
                                    style={{
                                        flex: 1,
                                        height: 48,
                                        borderRadius: 16,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 4,
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