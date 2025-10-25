<script lang="ts">
  import { authFetch } from '$lib/auth';
  import { get } from 'svelte/store';
  import { token } from '$lib/auth';
  import Papa from 'papaparse';
  import { m } from '../paraglide/messages.js';

  export let activities: { id: number; name: string }[] = [];

  let error: string | null = null;

  async function exportToCsv() {
    error = null;
    try {
      const response = await authFetch('/api/events/all');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to fetch events');
      }
      const events = await response.json();

      const dataToExport = events.map((event: any) => ({
        activity_name: activities.find(a => a.id === event.activity_id)?.name || 'Unknown',
        count: event.count,
        timestamp: event.timestamp,
      }));

      const csv = Papa.unparse(dataToExport);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'fremgang_events.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      error = err.message;
    }
  }
</script>

<button on:click={exportToCsv} style="padding: 0.5rem;">
  {$m.exportCSV}
</button>

{#if error}
  <p style="color: var(--error-color);">{error}</p>
{/if}
