// app/(auth)/login.tsx
import { router } from "expo-router";
import { Check, Eye, EyeOff, LogIn, UserPlus } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import PagerView from "react-native-pager-view";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "@/src/context/ThemeContext";
import { login, register } from "@/src/services/auth.service";

type TabIndex = 0 | 1;

export default function AuthScreen() {
  const pagerRef = useRef<PagerView>(null);
  const { theme, themeLoading } = useTheme();
  const c = theme.colors;

  const { height: winH } = useWindowDimensions();

  // -----------------------------
  // Screen-level "force light" fix (only for this screen)
  // -----------------------------
  // Eğer ThemeContext "effectiveTheme" gibi bir alan sunmuyorsa,
  // bu ekranda light hissini garantiye almak için küçük bir palette override ediyoruz.
  // İstersen bunu kaldırıp ThemeContext tarafını kökten çözebiliriz.


  // Burada istersen "c" yerine light kullanacağız.
  // (Login ekranı özelinde açık tema istedin.)
  const ui = useTheme().theme.colors;

  const [activeTab, setActiveTab] = useState<TabIndex>(0);
  const gotoTab = (idx: TabIndex) => {
    setActiveTab(idx);
    pagerRef.current?.setPage(idx);
  };

  // -----------------------------
  // Title animation: translateY + opacity + color (delay + >=800ms)
  // -----------------------------
  const titleT = useSharedValue(0);

  useEffect(() => {
    titleT.value = withDelay(
      800,
      withTiming(1, { duration: 2000, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const titleAnimStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: (1 - titleT.value) * -50 }], // 10-15px arası: 12px
      opacity: titleT.value,
    };
  });

  const titleTextStyle = useAnimatedStyle(() => {
    return {
      color: interpolateColor(titleT.value, [0, 1], ["#000000", "#6D5CFF"]),
    } as any;
  });

  // ---- Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);

  // ---- Register form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regPass2, setRegPass2] = useState("");
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegPass2, setShowRegPass2] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canLogin = useMemo(() => {
    return loginEmail.trim().length > 3 && loginPass.length >= 6;
  }, [loginEmail, loginPass]);

  const canRegister = useMemo(() => {
    if (!firstName.trim() || !lastName.trim()) return false;
    if (regEmail.trim().length < 4) return false;
    if (regPass.length < 6) return false;
    if (regPass !== regPass2) return false;
    if (!acceptedTerms) return false;
    return true;
  }, [firstName, lastName, regEmail, regPass, regPass2, acceptedTerms]);

  const onLogin = async () => {
    setErr(null);
    if (!canLogin) return;
    try {
      setLoading(true);
      await login(loginEmail.trim(), loginPass);
      router.replace("/(tabs)");
    } catch (e: any) {
      setErr(firebaseFriendlyError(e?.code) ?? "Giriş yapılamadı.");
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async () => {
    setErr(null);
    if (!canRegister) return;
    try {
      setLoading(true);
      await register({
        email: regEmail.trim(),
        password: regPass,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      router.replace("/(tabs)");
    } catch (e: any) {
      setErr(firebaseFriendlyError(e?.code) ?? "Kayıt oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  };

  const SegTab = ({
    idx,
    label,
    icon,
  }: {
    idx: TabIndex;
    label: string;
    icon: React.ReactNode;
  }) => {
    const isActive = activeTab === idx;
    return (
      <Pressable
        onPress={() => gotoTab(idx)}
        style={{
          flex: 1,
          paddingVertical: 10,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          backgroundColor: isActive ? ui.tabActiveBg : "transparent",
        }}
      >
        {icon}
        <Text style={{ color: isActive ? ui.tabActive : ui.tabInactive, fontWeight: "900" }}>
          {label}
        </Text>
      </Pressable>
    );
  };

  const cardStyle = useMemo(
    () => ({
      backgroundColor: ui.card,
      borderWidth: 1,
      borderColor: ui.borderStrong,
      borderRadius: 18,
      padding: 14,
    }),
    [ui]
  );

  const inputStyle = useMemo(
    () => ({
      backgroundColor: ui.inputBg,
      borderWidth: 1,
      borderColor: ui.border,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 12,
      color: ui.text,
      fontWeight: "700" as const,
    }),
    [ui]
  );

  const buttonStyle = useMemo(
    () => ({
      backgroundColor: ui.buttonBg,
      paddingVertical: 12,
      borderRadius: 14,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    }),
    [ui]
  );

  // Pager yüksekliği: küçük ekranlarda daha iyi
  const pagerHeight = Math.max(380, Math.min(520, Math.round(winH * 0.52)));

  if (themeLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ImageBackground source={theme.bgImage} style={{ flex: 1 }}>
      {/* Light overlay: koyu mod hissini kırar */}
      <View
        pointerEvents="none"
        style={{ ...StyleSheet.absoluteFillObject, backgroundColor: ui.background }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        {/* Outer scroll: keyboard açılınca sayfa kayabilsin */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 16,
            paddingTop: 26,
            paddingBottom: 22,
            justifyContent: "center",
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Animated.View style={[{ alignItems: "center", marginBottom: 20 }, titleAnimStyle]}>
            <Animated.Text
              style={[
                { fontSize: 26, fontWeight: "900", letterSpacing: 0.2 },
                titleTextStyle,
              ]}
            >
              Yanlış Defterim
            </Animated.Text>
          </Animated.View>

          {/* Segmented Tabs: title ile arası +5px daha ferah (üstte marginBottom zaten 20) */}
          <View
            style={{
              alignSelf: "center",
              width: "100%",
              maxWidth: 520,
              padding: 6,
              borderRadius: 25,
              backgroundColor: ui.card,
              borderWidth: 1,
              borderColor: ui.borderStrong,
              flexDirection: "row",
              gap: 6,
              marginBottom: 12, // pill'e yaslı his
            }}
          >
            <SegTab
              idx={0}
              label="Giriş Yap"
              icon={<LogIn size={18} color={activeTab === 0 ? ui.tabActive : ui.tabInactive} />}
            />
            <SegTab
              idx={1}
              label="Kayıt Ol"
              icon={<UserPlus size={18} color={activeTab === 1 ? ui.tabActive : ui.tabInactive} />}
            />
          </View>

          {/* Error */}
          {err ? (
            <View
              style={{
                alignSelf: "center",
                width: "100%",
                maxWidth: 520,
                marginBottom: 12,
                padding: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: ui.borderStrong,
                backgroundColor: ui.card,
              }}
            >
              <Text style={{ color: ui.text, fontWeight: "800" }}>{err}</Text>
            </View>
          ) : null}

          {/* Forms container */}
          <View style={{ alignSelf: "center", width: "100%", maxWidth: 520 }}>
            <PagerView
              ref={pagerRef}
              style={{ height: pagerHeight }}
              initialPage={0}
              onPageSelected={(e) => setActiveTab(e.nativeEvent.position as TabIndex)}
            >
              {/* LOGIN */}
              <ScrollView
                key="login"
                contentContainerStyle={{
                  paddingBottom: 14,
                  flexGrow: 1,
                  // justifyContent:"center" KALDIRILDI -> boşluk problemini çözer
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={cardStyle}>
                  <Text style={{ color: ui.text, fontWeight: "900", fontSize: 16 }}>Giriş Yap</Text>

                  <View style={{ marginTop: 12, gap: 10 }}>
                    <TextInput
                      value={loginEmail}
                      onChangeText={setLoginEmail}
                      placeholder="E-posta"
                      placeholderTextColor={ui.mutedText}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={inputStyle}
                    />

                    <View style={{ position: "relative" }}>
                      <TextInput
                        value={loginPass}
                        onChangeText={setLoginPass}
                        placeholder="Şifre"
                        placeholderTextColor={ui.mutedText}
                        secureTextEntry={!showLoginPass}
                        style={[inputStyle, { paddingRight: 46 }]}
                      />
                      <Pressable
                        onPress={() => setShowLoginPass((p) => !p)}
                        hitSlop={10}
                        style={{
                          position: "absolute",
                          right: 12,
                          top: 12,
                          height: 24,
                          width: 24,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {showLoginPass ? (
                          <EyeOff size={20} color={ui.mutedText} />
                        ) : (
                          <Eye size={20} color={ui.mutedText} />
                        )}
                      </Pressable>
                    </View>

                    <Pressable
                      onPress={onLogin}
                      disabled={!canLogin || loading}
                      style={[
                        buttonStyle,
                        { marginTop: 4, opacity: !canLogin || loading ? 0.6 : 1 },
                      ]}
                    >
                      {loading && activeTab === 0 ? (
                        <ActivityIndicator color={ui.buttonText} />
                      ) : (
                        <Text style={{ color: ui.buttonText, fontWeight: "900" }}>Devam Et</Text>
                      )}
                    </Pressable>

                    <Pressable onPress={() => gotoTab(1)} style={{ paddingVertical: 6 }}>
                      <Text style={{ color: ui.mutedText, fontWeight: "700", textAlign: "center" }}>
                        Hesabın yok mu?{" "}
                        <Text style={{ color: ui.accent, fontWeight: "900" }}>Kayıt Ol</Text>
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>

              {/* REGISTER */}
              <ScrollView
                key="register"
                contentContainerStyle={{
                  paddingBottom: 14,
                  flexGrow: 1,
                  // justifyContent:"center" KALDIRILDI -> keyboard + kaydırma daha doğal
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={cardStyle}>
                  <Text style={{ color: ui.text, fontWeight: "900", fontSize: 16 }}>Kayıt Ol</Text>

                  <View style={{ marginTop: 12, gap: 10 }}>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TextInput
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder="Ad"
                        placeholderTextColor={ui.mutedText}
                        style={[inputStyle, { flex: 1 }]}
                      />
                      <TextInput
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder="Soyad"
                        placeholderTextColor={ui.mutedText}
                        style={[inputStyle, { flex: 1 }]}
                      />
                    </View>

                    <TextInput
                      value={regEmail}
                      onChangeText={setRegEmail}
                      placeholder="E-posta"
                      placeholderTextColor={ui.mutedText}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={inputStyle}
                    />

                    <View style={{ position: "relative" }}>
                      <TextInput
                        value={regPass}
                        onChangeText={setRegPass}
                        placeholder="Şifre (en az 6 karakter)"
                        placeholderTextColor={ui.mutedText}
                        secureTextEntry={!showRegPass}
                        style={[inputStyle, { paddingRight: 46 }]}
                      />
                      <Pressable
                        onPress={() => setShowRegPass((p) => !p)}
                        hitSlop={10}
                        style={{
                          position: "absolute",
                          right: 12,
                          top: 12,
                          height: 24,
                          width: 24,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {showRegPass ? (
                          <EyeOff size={20} color={ui.mutedText} />
                        ) : (
                          <Eye size={20} color={ui.mutedText} />
                        )}
                      </Pressable>
                    </View>

                    <View style={{ position: "relative" }}>
                      <TextInput
                        value={regPass2}
                        onChangeText={setRegPass2}
                        placeholder="Şifre Tekrar"
                        placeholderTextColor={ui.mutedText}
                        secureTextEntry={!showRegPass2}
                        style={[inputStyle, { paddingRight: 46 }]}
                      />
                      <Pressable
                        onPress={() => setShowRegPass2((p) => !p)}
                        hitSlop={10}
                        style={{
                          position: "absolute",
                          right: 12,
                          top: 12,
                          height: 24,
                          width: 24,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {showRegPass2 ? (
                          <EyeOff size={20} color={ui.mutedText} />
                        ) : (
                          <Eye size={20} color={ui.mutedText} />
                        )}
                      </Pressable>
                    </View>

                    {/* Terms */}
                    <Pressable
                      onPress={() => setAcceptedTerms((v) => !v)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 }}
                      hitSlop={6}
                    >
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: acceptedTerms ? ui.accent : ui.borderStrong,
                          backgroundColor: acceptedTerms ? ui.accent : "transparent",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {acceptedTerms ? <Check size={14} color={"#fff"} /> : null}
                      </View>

                      <Text style={{ color: ui.mutedText, fontWeight: "700", flex: 1 }}>
                        <Text>Kullanım koşullarını </Text>
                        <Text
                          style={{ color: ui.accent, fontWeight: "900" }}
                          onPress={() => {
                            // ileride router.push("/terms")
                          }}
                        >
                          okudum ve onaylıyorum
                        </Text>
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={onRegister}
                      disabled={!canRegister || loading}
                      style={[
                        buttonStyle,
                        { marginTop: 4, opacity: !canRegister || loading ? 0.6 : 1 },
                      ]}
                    >
                      {loading && activeTab === 1 ? (
                        <ActivityIndicator color={ui.buttonText} />
                      ) : (
                        <Text style={{ color: ui.buttonText, fontWeight: "900" }}>
                          Hesap Oluştur
                        </Text>
                      )}
                    </Pressable>

                    <Pressable onPress={() => gotoTab(0)} style={{ paddingVertical: 6 }}>
                      <Text style={{ color: ui.mutedText, fontWeight: "700", textAlign: "center" }}>
                        Zaten hesabın var mı?{" "}
                        <Text style={{ color: ui.accent, fontWeight: "900" }}>Giriş Yap</Text>
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </PagerView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

function firebaseFriendlyError(code?: string) {
  if (!code) return null;
  switch (code) {
    case "auth/invalid-email":
      return "E-posta formatı geçersiz.";
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "E-posta veya şifre hatalı.";
    case "auth/email-already-in-use":
      return "Bu e-posta ile zaten bir hesap var.";
    case "auth/weak-password":
      return "Şifre çok zayıf. En az 6 karakter olmalı.";
    case "auth/network-request-failed":
      return "İnternet bağlantısı yok gibi görünüyor.";
    default:
      return null;
  }
}