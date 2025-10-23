import { writable } from 'svelte/store';

const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
export const theme = writable(storedTheme || 'light');

theme.subscribe(value => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('theme', value);
  }
});

export const isAuthenticated = writable(false);
