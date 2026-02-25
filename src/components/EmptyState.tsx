import { useTheme } from "@/src/context/ThemeContext";
import { Inbox } from "lucide-react-native";
import { Text, View } from "react-native";

export default function EmptyState({
  title = "Henüz soru yok",
  subtitle = "Yeni soru ekleyerek başlayabilirsin.",
}: {
  title?: string;
  subtitle?: string;
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
      <View
        style={{
          width: 54,
          height: 54,
          borderRadius: 18,
          backgroundColor: c.tabActiveBg,
          borderWidth: 1,
          borderColor: c.border,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Inbox size={22} color={c.accent} strokeWidth={2} />
      </View>

      <Text style={{ color: c.text, fontSize: 16, fontWeight: "900", textAlign: "center" }}>
        {title}
      </Text>

      {!!subtitle && (
        <Text style={{ color: c.mutedText, marginTop: 6, fontSize: 13, textAlign: "center", lineHeight: 18 }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}