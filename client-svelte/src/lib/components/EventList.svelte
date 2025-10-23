<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { authFetch } from '$lib/auth';
  import type { Activity, TrainingEvent } from '../routes/+page.svelte';
  import * as m from '$lib/paraglide/messages';

  export let activities: Activity[] = [];
  export let isVisible: boolean = false;

  const dispatch = createEventDispatcher();

  let events: TrainingEvent[] = [];
  let loadingEvents = false;
  let eventsError: string | null = null;
  let currentPage = 1;
  let totalPages = 0;

  let editingEventId: number | null = null;
  let editCount: string = '';
  let editTimestamp: Date = new Date();
  let editActivityId: string = '';
  let error: string | null = null;

  const activityMap = new Map(activities.map(act => [act.id, act.name]));

  async function fetchEvents(page = 1) {
    if (!isVisible) return;
    loadingEvents = true;
    eventsError = null;
    try {
      const response = await authFetch(`/api/events?page=${page}&limit=10`);
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const data = await response.json();
      events = data.events;
      currentPage = data.page;
      totalPages = Math.ceil(data.totalEvents / data.limit);
    } catch (err: any) {
      eventsError = err.message;
    }
    finally {
      loadingEvents = false;
    }
  }

  onMount(() => {
    if (isVisible) {
      fetchEvents(currentPage);
    }
  });

  async function handleDelete(eventId: number) {
    if (!window.confirm(m.confirmDeleteEvent())) return;

    error = null;
    try {
      const response = await authFetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete event');
      }

      if (events.length === 1 && currentPage > 1) {
        fetchEvents(currentPage - 1);
      } else {
        fetchEvents(currentPage);
      }
      dispatch('eventChanged');
    } catch (err: any) {
      error = err.message;
    }
  }

  function handleEditClick(event: TrainingEvent) {
    editingEventId = event.id;
    editCount = event.count.toString();
    editTimestamp = new Date(event.timestamp);
    editActivityId = event.activity_id.toString();
  }

  async function handleUpdate(eventId: number) {
    error = null;
    try {
      const response = await authFetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activity_id: parseInt(editActivityId),
          count: parseInt(editCount),
          timestamp: editTimestamp.toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update event');
      }

      editingEventId = null;
      fetchEvents(currentPage);
      dispatch('eventChanged');
    } catch (err: any) {
      error = err.message;
    }
  }

  function handleCancelEdit() {
    editingEventId = null;
    error = null;
  }
</script>

<div class="event-list-container">
  <style>
    .pagination-controls {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
      margin-top: 1rem;
    }
  </style>
  <h3>{m.eventList()}</h3>
  {#if error}
    <p style="color: var(--error-color);">{error}</p>
  {/if}
  <div class="event-list-table-wrapper">
    <table class="event-list-table">
      <thead>
        <tr>
          <th class="col-activity">{m.activityName()}</th>
          <th class="col-reps">{m.reps()}</th>
          <th class="col-datetime">{m.dateTime()}</th>
          <th class="col-actions">{m.actions()}</th>
        </tr>
      </thead>
      <tbody>
        {#each events as event (event.id)}
          {#if editingEventId === event.id}
            <tr class="editing-row">
              <td class="col-activity">
                <select bind:value={editActivityId} style="width: 100%;">
                  {#each activities as activity}
                    <option value={activity.id}>{activity.name}</option>
                  {/each}
                </select>
              </td>
              <td class="col-reps">
                <input type="number" bind:value={editCount} style="width: 60px;" />
              </td>
              <td class="col-datetime">
                <input type="datetime-local" bind:value={editTimestamp} />
              </td>
              <td class="col-actions">
                <button class="btn-small" on:click={() => handleUpdate(event.id)}>{m.updateEvent()}</button>
                <button class="btn-small" on:click={handleCancelEdit}>{m.cancel()}</button>
              </td>
            </tr>
          {:else}
            <tr>
              <td class="col-activity">{activityMap.get(event.activity_id) || 'Unknown'}</td>
              <td class="col-reps">{event.count}</td>
              <td class="col-datetime">
                <div class="datetime-display">
                  <span class="date-part">{new Date(event.timestamp).toISOString().slice(0, 10)}</span>
                  <span class="time-part">{new Date(event.timestamp).toISOString().slice(11, 19)}</span>
                </div>
              </td>
              <td class="col-actions">
                <button class="btn-small" on:click={() => handleEditClick(event)}>{m.edit()}</button>
                <button class="btn-small" on:click={() => handleDelete(event.id)}>{m.deleteMessage()}</button>
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  </div>
  <div class="pagination-controls">
    <button on:click={() => fetchEvents(currentPage - 1)} disabled={currentPage <= 1}>
      {m.previous()}
    </button>
    <span>{m.page()} {currentPage} / {totalPages}</span>
    <button on:click={() => fetchEvents(currentPage + 1)} disabled={currentPage >= totalPages}>
      {m.next()}
    </button>
  </div>
</div>
