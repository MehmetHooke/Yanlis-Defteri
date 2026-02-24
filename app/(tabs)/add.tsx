import { auth } from "@/src/lib/firebase";
import { addQuestionV3 } from "@/src/services/question.service";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type DraftAnswer =
  | {
    id: string;
    kind: "choice";
    choice?: "A" | "B" | "C" | "D" | "E";
    explanation?: string;
  }
  | {
    id: string;
    kind: "photo";
    imageUri?: string;
    explanation?: string;
  };

export default function AddScreen() {
  const [questionImageUri, setQuestionImageUri] = useState<string | null>(null);
  const [lesson, setLesson] = useState("");
  const [topic, setTopic] = useState("");
  const [answers, setAnswers] = useState<DraftAnswer[]>([]);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  /* -------------------- IMAGE PICK -------------------- */

  /* -------------------- IMAGE PICK -------------------- */

  const pickQuestionImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsEditing: true,
    });
    if (!res.canceled) setQuestionImageUri(res.assets[0].uri);
  };

  const takeQuestionPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("İzin gerekli", "Kamera izni olmadan fotoğraf çekemezsin.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });
    if (!res.canceled) setQuestionImageUri(res.assets[0].uri);
  };

  const pickAnswerPhoto = async (id: string) => {
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsEditing: true,
    });

    if (!res.canceled) {
      setAnswers((prev) =>
        prev.map((a) =>
          a.id === id && a.kind === "photo"
            ? { ...a, imageUri: res.assets[0].uri }
            : a
        )
      );
    }
  };

  const takeAnswerPhoto = async (id: string) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("İzin gerekli", "Kamera izni olmadan fotoğraf çekemezsin.");
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });

    if (!res.canceled) {
      setAnswers((prev) =>
        prev.map((a) =>
          a.id === id && a.kind === "photo"
            ? { ...a, imageUri: res.assets[0].uri }
            : a
        )
      );
    }
  };

  /* -------------------- ANSWER HANDLING -------------------- */

  const addAnswer = () => {
    if (answers.length >= 3) {
      Alert.alert("Limit", "En fazla 3 doğru cevap ekleyebilirsin.");
      return;
    }

    setAnswers((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        kind: "choice",
      },
    ]);
  };

  const removeAnswer = (id: string) => {
    setAnswers((prev) => prev.filter((a) => a.id !== id));
  };

  const updateAnswer = (id: string, data: Partial<DraftAnswer>) => {
    setAnswers((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...data } : a))
    );
  };

  /* -------------------- SAVE -------------------- */

  const onSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!questionImageUri)
      return Alert.alert("Eksik", "Soru fotoğrafı zorunlu.");
    if (!lesson.trim()) return Alert.alert("Eksik", "Ders boş olamaz.");
    if (!topic.trim()) return Alert.alert("Eksik", "Konu boş olamaz.");
    if (answers.length < 1)
      return Alert.alert("Eksik", "En az 1 doğru cevap eklemelisin.");

    for (const a of answers) {
      if (a.kind === "choice" && !a.choice)
        return Alert.alert("Eksik", "Şık seçilmemiş cevap var.");
      if (a.kind === "photo" && !a.imageUri)
        return Alert.alert("Eksik", "Fotoğraf seçilmemiş cevap var.");
    }

    try {
      setLoading(true);

      await addQuestionV3({
        userId: user.uid,
        questionImageUri,
        lesson,
        topic,
        answers: answers.map((a) => ({
          id: a.id,
          kind: a.kind,
          choice: a.kind === "choice" ? a.choice : undefined,
          explanation: a.explanation,
          imageUri: a.kind === "photo" ? a.imageUri : undefined,
        })),
      });

      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Hata", e?.message ?? "Kaydedilemedi");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- UI -------------------- */

  return (
    <SafeAreaView className="flex-1 bg-black p-6 pt-14">
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
      <Text className="text-2xl font-bold text-white mb-4">Soru Ekle</Text>
        <ScrollView
          contentContainerStyle={{
            paddingBottom: insets.bottom + 60,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          

          {/* Soru Foto */}
          {/* Soru Foto - Galeri + Kamera */}
          <View className="mb-4">
            <View className="flex-row gap-3 mb-3">
              <Pressable
                onPress={pickQuestionImage}
                className="flex-1 rounded-xl bg-white px-4 py-3 items-center"
              >
                <Text className="font-semibold">Galeriden Seç</Text>
              </Pressable>

              <Pressable
                onPress={takeQuestionPhoto}
                className="flex-1 rounded-xl bg-white/10 px-4 py-3 items-center border border-white/10"
              >
                <Text className="text-white">Fotoğraf Çek</Text>
              </Pressable>
            </View>

            {questionImageUri ? (
              <Image
                source={{ uri: questionImageUri }}
                className="w-full h-48 rounded-2xl bg-white/5"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-48 rounded-2xl bg-white/10 items-center justify-center">
                <Text className="text-white/60">Soru Fotoğrafı</Text>
              </View>
            )}
          </View>

          <TextInput
            value={lesson}
            onChangeText={setLesson}
            placeholder="Ders"
            placeholderTextColor="#999"
            className="mb-3 rounded-xl bg-white/10 px-4 py-3 text-white"
          />

          <TextInput
            value={topic}
            onChangeText={setTopic}
            placeholder="Konu"
            placeholderTextColor="#999"
            className="mb-4 rounded-xl bg-white/10 px-4 py-3 text-white"
          />

          {/* ANSWERS */}
          {answers.map((a, index) => (
            <View
              key={a.id}
              className="mb-4 p-4 rounded-xl bg-white/10 border border-white/10"
            >
              <Text className="text-white font-bold mb-2">
                Çözüm {index + 1}
              </Text>

              {/* TYPE SWITCH */}
              <View className="flex-row gap-2 mb-3">
                <Pressable
                  onPress={() => updateAnswer(a.id, { kind: "choice" })}
                  className="flex-1 p-2 rounded-lg bg-white/20"
                >
                  <Text className="text-white text-center">Şık</Text>
                </Pressable>
                <Pressable
                  onPress={() => updateAnswer(a.id, { kind: "photo" })}
                  className="flex-1 p-2 rounded-lg bg-white/20"
                >
                  <Text className="text-white text-center">Foto</Text>
                </Pressable>
              </View>

              {a.kind === "choice" && (
                <View className="flex-row justify-between mb-3">
                  {["A", "B", "C", "D", "E"].map((c) => (
                    <Pressable
                      key={c}
                      onPress={() =>
                        updateAnswer(a.id, { choice: c as any })
                      }
                      className={`px-3 py-2 rounded-lg ${a.choice === c ? "bg-white" : "bg-white/20"
                        }`}
                    >
                      <Text
                        className={
                          a.choice === c ? "text-black" : "text-white"
                        }
                      >
                        {c}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {a.kind === "photo" && (
                <View className="mb-3">
                  <View className="flex-row gap-2 mb-2">
                    <Pressable
                      onPress={() => pickAnswerPhoto(a.id)}
                      className="flex-1 p-2 rounded-lg bg-white/20"
                    >
                      <Text className="text-white text-center">Galeriden Seç</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => takeAnswerPhoto(a.id)}
                      className="flex-1 p-2 rounded-lg bg-white/20"
                    >
                      <Text className="text-white text-center">Fotoğraf Çek</Text>
                    </Pressable>
                  </View>

                  <View className="h-32 rounded-xl bg-white/20 items-center justify-center overflow-hidden">
                    {a.imageUri ? (
                      <Image
                        source={{ uri: a.imageUri }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Text className="text-white/60">Cevap Fotoğrafı</Text>
                    )}
                  </View>
                </View>
              )}

              <TextInput
                value={a.explanation}
                onChangeText={(t) =>
                  updateAnswer(a.id, { explanation: t })
                }
                placeholder="Açıklama (opsiyonel)"
                placeholderTextColor="#999"
                className="rounded-xl bg-white/10 px-4 py-3 text-white"
              />

              <Pressable
                onPress={() => removeAnswer(a.id)}
                className="mt-3"
              >
                <Text className="text-red-400 text-right">Sil</Text>
              </Pressable>
            </View>
          ))}

          <Pressable
            onPress={addAnswer}
            className="mb-4 rounded-xl bg-white/20 p-3 items-center"
          >
            <Text className="text-white">+ Cevap Ekle</Text>
          </Pressable>

          <Pressable
            onPress={onSave}
            disabled={loading}
            className="rounded-xl bg-white p-4 items-center"
          >
            {loading ? <ActivityIndicator /> : <Text>Kaydet</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView >
  );
}