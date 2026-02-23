import { login } from "@/src/services/auth.service";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Eksik", "E-posta ve şifre gir.");
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      console.log("Login hata:", e);
      Alert.alert("Hata", e?.message ?? "Giriş yapılamadı");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center p-6 bg-black">
      <Text className="text-3xl font-bold text-white mb-2">Yanlış Defteri</Text>
      <Text className="text-white/70 mb-6">Giriş yap</Text>

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
        placeholder="Şifre"
        placeholderTextColor="#999"
        secureTextEntry
        className="mb-4 rounded-xl bg-white/10 px-4 py-3 text-white"
      />

      <Pressable
        onPress={onLogin}
        disabled={loading}
        className="rounded-xl bg-white px-4 py-3 items-center"
      >
        {loading ? <ActivityIndicator /> : <Text className="font-semibold">Giriş Yap</Text>}
      </Pressable>

      <Pressable onPress={() => router.push("/(auth)/register")} className="mt-4 items-center">
        <Text className="text-white/80">Hesabın yok mu? Kayıt ol</Text>
      </Pressable>
    </View>
  );
}