import type { Question } from "@/src/types/question";
import { Image, Pressable, View } from "react-native";

export default function QuestionCard({
  item,
  onPress,
}: {
  item: Question;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="mb-3 px-2">
      <View className="flex-row gap-3 rounded-2xl bg-white/10 p-4 border border-white/10">
        <Image source={{ uri: item.imageUrl }} className="h-16 w-16 rounded-xl" resizeMode="cover" />
        <View className="flex-1">
          {/* <Text className="text-white text-base font-semibold">{item.lesson}</Text> */}
          {/* <Text className="text-white/70 text-sm mt-1">{item.topic}</Text> */}
        </View>
      </View>
    </Pressable>
  );
}