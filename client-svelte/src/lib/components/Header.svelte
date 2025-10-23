<script lang="ts">
  import { theme, isAuthenticated } from '$lib/stores';
  import { get } from 'svelte/store';
  import * as m from '$lib/paraglide/messages';
  import { setLocale, getLocale } from '$lib/paraglide/messages';

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
  <h1 class="app-title">{m.appName()}</h1>
  <div class="header-controls">
    <select on:change={handleLanguageChange} value={getLocale()} style="padding: 0.5rem;">
      <option value="en">English</option>
      <option value="no">Norsk</option>
      <option value="es">Español</option>
    </select>

    <button on:click={toggleTheme} style="padding: 0.5rem;">
      {$theme === 'light' ? m.darkMode() : m.lightMode()}
    </button>

    {#if get(isAuthenticated)}
      <button on:click={logout} style="padding: 0.5rem;">
        {m.logout()}
      </button>
    {/if}
  </div>
</header>
