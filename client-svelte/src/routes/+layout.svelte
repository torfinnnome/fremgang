<script lang="ts">
  import '../app.css';
  import Header from '$lib/components/Header.svelte';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { theme, isAuthenticated } from '$lib/stores';
  import { token } from '$lib/auth';
  import * as m from '$lib/paraglide/messages';

  onMount(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      token.set(storedToken);
    }

    const unsubscribe = token.subscribe(value => {
      isAuthenticated.set(!!value);
      if (!value) {
        goto('/login');
      }
    });

    return unsubscribe;
  });

  theme.subscribe(value => {
    if (typeof document !== 'undefined') {
      document.body.className = value;
      console.log('+layout.svelte: document.body.className set to', value);
    }
  });
</script>

<svelte:head>
  <title>{m.appName()}</title>
</svelte:head>

{#if $isAuthenticated}
  <Header />

  <main style="padding: 2rem;" key={$theme}>
    <slot />
  </main>
{:else}
  <slot />
{/if}