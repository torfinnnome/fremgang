<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { authFetch } from '$lib/auth';
  import type { Activity } from '../routes/+page.svelte';
  import * as m from '$lib/paraglide/messages';

  export let activities: Activity[] = [];

  const dispatch = createEventDispatcher();

  const ADD_NEW_ACTIVITY_VALUE = 'add-new';

  let selectedActivityId: string = '';
  let count: string = '';
  let newActivityName: string = '';
  let targetCount: string = '0';
  let isAddingNewActivity: boolean = false;
  let error: string | null = null;

  $: {
    const activityIds = activities.map(a => a.id.toString());
    if (activities.length > 0 && !activityIds.includes(selectedActivityId) && selectedActivityId !== ADD_NEW_ACTIVITY_VALUE) {
      selectedActivityId = activities[0].id.toString();
      isAddingNewActivity = false;
    } else if (activities.length === 0) {
      selectedActivityId = ADD_NEW_ACTIVITY_VALUE;
      isAddingNewActivity = true;
    }
  }

  function handleActivityChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    if (value === ADD_NEW_ACTIVITY_VALUE) {
      isAddingNewActivity = true;
      selectedActivityId = ADD_NEW_ACTIVITY_VALUE;
    } else {
      isAddingNewActivity = false;
      selectedActivityId = value;
    }
  }

  async function handleSubmit() {
    error = null;

    let activityToLogId = parseInt(selectedActivityId);

    if (isAddingNewActivity) {
      if (!newActivityName.trim()) {
        error = 'Activity name is required.';
        return;
      }
      try {
        const addActivityResponse = await authFetch('/api/activities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newActivityName, target_count: parseInt(targetCount) }),
        });

        const addActivityData = await addActivityResponse.json();

        if (!addActivityResponse.ok) {
          throw new Error(addActivityData.message || 'Failed to add new activity');
        }
        activityToLogId = addActivityData.id;
        newActivityName = '';
        targetCount = '0';
        isAddingNewActivity = false;
        selectedActivityId = activityToLogId.toString();
      } catch (err: any) {
        error = err.message;
        return;
      }
    } else if (!selectedActivityId) {
      error = 'Please select an activity or add a new one.';
      return;
    }

    if (!count || parseInt(count) <= 0) {
      error = 'Repetitions must be a positive number.';
      return;
    }

    try {
      const response = await authFetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activity_id: activityToLogId, count: parseInt(count), timestamp: new Date().toLocaleString('sv-SE') }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to log event');
      }

      count = '';
      dispatch('eventAdded');
    } catch (err: any) {
      error = err.message;
    }
  }
</script>

<form on:submit|preventDefault={handleSubmit}>
  <h3>{m.logEvent()}</h3>
  <div style="margin-bottom: 1rem;">
    <label for="activitySelect">{m.selectActivity()}</label>
    <select
      id="activitySelect"
      bind:value={selectedActivityId}
      on:change={handleActivityChange}
      required
      style="width: 100%; padding: 0.5rem; margin-top: 0.5rem;"
    >
      {#each activities as activity}
        <option value={String(activity.id)}>
          {activity.name}
        </option>
      {/each}
      <option value={ADD_NEW_ACTIVITY_VALUE}>{m.addNewActivity()}</option>
    </select>
  </div>

  {#if isAddingNewActivity}
    <div style="margin-bottom: 1rem;">
      <label for="newActivityName">{m.activityName()}</label>
      <input
        type="text"
        id="newActivityName"
        bind:value={newActivityName}
        required
        style="width: 100%; padding: 0.5rem; margin-top: 0.5rem;"
      />
    </div>
  {/if}

  {#if isAddingNewActivity}
    <div style="margin-bottom: 1rem;">
      <label for="targetCount">{m.targetCount()}</label>
      <input
        type="number"
        id="targetCount"
        bind:value={targetCount}
        min="0"
        style="width: 100%; padding: 0.5rem; margin-top: 0.5rem;"
      />
    </div>
  {/if}

  <div style="margin-bottom: 1rem;">
    <label for="reps">{m.reps()}</label>
    <input
      type="number"
      id="reps"
      bind:value={count}
      required
      min="1"
      style="width: 100%; padding: 0.5rem; margin-top: 0.5rem;"
    />
  </div>
  {#if error}
    <p style="color: var(--error-color);">{error}</p>
  {/if}
  <button type="submit" style="width: 100%; padding: 0.75rem;">
    {m.logEvent()}
  </button>
</form>
