import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ImageSourcePropType, useColorScheme } from "react-native";

import { auth, db } from "@/src/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export type ThemePreference = "system" | "light" | "dark";
export type EffectiveTheme = "light" | "dark";

type ThemeColors = {
  // surfaces
  background: string;
  card: string;
  inputBg: string;

  // text
  text: string;
  mutedText: string;

  // brand
  accent: string;

  // borders
  border: string;
  borderStrong: string;

  // buttons
  buttonBg: string;
  buttonText: string;

  // tabbar (modern)
  tabBg: string;          // blur altına hafif renk
  tabBorder: string;
  tabActive: string;      // icon active
  tabInactive: string;    // icon inactive
  tabActiveBg: string;    // active item arka plan
};

type ThemeConfig = {
  name: EffectiveTheme;
  bgImage: ImageSourcePropType;
  colors: ThemeColors;
};

const THEME_KEY = "app_theme_pref_v1";

/**
 * Paket A: Indigo
 */
const ACCENT = "#6D5CFF";

const lightTheme: ThemeConfig = {
  name: "light",
  bgImage: require("@/assets/images/bg-light.png"),
  colors: {
    background: "#F5F7FF",
    card: "#FFFFFF",
    inputBg: "#F0F3FF",

    text: "#12162A",
    mutedText: "#5B647C",

    accent: ACCENT,

    border: "#E6E9F5",
    borderStrong: "#D9DFF1",

    buttonBg: ACCENT,
    buttonText: "#FFFFFF",

    // tabbar: açık temada pill daha açık, text daha koyu
    tabBg: "rgba(255,255,255,0.72)",
    tabBorder: "rgba(0,0,0,0.08)",
    tabActive: ACCENT,
    tabInactive: "rgba(18,22,42,0.45)",
    tabActiveBg: "rgba(109,92,255,0.14)",
  },
};

const darkTheme: ThemeConfig = {
  name: "dark",
  bgImage: require("@/assets/images/bg-dark.png"),
  colors: {
    background: "#0B1020",
    card: "#121A2D",
    inputBg: "#0F162B",

    text: "#EAF0FF",
    mutedText: "#9AA6C5",

    accent: ACCENT,

    border: "rgba(255,255,255,0.08)",
    borderStrong: "rgba(255,255,255,0.12)",

    buttonBg: ACCENT,
    buttonText: "#FFFFFF",

    // tabbar: koyu temada pill daha koyu/şeffaf
    tabBg: "rgba(10,12,16,0.70)",
    tabBorder: "rgba(255,255,255,0.10)",
    tabActive: ACCENT,
    tabInactive: "rgba(234,240,255,0.55)",
    tabActiveBg: "rgba(109,92,255,0.18)",
  },
};

type ThemeContextValue = {
  preference: ThemePreference;
  effectiveTheme: EffectiveTheme;
  theme: ThemeConfig;
  setPreference: (pref: ThemePreference) => Promise<void>;
  themeLoading: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isPref(v: any): v is ThemePreference {
  return v === "system" || v === "light" || v === "dark";
}

async function persistLocal(pref: ThemePreference) {
  await AsyncStorage.setItem(THEME_KEY, pref);
}

async function persistRemote(pref: ThemePreference) {
  const user = auth.currentUser;
  if (!user) return;
  await setDoc(doc(db, "users", user.uid), { themePreference: pref }, { merge: true });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme(); // "light" | "dark" | null
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [themeLoading, setThemeLoading] = useState(true);

  const effectiveTheme: EffectiveTheme = useMemo(() => {
    if (preference === "light") return "light";
    if (preference === "dark") return "dark";
    return systemScheme === "dark" ? "dark" : "light";
  }, [preference, systemScheme]);

  const theme = useMemo(
    () => (effectiveTheme === "light" ? lightTheme : darkTheme),
    [effectiveTheme]
  );

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (isPref(saved)) setPreferenceState(saved);
      } catch { }
    })();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          // login ekranı gibi durumlarda da loading bitsin
          setThemeLoading(false);
          return;
        }

        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.data() as { themePreference?: ThemePreference } | undefined;
        const remote = data?.themePreference;

        if (isPref(remote)) {
          setPreferenceState(remote);
          await persistLocal(remote);
        }
      } catch (e) {
        console.log("Tema sync hatası:", e);
      } finally {
        setThemeLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const setPreference = async (pref: ThemePreference) => {
    setPreferenceState(pref);
    try { await persistLocal(pref); } catch { }
    try { await persistRemote(pref); } catch { }
  };

  const value = useMemo(
    () => ({ preference, effectiveTheme, theme, setPreference, themeLoading }),
    [preference, effectiveTheme, theme, themeLoading]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside a ThemeProvider");
  return ctx;
}