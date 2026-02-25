import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ImageBackground,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View
} from "react-native";

import { auth } from "@/src/lib/firebase";
import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
} from "firebase/auth";

import { useTheme } from "@/src/context/ThemeContext";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ fontSize: 14, marginBottom: 8, opacity: 0.9, fontWeight: "600" }}>
        {title}
      </Text>
      <View style={{ borderRadius: 14, padding: 12 }}>{children}</View>
    </View>
  );
}

function RadioRow({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        gap: 10,
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          borderWidth: 2,
          borderColor: selected ? color : "#9CA3AF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? (
          <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: color }} />
        ) : null}
      </View>
      <Text style={{ fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { theme, preference, setPreference, themeLoading } = useTheme();

  const user = auth.currentUser;

  const displayName = user?.displayName || "Kullanıcı";
  const email = user?.email || "";
  const photoURL = user?.photoURL;

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [saving, setSaving] = useState(false);

  const c = theme.colors;

  const cardStyle = useMemo(
    () => ({
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    }),
    [c]
  );

  const inputStyle = useMemo(
    () => ({
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: c.text,
      marginTop: 8,
    }),
    [c]
  );

  const buttonStyle = useMemo(
    () => ({
      backgroundColor: c.buttonBg,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    }),
    [c]
  );

  const onChangePassword = async () => {
    if (!user) {
      Alert.alert("Hata", "Giriş yapan kullanıcı bulunamadı.");
      return;
    }
    if (!email) {
      Alert.alert("Hata", "Email bilgisi bulunamadı.");
      return;
    }
    if (!oldPass || !newPass || !newPass2) {
      Alert.alert("Eksik", "Lütfen tüm alanları doldurun.");
      return;
    }
    if (newPass !== newPass2) {
      Alert.alert("Hata", "Yeni şifreler aynı değil.");
      return;
    }
    if (newPass.length < 6) {
      Alert.alert("Hata", "Yeni şifre en az 6 karakter olmalı.");
      return;
    }

    setSaving(true);
    try {
      const cred = EmailAuthProvider.credential(email, oldPass);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPass);

      setOldPass("");
      setNewPass("");
      setNewPass2("");

      Alert.alert("Başarılı", "Şifreniz güncellendi.");
    } catch (e: any) {
      console.log("Şifre değiştir hata:", e?.code, e?.message);
      const code = e?.code;

      if (code === "auth/wrong-password") {
        Alert.alert("Hata", "Eski şifre yanlış.");
      } else if (code === "auth/too-many-requests") {
        Alert.alert("Hata", "Çok fazla deneme. Biraz sonra tekrar deneyin.");
      } else if (code === "auth/requires-recent-login") {
        Alert.alert("Hata", "Güvenlik için yeniden giriş yapmanız gerekiyor.");
      } else {
        Alert.alert("Hata", "Şifre değiştirilemedi.");
      }
    } finally {
      setSaving(false);
    }
  };



  if (themeLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: c.text }}>
          Ayarlar
        </Text>

        {/* Profil */}
        <Section title="Profil">
          <View style={[cardStyle, { borderRadius: 16, padding: 12, flexDirection: "row", gap: 12, alignItems: "center" }]}>
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 999,
                overflow: "hidden",
                backgroundColor: c.inputBg,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              {photoURL ? (
                <Image source={{ uri: photoURL }} style={{ width: 54, height: 54 }} />
              ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: c.mutedText, fontWeight: "700" }}>
                    {displayName?.slice(0, 1)?.toUpperCase() || "U"}
                  </Text>
                </View>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontSize: 16, fontWeight: "700" }}>
                {displayName}
              </Text>
              {!!email && (
                <Text style={{ color: c.mutedText, marginTop: 2 }}>
                  {email}
                </Text>
              )}
            </View>
          </View>
        </Section>

        {/* Şifre değiştirme */}
        <Section title="Şifre Değiştir">
          <View style={[cardStyle, { borderRadius: 16, padding: 12 }]}>
            <Text style={{ color: c.mutedText, fontSize: 13 }}>
              Güvenlik için önce eski şifrenizi doğrularız.
            </Text>

            <TextInput
              value={oldPass}
              onChangeText={setOldPass}
              placeholder="Eski şifre"
              placeholderTextColor={c.mutedText}
              secureTextEntry
              style={inputStyle}
            />
            <TextInput
              value={newPass}
              onChangeText={setNewPass}
              placeholder="Yeni şifre"
              placeholderTextColor={c.mutedText}
              secureTextEntry
              style={inputStyle}
            />
            <TextInput
              value={newPass2}
              onChangeText={setNewPass2}
              placeholder="Yeni şifre (tekrar)"
              placeholderTextColor={c.mutedText}
              secureTextEntry
              style={inputStyle}
            />

            <Pressable
              onPress={onChangePassword}
              disabled={saving}
              style={[buttonStyle, { marginTop: 12, opacity: saving ? 0.7 : 1 }]}
            >
              {saving ? (
                <ActivityIndicator />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  Şifreyi Güncelle
                </Text>
              )}
            </Pressable>
          </View>
        </Section>

        {/* Tema seçimi */}
        <Section title="Tema">
          <View style={[cardStyle, { borderRadius: 16, padding: 12 }]}>
            <RadioRow
              label="Sistem"
              selected={preference === "system"}
              onPress={() => setPreference("system")}
              color={c.buttonBg}
            />
            <RadioRow
              label="Açık"
              selected={preference === "light"}
              onPress={() => setPreference("light")}
              color={c.buttonBg}
            />
            <RadioRow
              label="Koyu"
              selected={preference === "dark"}
              onPress={() => setPreference("dark")}
              color={c.buttonBg}
            />
          </View>
        </Section>

        {/* Uygulamaya puan ver */}
        <Section title="Destek">
          <View style={[cardStyle, { borderRadius: 16, padding: 12 }]}>
            <Text style={{ color: c.mutedText, fontSize: 13 }}>
              Uygulama hoşuna gittiyse mağazada puan vererek destek olabilirsin 🙏
            </Text>

            <Pressable style={[buttonStyle, { marginTop: 12 }]}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                Uygulamamıza Puan Verin
              </Text>
            </Pressable>
          </View>
        </Section>
      </ScrollView>
    </ImageBackground>
  );
}