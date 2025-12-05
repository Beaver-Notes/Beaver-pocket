import { Preferences } from "@capacitor/preferences";

export const useTranslation = async (fallback: string = "en") => {
  const selectedLanguage = await Preferences.get({
    key: "selectedLanguage",
  });
  
  try {
    const [translationModule, translationsFallbackModule] = await Promise.all([
      import(`../assets/locales/${selectedLanguage.value}.json`).catch(() => null),
      import(`../assets/locales/${fallback}.json`),
    ]);

    return {
      ...translationsFallbackModule.default,
      ...(translationModule?.default || {}),
    };
  } catch (error) {
    console.error("Error loading translations:", error);
    return null;
  }
};
