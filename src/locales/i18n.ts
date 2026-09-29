import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import { storage } from "@/utils/storage";

import en from "./en.json";
import vi from "./vi.json";

const LANGUAGE_KEY = "user-language";

export const resources = {
  en: { translation: en },
  vi: { translation: vi },
};

const initI18n = async () => {
  let savedLanguage = await storage.getItemAsync(LANGUAGE_KEY);

  if (!savedLanguage) {
    savedLanguage = Localization.getLocales()[0].languageCode === "vi" ? "vi" : "en";
  }

  i18n
    .use(initReactI18next)
    .init({
      // @ts-ignore: compatibilityJSON is required for React Native on Android but not typed in latest i18next
      compatibilityJSON: 'v3',
      resources,
      lng: savedLanguage,
      fallbackLng: "en",
      interpolation: {
        escapeValue: false, // react already safe from xss
      },
    });
};

initI18n();

export const changeLanguage = async (lang: "en" | "vi") => {
  await i18n.changeLanguage(lang);
  await storage.setItemAsync(LANGUAGE_KEY, lang);
};

export default i18n;
