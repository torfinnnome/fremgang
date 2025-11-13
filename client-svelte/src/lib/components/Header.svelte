<script lang="ts">
  import { theme, isAuthenticated } from '$lib/stores';
  import { get } from 'svelte/store';
  import { m, setLocale, getLocale } from '../paraglide/messages.js';

  function toggleTheme() {
    theme.update(current => (current === 'light' ? 'dark' : 'light'));
  }

  function logout() {
    // Implement logout logic here
    isAuthenticated.set(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  }

  function handleLanguageChange(event: Event) {
    const newLocale = (event.target as HTMLSelectElement).value;
    setLocale(newLocale);
  }
</script>

<header class="app-header">
  <div class="header-left">
    <h1 class="app-title">{$m.appName}</h1>
    <a href="https://github.com/torfinnnome/fremgang" target="_blank" rel="noopener noreferrer" class="github-link" aria-label="View source on GitHub">
      <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
      </svg>
    </a>
  </div>
  <div class="header-controls">
    <select on:change={handleLanguageChange} value={getLocale()} style="padding: 0.5rem;">
      <option value="en">English</option>
      <option value="no">Norsk</option>
      <option value="es">Español</option>
    </select>

    <button on:click={toggleTheme} style="padding: 0.5rem;">
      {$theme === 'light' ? $m.darkMode : $m.lightMode}
    </button>

    {#if get(isAuthenticated)}
      <button on:click={logout} style="padding: 0.5rem;">
        {$m.logout}
      </button>
    {/if}
  </div>
</header>

<style>
  .header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .github-link {
    display: flex;
    align-items: center;
    color: hsl(var(--foreground));
    opacity: 0.7;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  .github-link:hover {
    opacity: 1;
    transform: scale(1.1);
    text-decoration: none;
  }

  .github-link svg {
    width: 24px;
    height: 24px;
  }

  .header-controls select {
    font-weight: 400;
  }

  @media (max-width: 768px) {
    .github-link svg {
      width: 20px;
      height: 20px;
    }
  }
</style>