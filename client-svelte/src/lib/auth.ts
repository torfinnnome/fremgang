import { writable } from 'svelte/store';

export const token = writable<string | null>(null);

export async function authFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (typeof window !== 'undefined') {
    const currentToken = localStorage.getItem('token');
    if (currentToken) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }
  }

  options.headers = headers;

  const response = await fetch(url, options);

  if (response.status === 401) {
    // Token is invalid or expired, log out the user
    token.set(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  }

  return response;
}
