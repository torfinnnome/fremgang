<script lang="ts">
  import { onMount } from 'svelte';
  import { authFetch } from '$lib/auth';
  import EventForm from '$lib/components/EventForm.svelte';
  import EventList from '$lib/components/EventList.svelte';
  import DataCharts from '$lib/components/DataCharts.svelte';
  import ActivityProgress from '$lib/components/ActivityProgress.svelte';
  import ExportButton from '$lib/components/ExportButton.svelte';
  import { m } from '$lib/paraglide/messages.js';

  export type Activity = {
    id: number;
    name: string;
    target_count: number;
  };

  export type TrainingEvent = {
    id: number;
    activity_id: number;
    count: number;
    timestamp: string;
  };

  let activities: Activity[] = [];
  let events: TrainingEvent[] = [];
  let allEvents: TrainingEvent[] = [];
  let loading = true;
  let error: string | null = null;
  let showEventList = false;
  let showCharts = false;
  let currentPage = 1;
  const eventsPerPage = 10;

  async function fetchData() {
    error = null;
    loading = true;
    let isUnauthorized = false;

    try {
      const [activitiesRes, eventsRes] = await Promise.all([
        authFetch('/api/activities'),
        authFetch('/api/events/all'),
      ]);

      // If we get a 401, authFetch will redirect to login, keep loading state
      if (activitiesRes.status === 401 || eventsRes.status === 401) {
        isUnauthorized = true;
        return;
      }

      if (!activitiesRes.ok || !eventsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      activities = await activitiesRes.json();
      allEvents = await eventsRes.json();
      events = allEvents; // Keep events in sync for now
      currentPage = 1; // Reset to first page when data changes
    } catch (err: any) {
      console.error('Error fetching data:', err);
      error = err.message;
    } finally {
      // Keep loading state if unauthorized (redirecting to login)
      if (!isUnauthorized) {
        loading = false;
      }
    }
  }

  function handlePageChange(newPage: number) {
    currentPage = newPage;
  }

  $: paginatedEvents = allEvents.slice((currentPage - 1) * eventsPerPage, currentPage * eventsPerPage);

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
        <EventForm {activities} on:eventLogged={fetchData} on:activityAdded={fetchData} />
        <div class="button-group">
          <button onclick={() => (showEventList = !showEventList)}>
            {showEventList ? $m.hideEventList : $m.showEventList}
          </button>
          <button onclick={() => (showCharts = !showCharts)}>
            {showCharts ? $m.hideCharts : $m.showCharts}
          </button>
          <ExportButton {activities} events={allEvents} />
        </div>
      </div>
      {#if showEventList}
        <div class="card event-list-card">
          <EventList
            events={paginatedEvents}
            {activities}
            totalEvents={allEvents.length}
            page={currentPage}
            limit={eventsPerPage}
            onPageChange={handlePageChange}
            onEventDeleted={fetchData}
            onEventUpdated={fetchData}
          />
        </div>
      {/if}
    </div>
    {#if showCharts}
      <div class="card full-width-card" style="margin-top: 1.5rem;">
        <DataCharts {activities} events={allEvents} />
      </div>
    {/if}
    <div class="card full-width-card" style="margin-top: 1.5rem;">
      <ActivityProgress {activities} events={allEvents} on:activityChanged={fetchData} />
    </div>
  {/if}
</div>

<style>
  .button-group {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin-top: 1rem;
  }

  @media (max-width: 768px) {
    .button-group {
      grid-template-columns: 1fr;
    }
  }
</style>