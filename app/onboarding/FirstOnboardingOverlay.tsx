// app/onboarding/FirstOnboardingOverlay.tsx
import React, { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

type Props = {
  active: boolean;
  logoSource: any;
};

export default function FirstOnboardingOverlay({ active, logoSource }: Props) {
  const p = useSharedValue(0);

  useEffect(() => {
    if (active) {
      p.value = 0;
      p.value = withTiming(1, {
        duration: 1800,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      p.value = 0;
    }
  }, [active, p]);

  const logoAnim = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * -140 }],
  }));

  const textAnim = useAnimatedStyle(() => ({
    opacity: p.value,
    color: interpolateColor(p.value, [0, 1], ["#6D5CFF", "#FFFFFF"]),
    transform: [{ translateY: (1 - p.value) * 15 }],
  }));

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View style={[styles.logoWrap, logoAnim]}>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
      </Animated.View>

      <Animated.Text style={[styles.title, textAnim]}>
        Hoş geldiniz
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  logo: {
    width: 200,
    height: 200,
  },
  title: {
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: 1,
  },
});