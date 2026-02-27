// app/onboarding/index.tsx

import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AsyncStorage from "@react-native-async-storage/async-storage";
import FirstOnboardingOverlay from "./FirstOnboardingOverlay";
import { onboardingImages, onboardingLogo } from "./onboardingImages";

const { width, height } = Dimensions.get("window");

type Item = { key: string; image: any; index: number };

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Item>>(null);

  const data = useMemo<Item[]>(
    () =>
      onboardingImages.map((img, i) => ({
        key: String(i),
        image: img,
        index: i,
      })),
    []
  );

  const [page, setPage] = useState(0);
  const lastIndex = data.length - 1;

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / width);
    setPage(next);
  };
  const ONBOARDING_DONE_KEY = "onboarding_done_v1";

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "1");
    router.replace("/"); // ✅ Index karar versin
  };
  const renderItem = ({ item }: { item: Item }) => {
    const isLast = item.index === lastIndex;
    const isFirst = item.index === 0;

    return (
      <View style={styles.page}>
        <StatusBar style="light" translucent backgroundColor="transparent" />

        {/* background */}
        <Image source={item.image} style={styles.bg} resizeMode="cover" />

        {/* Alt scrim: buton ve yazılar her görselde okunaklı olsun */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.55)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.bottomScrim}
          pointerEvents="none"
        />

        {/* 1. ekran animasyonu */}
        {isFirst && (
          <FirstOnboardingOverlay active={page === 0} logoSource={onboardingLogo} />
        )}

        {/* Alt bölüm */}
        <View style={[styles.bottom, { bottom: 16 + insets.bottom }]}>
          {!isLast ? (
            <Text style={styles.hint}>Devam etmek için kaydır</Text>
          ) : (
            <Pressable onPress={finish} style={styles.button}>
              <Text style={styles.buttonText}>Başlayalım</Text>
            </Pressable>
          )}

          <View style={styles.dots}>
            {data.map((_, i) => (
              <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
            ))}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0B0B10" }}>
      <FlatList
        ref={listRef}
        data={data}
        renderItem={renderItem}
        keyExtractor={(x) => x.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        // “yarım sayfa” kalma sorununu azaltır
        snapToInterval={width}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        bounces={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    width,
    height,
    backgroundColor: "#0B0B10",
  },
  bg: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },

  bottomScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 280,
  },

  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 20,
  },

  hint: {
    color: "rgba(255,255,255,0.90)",
    fontSize: 14,
    marginBottom: 14,
  },

  // Premium “cam” buton: görselle karışmayı bitirir
  button: {
    width: "100%",
    height: 54,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  buttonText: {
    color: "#6D5CFF",
    fontSize: 16,
    fontWeight: "800",
  },

  dots: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: {
    backgroundColor: "#fff",
    transform: [{ scale: 1.15 }],
  },
});