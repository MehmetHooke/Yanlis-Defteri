import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { BackHandler } from "react-native";
import {
    AlertVariant,
    AppAlertApi,
} from "../components/common/AppAlertProvider";
// eğer export yoksa aşağıdaki notu oku

export function useTestExitToHomeOnBack(params: {
  api: AppAlertApi;
  goHome: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  variant?: AlertVariant;
  dismissible?: boolean;
}) {
  const {
    api,
    goHome,
    title = "Testten çık",
    message = "Testten çıkıp anasayfaya dönmek istiyor musun?",
    confirmText = "Çık",
    cancelText = "Vazgeç",
    destructive = true,
    variant,
    dismissible = true,
  } = params;

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        api.confirm({
          title,
          message,
          confirmText,
          cancelText,
          destructive,
          variant,
          dismissible,
          onConfirm: async () => {
            goHome();
          },
        });

        // ✅ Android default back'i engelle
        return true;
      };

      const sub = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => sub.remove();
    }, [
      api,
      goHome,
      title,
      message,
      confirmText,
      cancelText,
      destructive,
      variant,
      dismissible,
    ]),
  );
}
