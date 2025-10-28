<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { authFetch } from '$lib/auth';
  import { get } from 'svelte/store';
  import { token } from '$lib/auth';
  import { m } from '../paraglide/messages.js';

  export let activities: { id: number; name: string; target_count: number }[] = [];

  const dispatch = createEventDispatcher();

  let selectedActivityId: number | null = null;
  let reps: number | null = null;
  let newActivityName: string = '';
  let newActivityTargetCount: number = 0;
  let showNewActivityForm: boolean = false;
  let error: string | null = null;

  const ADD_NEW_ACTIVITY_VALUE = 'add_new';

  async function handleLogEvent() {
    error = null;
    if (selectedActivityId === null) {
      error = 'Please select an activity.';
      return;
    }
    if (reps === null || reps <= 0) {
      error = 'Reps must be greater than 0.';
      return;
    }

    try {
      const response = await authFetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activity_id: selectedActivityId, count: reps }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to log event');
      }

      reps = null;
      dispatch('eventLogged');
    } catch (err: any) {
      error = err.message;
    }
  }

  async function handleAddNewActivity() {
    error = null;
    if (!newActivityName.trim()) {
      error = 'Activity name cannot be empty.';
      return;
    }

    try {
      const response = await authFetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newActivityName, target_count: newActivityTargetCount }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to add activity');
      }

      newActivityName = '';
      newActivityTargetCount = 0;
      showNewActivityForm = false;
      dispatch('activityAdded');
    } catch (err: any) {
      error = err.message;
    }
  }

  function handleActivitySelect(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    if (value === ADD_NEW_ACTIVITY_VALUE) {
      showNewActivityForm = true;
      selectedActivityId = null;
    } else {
      showNewActivityForm = false;
      selectedActivityId = Number(value);
    }
  }
</script>

<div class="event-form-container">
  <h3>{$m.logEvent}</h3>
  {#if error}
    <p style="color: var(--error-color);">{error}</p>
  {/if}

  {#if showNewActivityForm}
    <div class="new-activity-form">
      <label for="newActivityName">{$m.activityName}</label>
      <input
        type="text"
        id="newActivityName"
        bind:value={newActivityName}
        placeholder="e.g., Push-ups"
      />

      <label for="targetCount">{$m.targetCount} (optional)</label>
      <input
        type="number"
        id="targetCount"
        bind:value={newActivityTargetCount}
        min="0"
        placeholder="0"
      />

      <button on:click={handleAddNewActivity}>{$m.addActivity}</button>
      <button on:click={() => showNewActivityForm = false}>{$m.cancel}</button>
    </div>
  {:else}
    <div class="log-event-form">
      <label for="activitySelect">{$m.selectActivity}</label>
      <select id="activitySelect" on:change={handleActivitySelect}>
        <option value="">-- {$m.selectActivity} --</option>
        {#each activities as activity}
          <option value={activity.id}>{activity.name}</option>
        {/each}
        <option value={ADD_NEW_ACTIVITY_VALUE}>{$m.addNewActivity}...</option>
      </select>

      <label for="reps">{$m.reps}</label>
      <input type="number" id="reps" bind:value={reps} placeholder="0" />

      <button on:click={handleLogEvent}>{$m.logEvent}</button>
    </div>
  {/if}
</div>
