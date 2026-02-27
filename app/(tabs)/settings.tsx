import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Easing,
    Image,
    ImageBackground,
    Linking,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View
} from "react-native";

import { auth, db } from "@/src/lib/firebase";
import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
} from "firebase/auth";

import { useTheme } from "@/src/context/ThemeContext";
import { logout } from "@/src/services/auth.service";
import { router } from "expo-router";

import { useAppAlert } from "@/src/components/common/AppAlertProvider";
import { doc, getDoc } from "firebase/firestore";
import { ChevronDown, ChevronUp, Laptop, Lock, LogOut, Moon, Settings, Sun } from "lucide-react-native";

const PLAY_URL =
    "https://play.google.com/store/apps/details?id=com.mehmethooke.yanlisdefteri";
const PLAY_MARKET_URL =
    "market://details?id=com.mehmethooke.yanlisdefteri";

function Section({
    title,
    children,
    titleRight,
}: {
    title: string;
    children: React.ReactNode;
    titleRight?: React.ReactNode;
}) {
    const { theme } = useTheme();
    const c = theme.colors;

    return (
        <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 13, marginBottom: 8, fontWeight: "700", color: c.mutedText }}>
                    {title}
                </Text>
                {titleRight}
            </View>
            {children}
        </View>
    );
}

function RadioRow({
    label,
    selected,
    onPress,
    icon,
}: {
    label: string;
    selected: boolean;
    onPress: () => void;
    icon: React.ReactNode;
}) {
    const { theme } = useTheme();
    const c = theme.colors;

    return (
        <Pressable
            onPress={onPress}
            style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                gap: 10,
            }}
        >
            <View
                style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    borderWidth: 2,
                    borderColor: selected ? c.accent : c.borderStrong,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {selected ? (
                    <View
                        style={{
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            backgroundColor: c.accent,
                        }}
                    />
                ) : null}
            </View>

            <View style={{ width: 18, alignItems: "center" }}>{icon}</View>

            <Text style={{ fontSize: 14, color: c.text, fontWeight: "600" }}>{label}</Text>
        </Pressable>
    );
}

export default function SettingsScreen() {
    const { theme, preference, setPreference, themeLoading, effectiveTheme } = useTheme();
    const { alert, confirm } = useAppAlert();
    const user = auth.currentUser;
    const email = user?.email || "";
    const photoURL = user?.photoURL;
    const [fullName, setFullName] = useState<string>("Kullanıcı");
    const displayName = fullName;

    const [oldPass, setOldPass] = useState("");
    const [newPass, setNewPass] = useState("");
    const [newPass2, setNewPass2] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                if (!user) return;

                const snap = await getDoc(doc(db, "users", user.uid));
                if (!snap.exists()) return;

                const data = snap.data() as any;
                const name = `${data?.firstName ?? ""} ${data?.lastName ?? ""}`.trim();

                if (!cancelled) {
                    setFullName(name || user.displayName || "Kullanıcı");
                }
            } catch (e) {
                console.log("User doc fetch error:", e);
                if (!cancelled) setFullName(user?.displayName || "Kullanıcı");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user?.uid]);


    // Accordion
    const [pwOpen, setPwOpen] = useState(false);
    const anim = useRef(new Animated.Value(0)).current; // 0 closed, 1 open

    const c = theme.colors;

    const cardStyle = useMemo(
        () => ({
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.borderStrong,
            borderRadius: 18,
            padding: 12,
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

    const dangerButtonStyle = useMemo(
        () => ({
            backgroundColor: effectiveTheme === "dark"
                ? "rgba(239,68,68,0.14)"
                : "rgba(239,68,68,0.20)",
            borderWidth: 1,
            borderColor: effectiveTheme === "dark"
                ? "rgba(239,68,68,0.28)"
                : "rgba(239,68,68,0.22)",
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: "center" as const,
            justifyContent: "center" as const,
            flexDirection: "row" as const,
            gap: 8,
        }),
        [effectiveTheme]
    );
    const togglePassword = () => {
        const next = !pwOpen;
        setPwOpen(next);
        Animated.timing(anim, {
            toValue: next ? 1 : 0,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false, // height animation
        }).start();
    };

    const contentHeight = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 210], // içerik yüksekliği (yaklaşık)
    });
    const contentOpacity = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    const onChangePassword = async () => {
        if (!user) return alert("Hata", "Giriş yapan kullanıcı bulunamadı.");
        if (!email) return alert("Hata", "Email bilgisi bulunamadı.");

        // Google/Apple login ise burada mantık farklı (MVP: uyarı)
        // provider kontrolü (basit)
        const providerIds = user.providerData.map((p) => p.providerId);
        if (!providerIds.includes("password")) {
            alert(
                "Bilgi",
                "Bu hesap email/şifre ile giriş yapmıyor. Şifre değiştirmek için email/şifre hesabı kullanmalısın."
            );
            return;
        }

        if (!oldPass || !newPass || !newPass2) return alert("Eksik", "Lütfen tüm alanları doldurun.");
        if (newPass !== newPass2) return alert("Hata", "Yeni şifreler aynı değil.");
        if (newPass.length < 6) return alert("Hata", "Yeni şifre en az 6 karakter olmalı.");

        setSaving(true);
        try {
            const cred = EmailAuthProvider.credential(email, oldPass);
            await reauthenticateWithCredential(user, cred);
            await updatePassword(user, newPass);

            setOldPass("");
            setNewPass("");
            setNewPass2("");

            alert("Başarılı", "Şifreniz güncellendi.");
            // istersen otomatik kapatalım:
            // togglePassword();
        } catch (e: any) {
            const code = e?.code;
            if (code === "auth/wrong-password") alert("Hata", "Eski şifre yanlış.");
            else if (code === "auth/too-many-requests") alert("Hata", "Çok fazla deneme. Biraz sonra tekrar deneyin.");
            else if (code === "auth/requires-recent-login") alert("Hata", "Güvenlik için yeniden giriş yapmanız gerekiyor.");
            else alert("Hata", "Şifre değiştirilemedi.");
        } finally {
            setSaving(false);
        }
    };

    const onLogout = async () => {

        confirm({
            title: "Çıkış yap",
            message: "Çıkış yapmak istiyor musun ?",
            destructive: true,
            confirmText: "Çıkış yap",
            onConfirm: async () => {
                await logout();
                router.replace("/(auth)/login");
            },
        });
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
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 60, paddingBottom: 110 }}>
                {/* Başlık - boşluk azaltıldı */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              backgroundColor: c.tabActiveBg,
              borderWidth: 1,
              borderColor: c.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Settings size={20} color={c.accent} strokeWidth={2} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: c.text }}>
              Ayarlar
            </Text>
          </View>
        </View>

                {/* Profil */}
                <Section title="PROFİL">
                    <View style={[cardStyle, { flexDirection: "row", gap: 12, alignItems: "center" }]}>
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
                                    <Text style={{fontSize:22, color: c.accent, fontWeight: "800" }}>
                                        {displayName?.slice(0, 1)?.toUpperCase() || "U"}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={{ flex: 1 }}>
                            <Text style={{ color: c.text, fontSize: 16, fontWeight: "800" }}>
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

                {/* Şifre değiştirme - Accordion */}
                {/* Şifre değiştirme - Accordion (kart içinde tıklanır satır) */}
                <Section title="GÜVENLİK">
                    <View style={cardStyle}>
                        <Pressable
                            onPress={togglePassword}
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                                paddingVertical: 6,
                            }}
                        >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                <View
                                    style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 12,
                                        backgroundColor: c.tabActiveBg,
                                        borderWidth: 1,
                                        borderColor: c.border,
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    {/* kilit ikonu istersen: lucide Lock */}
                                    <Lock size={18} color={c.accent} />
                                </View>

                                <View>
                                    <Text style={{ color: c.text, fontWeight: "800", fontSize: 14 }}>
                                        Şifre Değiştir
                                    </Text>
                                    <Text style={{ color: c.mutedText, fontSize: 12, marginTop: 2 }}>
                                        Eski şifreni doğrulayarak güncelle.
                                    </Text>
                                </View>
                            </View>

                            {pwOpen ? (
                                <ChevronUp size={18} color={c.mutedText} />
                            ) : (
                                <ChevronDown size={18} color={c.mutedText} />
                            )}
                        </Pressable>

                        <Animated.View
                            style={{
                                height: contentHeight,
                                opacity: contentOpacity,
                                overflow: "hidden",
                                marginTop: 10,
                            }}
                        >
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
                                    <Text style={{ color: c.buttonText, fontWeight: "800" }}>
                                        Şifreyi Güncelle
                                    </Text>
                                )}
                            </Pressable>

                            {/* altta kesilme olmasın diye ekstra boşluk */}
                            <View style={{ height: 14 }} />
                        </Animated.View>
                    </View>
                </Section>

                {/* Tema seçimi */}
                <Section title="GÖRÜNÜM">
                    <View style={cardStyle}>
                        <RadioRow
                            label="Sistem"
                            selected={preference === "system"}
                            onPress={() => setPreference("system")}
                            icon={<Laptop size={16} color={c.mutedText} />}
                        />
                        <RadioRow
                            label="Açık"
                            selected={preference === "light"}
                            onPress={() => setPreference("light")}
                            icon={<Sun size={16} color={c.mutedText} />}
                        />
                        <RadioRow
                            label="Koyu"
                            selected={preference === "dark"}
                            onPress={() => setPreference("dark")}
                            icon={<Moon size={16} color={c.mutedText} />}
                        />
                    </View>
                </Section>

                {/* Destek */}
                <Section title="DESTEK">
                    <View style={cardStyle}>
                        <Text style={{ color: c.mutedText, fontSize: 13 }}>
                            Uygulama ile ilgili yorum yapmak ve görüş bildirmek için mağazada puan verin
                        </Text>

                        <Pressable
                            style={[buttonStyle, { marginTop: 12 }]}
                            onPress={async () => {
                                try {
                                    // Önce market:// dene (Android’de direkt mağaza açılır)
                                    const canMarket = await Linking.canOpenURL(PLAY_MARKET_URL);
                                    if (canMarket) {
                                        await Linking.openURL(PLAY_MARKET_URL);
                                    } else {
                                        await Linking.openURL(PLAY_URL);
                                    }
                                } catch (e) {
                                    alert("Hata", "Mağaza açılamadı. Lütfen daha sonra tekrar deneyin.");
                                }
                            }}
                        >
                            <Text style={{ color: c.buttonText, fontWeight: "800" }}>
                                Uygulamamıza Puan Verin
                            </Text>
                        </Pressable>
                    </View>
                </Section>

                {/* Çıkış */}
                <Section title="HESAP">
                    <Pressable onPress={onLogout} style={dangerButtonStyle}>
                        <LogOut size={18} color={"rgba(239,68,68,0.9)"} />
                        <Text style={{ color: c.text, fontWeight: "800" }}>Çıkış Yap</Text>
                    </Pressable>
                </Section>
            </ScrollView>
        </ImageBackground>
    );
}