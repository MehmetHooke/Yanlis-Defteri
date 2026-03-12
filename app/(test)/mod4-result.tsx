// app/(test)/mod4-result.tsx
import FullscreenZoomImage from "@/src/components/FullscreenZoomImage";
import { useTheme } from "@/src/context/ThemeContext";
import {
    clearMod4Session,
    getMod4Session,
    type Mod4QuestionResult,
} from "@/src/services/mod4-session.service";
import { router } from "expo-router";
import {
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Circle
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
    FlatList,
    Image,
    ImageBackground,
    Pressable,
    Text,
    View,
} from "react-native";

function ResultCard({
  item,
  index,
  opened,
  onToggle,
  onOpenImage,
  c,
}: {
  item: Mod4QuestionResult;
  index: number;
  opened: boolean;
  onToggle: () => void;
  onOpenImage: (uri: string) => void;
  c: any;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: c.borderStrong,
        backgroundColor: c.card,
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      {!!item.questionImageUrl && (
        <Pressable onPress={() => onOpenImage(item.questionImageUrl!)}>
          <Image
            source={{ uri: item.questionImageUrl }}
            style={{ width: "100%", height: 220, backgroundColor: c.inputBg }}
            resizeMode="cover"
          />
        </Pressable>
      )}

      <View style={{ padding: 14 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: c.mutedText,
                fontSize: 12,
                fontWeight: "800",
              }}
            >
              Soru {index + 1}
            </Text>

            {!!item.questionText && (
              <Text
                style={{
                  color: c.text,
                  fontWeight: "800",
                  fontSize: 15,
                  lineHeight: 21,
                  marginTop: 6,
                }}
              >
                {item.questionText}
              </Text>
            )}
          </View>

          <View
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: item.isCorrect
                ? c.testButtonBackgroundGreen
                : "rgba(239,68,68,0.14)",
              borderWidth: 1,
              borderColor: item.isCorrect
                ? "rgba(34,197,94,0.45)"
                : "rgba(239,68,68,0.45)",
            }}
          >
            <Text
              style={{
                color: item.isCorrect
                  ? c.testButtonTextColorGreen
                  : "rgba(239,68,68,0.95)",
                fontWeight: "900",
                fontSize: 12,
              }}
            >
              {item.isCorrect ? "Doğru" : "Yanlış"}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Circle size={14} color={c.mutedText} />
              <Text
                style={{
                  color: c.mutedText,
                  marginLeft: 6,
                  fontWeight: "700",
                }}
              >
                Sen: {item.selectedChoice}
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <CheckCircle2 size={14} color={c.accent} />
              <Text
                style={{
                  color: c.text,
                  marginLeft: 6,
                  fontWeight: "800",
                }}
              >
                Doğru: {item.correctChoice}
              </Text>
            </View>
          </View>

          {opened ? (
            <ChevronUp size={18} color={c.mutedText} />
          ) : (
            <ChevronDown size={18} color={c.mutedText} />
          )}
        </View>

        {opened && (
          <View
            style={{
              marginTop: 14,
              borderTopWidth: 1,
              borderTopColor: c.border,
              paddingTop: 12,
            }}
          >
            <Text
              style={{
                color: c.text,
                fontWeight: "900",
                marginBottom: 6,
              }}
            >
              Açıklama
            </Text>

            <Text
              style={{
                color: c.mutedText,
                lineHeight: 20,
                fontWeight: "600",
              }}
            >
              {item.explanation?.trim()
                ? item.explanation
                : "Bu soru için açıklama eklenmemiş."}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function Mod4ResultScreen() {
  const { theme } = useTheme();
  const c = theme.colors;

  const session = getMod4Session();
  const [openedId, setOpenedId] = useState<string | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUri, setViewerUri] = useState("");

  const wrongCount = useMemo(() => {
    if (!session) return 0;
    return session.total - session.solved;
  }, [session]);

  const rate = useMemo(() => {
    if (!session || session.total <= 0) return 0;
    return Math.round((session.solved / session.total) * 100);
  }, [session]);

  const openViewer = (uri: string) => {
    setViewerUri(uri);
    setViewerOpen(true);
  };

  if (!session) {
    return (
      <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            padding: 18,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: c.text,
              fontSize: 16,
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            Test sonucu bulunamadı.
          </Text>

          <Pressable
            onPress={() => router.replace("/(tabs)")}
            style={{
              marginTop: 14,
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: c.buttonBg,
            }}
          >
            <Text style={{ color: c.buttonText, fontWeight: "900" }}>
              Anasayfaya dön
            </Text>
          </Pressable>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
      <FlatList
        data={session.results}
        keyExtractor={(item) => item.questionId}
        contentContainerStyle={{ padding: 18, paddingTop: 58, paddingBottom: 30 }}
        ListHeaderComponent={
          <View
            style={{
              borderRadius: 22,
              padding: 18,
              backgroundColor: c.card,
              borderWidth: 1,
              borderColor: c.borderStrong,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                color: c.text,
                fontSize: 20,
                fontWeight: "900",
                textAlign: "center",
              }}
            >
              Test Sonucu
            </Text>

            <Text
              style={{
                color: c.mutedText,
                textAlign: "center",
                marginTop: 6,
                fontWeight: "700",
              }}
            >
              Şimdi cevaplarını soru bazında inceleyebilirsin.
            </Text>

            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginTop: 16,
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 16,
                  padding: 14,
                  backgroundColor: c.inputBg,
                }}
              >
                <Text style={{ color: c.mutedText, fontWeight: "800", fontSize: 12 }}>
                  Doğru
                </Text>
                <Text style={{ color: c.text, fontWeight: "900", fontSize: 24, marginTop: 4 }}>
                  {session.solved}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  borderRadius: 16,
                  padding: 14,
                  backgroundColor: c.inputBg,
                }}
              >
                <Text style={{ color: c.mutedText, fontWeight: "800", fontSize: 12 }}>
                  Yanlış
                </Text>
                <Text style={{ color: c.text, fontWeight: "900", fontSize: 24, marginTop: 4 }}>
                  {wrongCount}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  borderRadius: 16,
                  padding: 14,
                  backgroundColor: c.inputBg,
                }}
              >
                <Text style={{ color: c.mutedText, fontWeight: "800", fontSize: 12 }}>
                  Başarı
                </Text>
                <Text style={{ color: c.text, fontWeight: "900", fontSize: 24, marginTop: 4 }}>
                  %{rate}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                clearMod4Session();
                router.replace("/(tabs)");
              }}
              style={{
                marginTop: 16,
                minHeight: 48,
                borderRadius: 16,
                backgroundColor: c.buttonBg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: c.buttonText, fontWeight: "900" }}>
                Anasayfaya dön
              </Text>
            </Pressable>
          </View>
        }
        renderItem={({ item, index }) => (
          <ResultCard
            item={item}
            index={index}
            opened={openedId === item.questionId}
            onToggle={() =>
              setOpenedId((prev) => (prev === item.questionId ? null : item.questionId))
            }
            onOpenImage={openViewer}
            c={c}
          />
        )}
      />

      <FullscreenZoomImage
        uri={viewerUri}
        visible={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </ImageBackground>
  );
}