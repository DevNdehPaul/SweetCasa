import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';

const LANGUAGE_KEY = 'sweetcasa_language';

// Detect device language — default to 'en' if not French
const deviceLang = Localization.getLocales?.()?.[0]?.languageCode ?? 'en';
const fallbackLang = deviceLang === 'fr' ? 'fr' : 'en';

// Load saved language from storage, then init i18n
export async function initI18n() {
  let savedLang: string | null = null;

  try {
    savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch {}

  const lng = savedLang ?? fallbackLang;

  await i18n.use(initReactI18next).init({
    compatibilityJSON: 'v4',   // required for React Native
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    lng,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,        // React Native handles escaping
    },
  });

  return lng;
}

// Call this when user picks a language
export async function changeLanguage(lang: 'en' | 'fr') {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
}

export { LANGUAGE_KEY };
export default i18n;