export const useTranslation = async (fallback: string = "en") => {
  const selectedLanguage = localStorage.getItem("selectedLanguage") || fallback;

  try {
    const [translationModule, translationsFallbackModule] = await Promise.all([
      import(`../assets/locales/${selectedLanguage}.json`).catch(() => null),
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
