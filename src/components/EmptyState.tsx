import { Text, View } from "react-native";

export default function EmptyState({ title = "Henüz soru yok" }: { title?: string }) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-base text-white/70">{title}</Text>
    </View>
  );
}