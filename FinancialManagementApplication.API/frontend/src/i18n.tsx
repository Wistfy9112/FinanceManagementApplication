export function useLanguage() {
  const t = (key: string) => key;
  return { t, locale: 'vi', setLocale: () => {} };
}
