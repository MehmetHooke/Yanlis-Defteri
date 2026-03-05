import { useTheme } from "@/src/context/ThemeContext";
import React, { createContext, useContext, useMemo, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, Text, View } from "react-native";

export type AlertVariant = "default" | "success" | "warning" | "danger";

type AlertButton = {
  text: string;
  variant?: "primary" | "secondary" | "destructive";
  onPress?: () => void | Promise<void>;
};

type AlertPayload = {
  visible: boolean;
  title?: string;
  message?: string;
  variant?: AlertVariant;
  buttons: AlertButton[];
  dismissible?: boolean;
};

export type AppAlertApi = {
  alert: (
    title: string,
    message?: string,
    opts?: { variant?: AlertVariant; dismissible?: boolean; buttonText?: string }
  ) => void;
  confirm: (opts: {
    title: string;
    message?: string;
    variant?: AlertVariant;
    dismissible?: boolean;
    cancelText?: string;
    confirmText?: string;
    destructive?: boolean;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void | Promise<void>;
  }) => void;
  hide: () => void;
};

const AppAlertContext = createContext<AppAlertApi | null>(null);

export function useAppAlert() {
  const ctx = useContext(AppAlertContext);
  if (!ctx) throw new Error("useAppAlert must be used within AppAlertProvider");
  return ctx;
}

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const c = theme.colors;

  const [state, setState] = useState<AlertPayload>({
    visible: false,
    title: "",
    message: "",
    variant: "default",
    buttons: [],
    dismissible: true,
  });

  const [busy, setBusy] = useState(false);

  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const showAnim = () => {
    scale.setValue(0.96);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 22,
        bounciness: 6,
      }),
    ]).start();
  };

  const hide = () => {
    setState((s) => ({ ...s, visible: false }));
    setBusy(false);
    opacity.setValue(0);
    scale.setValue(0.96);
  };

  const alert: AppAlertApi["alert"] = (title, message, opts) => {
    setBusy(false);
    setState({
      visible: true,
      title,
      message,
      variant: opts?.variant ?? "default",
      dismissible: opts?.dismissible ?? true,
      buttons: [
        {
          text: opts?.buttonText ?? "Tamam",
          variant: "primary",
          onPress: hide,
        },
      ],
    });
    showAnim();
  };

  const confirm: AppAlertApi["confirm"] = (opts) => {
    setBusy(false);
    setState({
      visible: true,
      title: opts.title,
      message: opts.message,
      variant: opts.variant ?? (opts.destructive ? "danger" : "default"),
      dismissible: opts.dismissible ?? true,
      buttons: [
        {
          text: opts.cancelText ?? "Vazgeç",
          variant: "secondary",
          onPress: async () => {
            try {
              setBusy(true);
              await opts.onCancel?.();
            } finally {
              setBusy(false);
              hide();
            }
          },
        },
        {
          text: opts.confirmText ?? "Onayla",
          variant: opts.destructive ? "destructive" : "primary",
          onPress: async () => {
            try {
              setBusy(true);
              await opts.onConfirm?.();
            } finally {
              setBusy(false);
              hide();
            }
          },
        },
      ],
    });
    showAnim();
  };

  // ✅ api referansı sabit kalsın
  const api = useMemo<AppAlertApi>(() => ({ alert, confirm, hide }), []);

  const accent =
    state.variant === "success"
      ? "#22c55e"
      : state.variant === "warning"
      ? "#f59e0b"
      : state.variant === "danger"
      ? "#ef4444"
      : c.accent;

  const buttonBg = (v?: AlertButton["variant"]) => {
    if (v === "secondary") return c.inputBg;
    if (v === "destructive") return "#ef4444";
    return c.accent;
  };

  const buttonTextColor = (v?: AlertButton["variant"]) => {
    if (v === "secondary") return c.text;
    return "#ffffff";
  };

  return (
    <AppAlertContext.Provider value={api}>
      {children}

      <Modal
        visible={state.visible}
        transparent
        animationType="none"
        onRequestClose={() => {
          if (!state.dismissible || busy) return;
          hide();
        }}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            padding: 18,
            justifyContent: "center",
          }}
          onPress={() => {
            if (!state.dismissible || busy) return;
            hide();
          }}
        >
          <View pointerEvents="box-none" onStartShouldSetResponder={() => true}>
            <Animated.View
              style={{
                opacity,
                transform: [{ scale }],
                borderRadius: 18,
                backgroundColor: c.card,
                borderWidth: 1,
                borderColor: c.borderStrong,
                overflow: "hidden",
              }}
            >
              <View style={{ height: 5, backgroundColor: accent }} />

              <View style={{ padding: 16 }}>
                {!!state.title && (
                  <Text style={{ color: c.text, fontSize: 16, fontWeight: "800" }}>
                    {state.title}
                  </Text>
                )}

                {!!state.message && (
                  <Text style={{ color: c.mutedText, marginTop: 8, fontSize: 13, lineHeight: 18 }}>
                    {state.message}
                  </Text>
                )}

                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    marginTop: 14,
                    justifyContent: "flex-end",
                  }}
                >
                  {state.buttons.map((b, idx) => {
                    const bg = buttonBg(b.variant);
                    const tc = buttonTextColor(b.variant);

                    return (
                      <Pressable
                        key={`${b.text}-${idx}`}
                        disabled={busy}
                        onPress={() => b.onPress?.()}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 14,
                          borderRadius: 999,
                          backgroundColor: bg,
                          borderWidth: b.variant === "secondary" ? 1 : 0,
                          borderColor: c.borderStrong,
                          opacity: busy ? 0.7 : 1,
                          minWidth: 96,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: tc, fontWeight: "700", fontSize: 13 }}>
                          {busy && idx === 1 ? "..." : b.text}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </Animated.View>
          </View>
        </Pressable>
      </Modal>
    </AppAlertContext.Provider>
  );
}