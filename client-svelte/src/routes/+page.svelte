<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { onMount } from 'svelte';
  // import { t } from 'svelte-i18next';
  import { authFetch } from '$lib/auth';
  import EventForm from '$lib/components/EventForm.svelte';
  import DataCharts from '$lib/components/DataCharts.svelte';
  import ExportButton from '$lib/components/ExportButton.svelte';
  import EventList from '$lib/components/EventList.svelte';
  import ActivityProgress from '$lib/components/ActivityProgress.svelte';

  export interface Activity {
    id: number;
    user_id: number;
    name: string;
    target_count: number;
  }

  export interface TrainingEvent {
    id: number;
    activity_id: number;
    count: number;
    timestamp: string;
  }

  let activities: Activity[] = [];
  let events: TrainingEvent[] = [];
  let loading = true;
  let error: string | null = null;
  let showEventList = false;
  let showCharts = false;

  async function fetchData() {
    error = null;
    try {
      const [activitiesRes, eventsRes] = await Promise.all([
        authFetch('/api/activities'),
        authFetch('/api/events/all'),
      ]);

      if (!activitiesRes.ok || !eventsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      activities = await activitiesRes.json();
      events = await eventsRes.json();
    } catch (err: any) {
      console.error('Error fetching data:', err);
      error = err.message;
    }
  finally {
      loading = false;
    }
  }

  onMount(fetchData);
</script>

<div class="dashboard-container">
  {#if loading}
    <p>Loading...</p>
  {:else if error}
    <p style="color: var(--error-color);">{error}</p>
  {:else}
    <div class="dashboard-grid">
      <div class="card">
        <EventForm {activities} on:eventAdded={fetchData} />
        <div class="button-group">
          <button on:click={() => (showEventList = !showEventList)}>
            {showEventList ? m.hideEventList() : m.showEventList()}
          </button>
          <button on:click={() => (showCharts = !showCharts)}>
            {showCharts ? m.hideCharts() : m.showCharts()}
          </button>
          <ExportButton {activities} {events} />
        </div>
      </div>
      {#if showEventList}
        <div class="card event-list-card">
          <EventList {activities} isVisible={showEventList} on:eventChanged={fetchData} />
        </div>
      {/if}
    </div>
    {#if showCharts}
      <div class="card full-width-card" style="margin-top: 1.5rem;">
        <DataCharts {activities} isVisible={showCharts} />
      </div>
    {/if}
    <div class="card full-width-card" style="margin-top: 1.5rem;">
      <ActivityProgress {activities} {events} on:activityChanged={fetchData} />
    </div>
  {/if}
</div>