import { Dimensions, Modal, Pressable, Text, View } from "react-native";
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

export default function FullscreenZoomImage({
  uri,
  visible,
  onClose,
}: {
  uri: string;
  visible: boolean;
  onClose: () => void;
}) {
  const IMG_W = width * 0.95;
  const IMG_H = height * 0.75;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const clamp = (v: number, min: number, max: number) => {
    "worklet";
    return Math.min(Math.max(v, min), max);
  };

  const boundTranslations = () => {
    "worklet";
    const maxX = (IMG_W * (scale.value - 1)) / 2;
    const maxY = (IMG_H * (scale.value - 1)) / 2;

    translateX.value = clamp(translateX.value, -maxX, maxX);
    translateY.value = clamp(translateY.value, -maxY, maxY);
  };

  const resetTransform = () => {
    "worklet";
    scale.value = 1;
    savedScale.value = 1;

    translateX.value = 0;
    translateY.value = 0;

    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;

      boundTranslations();
    });

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      const nextScale = clamp(savedScale.value * e.scale, 1, 4);

      const cx = IMG_W / 2;
      const cy = IMG_H / 2;

      const dx = e.focalX - cx;
      const dy = e.focalY - cy;

      translateX.value =
        savedTranslateX.value + dx - dx * (nextScale / savedScale.value);

      translateY.value =
        savedTranslateY.value + dy - dy * (nextScale / savedScale.value);

      scale.value = nextScale;

      boundTranslations();
    })
    .onEnd(() => {
      if (scale.value <= 1.01) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);

        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  const doubleTap = Gesture.Tap().numberOfTaps(2).onEnd(() => {
    resetTransform();
  });

  const composedGesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const previewStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => resetTransform()}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.95)",
            justifyContent: "center",
            paddingHorizontal: 18,
          }}
        >
          <View style={{ alignItems: "flex-end", marginBottom: 12 }}>
            <Pressable
              onPress={onClose}
              style={{
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.10)",
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>Kapat</Text>
            </Pressable>
          </View>

          <GestureDetector gesture={composedGesture}>
            <Animated.Image
              source={{ uri }}
              style={[
                {
                  width: IMG_W,
                  height: IMG_H,
                  borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.03)",
                  alignSelf: "center",
                },
                previewStyle,
              ]}
              resizeMode="contain"
            />
          </GestureDetector>

          <Text
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 12,
              textAlign: "center",
              marginTop: 12,
            }}
          >
            Pinch: yakınlaştır • Sürükle: kaydır • Çift dokun: sıfırla
          </Text>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}