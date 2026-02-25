import { useTheme } from "@/src/context/ThemeContext";
import type { Question } from "@/src/types/question";
import { ImageIcon } from "lucide-react-native";
import { Image, Pressable, Text, View } from "react-native";

export default function QuestionCard({
  item,
  onPress,
}: {
  item: Question;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <Pressable onPress={onPress} style={{ marginBottom: 12 }}>
      <View
        style={{
          flexDirection: "row",
          gap: 12,
          borderRadius: 18,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.borderStrong,
          padding: 12,
        }}
      >
        {/* Thumbnail */}
        <View
          style={{
            width: 68,
            height: 68,
            borderRadius: 14,
            overflow: "hidden",
            backgroundColor: c.inputBg,
            borderWidth: 1,
            borderColor: c.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={{ width: 68, height: 68 }}
              resizeMode="cover"
            />
          ) : (
            <ImageIcon size={18} color={c.mutedText} />
          )}
        </View>

        {/* Content */}
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ color: c.text, fontSize: 14, fontWeight: "900" }} numberOfLines={1}>
            {/* Eğer modelinde title yoksa: "Soru" yaz */}
            {"Soru"}
          </Text>

          <Text style={{ color: c.mutedText, marginTop: 4, fontSize: 12 }} numberOfLines={1}>
            {/* Eğer question modelinde topic/lesson varsa burada göster */}
            {/* Örn: `${item.lessonName} • ${item.topicName}` */}
            {"Fotoğraflı soru"}
          </Text>

          {/* Chips (opsiyonel) */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: c.inputBg,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <Text style={{ color: c.mutedText, fontSize: 11, fontWeight: "700" }}>
                Görüntü
              </Text>
            </View>

            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: c.tabActiveBg,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <Text style={{ color: c.accent, fontSize: 11, fontWeight: "800" }}>
                Detay
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}