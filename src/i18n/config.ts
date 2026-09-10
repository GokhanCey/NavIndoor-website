export const locales = ['en', 'it'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'it';

export const routes = {
  project: '',
  accessibility: 'accessibility',
  publications: 'publications',
  team: 'team',
} as const;

export type RouteKey = keyof typeof routes;

export function pathTo(locale: Locale, route: RouteKey): string {
  const slug = routes[route];
  return slug ? `/${locale}/${slug}/` : `/${locale}/`;
}
