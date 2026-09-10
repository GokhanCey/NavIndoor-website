import { defaultLocale, locales, type Locale } from './config';
import { ui, type UiKey } from './ui';

export function getLocaleFromUrl(url: URL): Locale {
  const [, maybeLocale] = url.pathname.split('/');
  return (locales as readonly string[]).includes(maybeLocale)
    ? (maybeLocale as Locale)
    : defaultLocale;
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'it' : 'en';
}

export function useTranslations(locale: Locale) {
  return function t(key: UiKey): string {
    return ui[locale][key] ?? ui[defaultLocale][key];
  };
}

/** Swaps the leading /en/ or /it/ segment of a path for the other locale. */
export function switchLocalePath(pathname: string, target: Locale): string {
  const segments = pathname.split('/');
  if ((locales as readonly string[]).includes(segments[1])) {
    segments[1] = target;
    return segments.join('/');
  }
  return `/${target}/`;
}
