import esTranslations from './translations/es.json';
import enTranslations from './translations/en.json';

const translations = {
  es: esTranslations,
  en: enTranslations
} as const;

export type Lang = keyof typeof translations;
export type TranslationKey = string;

export function getTranslation(lang: Lang) {
  const t = translations[lang];

  return function translate(key: TranslationKey): string {
    const keys = key.split('.');
    let result: unknown = t;

    for (const k of keys) {
      result = (result as Record<string, unknown>)?.[k];
    }

    return (result as string) || key;
  };
}

export function getLocalizedUrl(path: string, lang: Lang): string {
  const cleanPath = path.replace(/^\/(es|en)/, '');
  return `/${lang}${cleanPath}`;
}

export function getAlternateLanguages(currentPath: string, currentLang: Lang) {
  const languages: Lang[] = ['es', 'en'];
  return languages
    .filter(lang => lang !== currentLang)
    .map(lang => ({
      lang,
      url: getLocalizedUrl(currentPath, lang)
    }));
}

export function formatDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

export function formatPrice(price: number, currency: string, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-US', {
    style: 'currency',
    currency
  }).format(price);
}

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split('/');
  if (lang === 'es' || lang === 'en') {
    return lang;
  }
  return 'es';
}

export const languages = {
  es: { name: 'Espanol', flag: 'ES' },
  en: { name: 'English', flag: 'EN' }
};

export const defaultLang: Lang = 'es';
