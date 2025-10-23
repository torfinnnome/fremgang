<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  // import { t } from 'svelte-i18next';
  import Papa from 'papaparse';
  import type { Activity, TrainingEvent } from '../routes/+page.svelte';

  export let activities: Activity[] = [];
  export let events: TrainingEvent[] = [];

  function handleExport() {
    const activityMap = new Map(activities.map(act => [act.id, act.name]));

    const dataToExport = events.map(event => ({
      activity_name: activityMap.get(event.activity_id) || 'Unknown Activity',
      reps: event.count,
      timestamp: event.timestamp,
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'trening_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
</script>

<button on:click={handleExport} style="padding: 0.75rem;">
  {m.exportCSV()}
</button>
