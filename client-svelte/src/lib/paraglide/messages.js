import { writable, derived, get } from 'svelte/store';
import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';
import noMessages from '../../messages/no.json';

const translations = {
  en: enMessages,
  es: esMessages,
  no: noMessages,
};

// Initialize locale from localStorage or browser language
function getInitialLocale() {
  if (typeof window === 'undefined') return 'en';

  // Check localStorage first
  const stored = localStorage.getItem('preferredLocale');
  if (stored && ['en', 'es', 'no'].includes(stored)) {
    return stored;
  }

  // Check browser language
  const browserLang = navigator.language.split('-')[0];
  if (['en', 'es', 'no'].includes(browserLang)) {
    return browserLang;
  }

  return 'en';
}

const currentLocale = writable(getInitialLocale());

export function getLocale() {
  return get(currentLocale);
}

export function setLocale(locale) {
  currentLocale.set(locale);
  // Store the locale preference in localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('preferredLocale', locale);
  }
}

export const m = derived(currentLocale, ($currentLocale) => {
  return translations[$currentLocale] || translations.en;
});
