import { auth } from "@/src/lib/firebase";
import { addQuestionV2 } from "@/src/services/question.service";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";

export default function AddScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [lesson, setLesson] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.85,
      allowsEditing: true,
    });
    if (!res.canceled) setImageUri(res.assets[0].uri);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("İzin gerekli", "Kamera izni olmadan fotoğraf çekemezsin.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: true,
    });
    if (!res.canceled) setImageUri(res.assets[0].uri);
  };

  const onSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!imageUri) return Alert.alert("Eksik", "Lütfen bir fotoğraf seç veya çek.");
    if (!lesson.trim()) return Alert.alert("Eksik", "Ders boş olamaz.");
    if (!topic.trim()) return Alert.alert("Eksik", "Konu boş olamaz.");

    try {
      setLoading(true);

      const result = await addQuestionV2({
        userId: user.uid,
        imageUri,
        lesson,
        topic,
      });

      // Formu sıfırla (opsiyonel ama iyi)
      setImageUri(null);
      setLesson("");
      setTopic("");

      // Kaydedilen topic'in soru listesine git
      router.replace(`/(tabs)`);
    } catch (e: any) {
      Alert.alert("Hata", e?.message ?? "Kaydedilemedi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-black p-6 pt-14">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-2xl font-bold text-white">Soru Ekle</Text>
        <Pressable
          onPress={() => router.back()}
          className="px-3 py-2 rounded-xl bg-white/10 border border-white/10"
        >
          <Text className="text-white">Geri</Text>
        </Pressable>
      </View>

      <View className="flex-row gap-3 mb-4">
        <Pressable
          onPress={pickFromGallery}
          className="flex-1 rounded-xl bg-white px-4 py-3 items-center"
        >
          <Text className="font-semibold">Galeriden Seç</Text>
        </Pressable>

        <Pressable
          onPress={takePhoto}
          className="flex-1 rounded-xl bg-white/10 px-4 py-3 items-center border border-white/10"
        >
          <Text className="text-white">Fotoğraf Çek</Text>
        </Pressable>
      </View>

      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          className="w-full h-56 rounded-2xl mb-4"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-56 rounded-2xl mb-4 bg-white/5 border border-white/10 items-center justify-center">
          <Text className="text-white/60">Fotoğraf önizleme</Text>
        </View>
      )}

      <TextInput
        value={lesson}
        onChangeText={setLesson}
        placeholder="Ders (örn: Matematik)"
        placeholderTextColor="#999"
        className="mb-3 rounded-xl bg-white/10 px-4 py-3 text-white"
        autoCapitalize="words"
      />
      <TextInput
        value={topic}
        onChangeText={setTopic}
        placeholder="Konu (örn: Problemler)"
        placeholderTextColor="#999"
        className="mb-4 rounded-xl bg-white/10 px-4 py-3 text-white"
        autoCapitalize="words"
      />

      <Pressable
        onPress={onSave}
        disabled={loading}
        className="rounded-xl bg-white px-4 py-3 items-center"
      >
        {loading ? <ActivityIndicator /> : <Text className="font-semibold">Kaydet</Text>}
      </Pressable>
    </View>
  );
}