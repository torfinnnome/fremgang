<script lang="ts">
  // import { t } from 'svelte-i18next';
  import { goto } from '$app/navigation';
  import { isAuthenticated } from '$lib/stores';

  let email = '';
  let password = '';
  let error: string | null = null;

  async function handleSubmit() {
    error = null;
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to login');
      }

      localStorage.setItem('token', data.token);
      isAuthenticated.set(true);
      goto('/');
    } catch (err: any) {
      error = err.message;
    }
  }
</script>

<div class="card" style="max-width: 400px; margin: auto;">
  <h2>Login</h2>
  <form on:submit|preventDefault={handleSubmit}>
    <div style="margin-bottom: 1rem;">
      <label for="email">Email Address</label>
      <input
        type="email"
        id="email"
        bind:value={email}
        required
        style="width: 100%; padding: 0.5rem; margin-top: 0.5rem;"
      />
    </div>
    <div style="margin-bottom: 1rem;">
      <label for="password">Password</label>
      <input
        type="password"
        id="password"
        bind:value={password}
        required
        style="width: 100%; padding: 0.5rem; margin-top: 0.5rem;"
      />
    </div>
    {#if error}
      <p style="color: var(--error-color);">{error}</p>
    {/if}
    <button type="submit" style="width: 100%; padding: 0.75rem;">
      Login
    </button>
  </form>
  <p style="text-align: center; margin-top: 1rem;">
    Don't have an account? <a href="/register">Register</a>
  </p>
</div>
