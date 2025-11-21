<script lang="ts">
  import { authFetch } from '$lib/auth';
  import type { Activity } from '../../routes/+page.svelte';
  import { m } from '../paraglide/messages.js';

  let {
    events = [],
    activities = [],
    totalEvents = 0,
    page = 1,
    limit = 10,
    onPageChange = (newPage: number) => {},
    onEventDeleted = () => {},
    onEventUpdated = () => {}
  }: {
    events?: any[];
    activities?: Activity[];
    totalEvents?: number;
    page?: number;
    limit?: number;
    onPageChange?: (newPage: number) => void;
    onEventDeleted?: () => void;
    onEventUpdated?: () => void;
  } = $props();

  let editingEventId: number | null = $state(null);
  let editReps: number = $state(0);
  let editTimestamp: string = $state('');
  let editActivityId: number | null = $state(null);
  let error: string | null = $state(null);

  let totalPages = $derived(Math.ceil(totalEvents / limit));

  function formatDate(timestamp: string) {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  async function handleDelete(eventId: number) {
    if (!window.confirm($m.confirmDeleteEvent)) return;
    error = null;
    try {
      const response = await authFetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete event');
      }
      onEventDeleted();
    } catch (err: any) {
      error = err.message;
    }
  }

  function handleEditClick(event: any) {
    editingEventId = event.id;
    editReps = event.count;
    editTimestamp = event.timestamp.slice(0, 16); // Format for datetime-local input
    editActivityId = event.activity_id;
  }

  function handleCancelEdit() {
    editingEventId = null;
    error = null;
  }

  async function handleUpdate(eventId: number) {
    error = null;
    if (editReps <= 0) {
      error = 'Reps must be greater than 0.';
      return;
    }
    if (!editActivityId) {
      error = 'Activity must be selected.';
      return;
    }

    try {
      const response = await authFetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activity_id: editActivityId, count: editReps, timestamp: editTimestamp }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update event');
      }

      editingEventId = null;
      onEventUpdated();
    } catch (err: any) {
      error = err.message;
    }
  }

  function goToPage(newPage: number) {
    if (newPage > 0 && newPage <= totalPages) {
      onPageChange(newPage);
    }
  }
</script>

<div class="event-list-container">
  <h3>{$m.eventList}</h3>
  {#if error}
    <p style="color: var(--error-color);">{error}</p>
  {/if}

  {#if events.length === 0}
    <p>{$m.noEventsYet}</p>
  {:else}
    <div class="table-responsive">
      <table class="event-table">
        <thead>
          <tr>
            <th class="col-activity">{$m.activityName}</th>
            <th class="col-reps">{$m.reps}</th>
            <th class="col-datetime">{$m.dateTime}</th>
            <th class="col-actions">{$m.actions}</th>
          </tr>
        </thead>
        <tbody>
          {#each events as event (event.id)}
            <tr>
              <td>
                {#if editingEventId === event.id}
                  <select bind:value={editActivityId}>
                    {#each activities as activity}
                      <option value={activity.id}>{activity.name}</option>
                    {/each}
                  </select>
                {:else}
                  {activities.find(a => a.id === event.activity_id)?.name || 'Unknown'}
                {/if}
              </td>
              <td>
                {#if editingEventId === event.id}
                  <input type="number" bind:value={editReps} min="1" inputmode="numeric" pattern="[0-9]*" />
                {:else}
                  {event.count}
                {/if}
              </td>
              <td>
                {#if editingEventId === event.id}
                  <input type="datetime-local" bind:value={editTimestamp} />
                {:else}
                  {formatDate(event.timestamp)}
                {/if}
              </td>
              <td>
                {#if editingEventId === event.id}
                  <button class="btn-small" onclick={() => handleUpdate(event.id)}>{$m.updateEvent}</button>
                  <button class="btn-small" onclick={handleCancelEdit}>{$m.cancel}</button>
                {:else}
                  <button class="btn-small" onclick={() => handleEditClick(event)}>{$m.edit}</button>
                  <button class="btn-small" onclick={() => handleDelete(event.id)}>{$m.delete}</button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="pagination-controls">
      <button onclick={() => goToPage(page - 1)} disabled={page === 1}>{$m.previous}</button>
      <span>{$m.page} {page} / {totalPages}</span>
      <button onclick={() => goToPage(page + 1)} disabled={page === totalPages}>{$m.next}</button>
    </div>
  {/if}
</div>
