import { register } from "@/src/services/auth.service";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Eksik", "E-posta ve şifre gir.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Zayıf şifre", "Şifre en az 6 karakter olmalı.");
      return;
    }

    try {
      setLoading(true);
      await register(email.trim(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      console.log("Register hata:", e);
      Alert.alert("Hata", e?.message ?? "Kayıt olunamadı");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center p-6 bg-black">
      <Text className="text-3xl font-bold text-white mb-2">Kayıt Ol</Text>
      <Text className="text-white/70 mb-6">Hesap oluştur</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="E-posta"
        placeholderTextColor="#999"
        autoCapitalize="none"
        keyboardType="email-address"
        className="mb-3 rounded-xl bg-white/10 px-4 py-3 text-white"
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Şifre (min 6)"
        placeholderTextColor="#999"
        secureTextEntry
        className="mb-4 rounded-xl bg-white/10 px-4 py-3 text-white"
      />

      <Pressable
        onPress={onRegister}
        disabled={loading}
        className="rounded-xl bg-white px-4 py-3 items-center"
      >
        {loading ? <ActivityIndicator /> : <Text className="font-semibold">Kayıt Ol</Text>}
      </Pressable>

      <Pressable onPress={() => router.back()} className="mt-4 items-center">
        <Text className="text-white/80">Zaten hesabın var mı? Giriş yap</Text>
      </Pressable>
    </View>
  );
}