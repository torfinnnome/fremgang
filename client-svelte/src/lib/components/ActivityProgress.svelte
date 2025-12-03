<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { authFetch } from '$lib/auth';
  import type { Activity, TrainingEvent } from '../routes/+page.svelte';
  import { m } from '../paraglide/messages.js';

  export let activities: Activity[] = [];
  export let events: TrainingEvent[] = [];

  const dispatch = createEventDispatcher();

  let editingActivityId: number | null = null;
  let editTargetCount: string = '';
  let error: string | null = null;

  function linearRegression(data: { x: number, y: number }[]) {
    const n = data.length;
    if (n < 2) {
      return { slope: 0, intercept: 0 };
    }

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (const point of data) {
      sumX += point.x;
      sumY += point.y;
      sumXY += point.x * point.y;
      sumXX += point.x * point.x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  function calculateEstimatedCompletion(activityId: number) {
    const eventArray = Array.isArray(events) ? events : (events as any)?.events || [];
    const activityEvents = eventArray.filter((event: TrainingEvent) => event.activity_id === activityId);
    if (activityEvents.length < 2) {
      return null;
    }

    const sortedEvents = activityEvents.sort((a: TrainingEvent, b: TrainingEvent) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const firstEventDate = new Date(sortedEvents[0].timestamp);

    const cumulativeData: { x: number, y: number }[] = [];
    let cumulativeReps = 0;
    sortedEvents.forEach((event: TrainingEvent) => {
      const eventDate = new Date(event.timestamp);
      const timeDiff = eventDate.getTime() - firstEventDate.getTime();
      const daysSinceFirstEvent = Math.ceil(timeDiff / (1000 * 3600 * 24));
      cumulativeReps += event.count;
      cumulativeData.push({ x: daysSinceFirstEvent, y: cumulativeReps });
    });

    const { slope, intercept } = linearRegression(cumulativeData);

    const activity = activities.find(act => act.id === activityId);
    if (!activity || activity.target_count <= 0) {
      return null;
    }

    const totalReps = cumulativeReps;
    if (activity.target_count - totalReps <= 0) {
      return $m.goalReached;
    }

    if (slope <= 0) {
      return $m.noProgress;
    }

    const daysToCompletion = (activity.target_count - intercept) / slope;

    const completionDate = new Date(firstEventDate);
    completionDate.setDate(firstEventDate.getDate() + Math.ceil(daysToCompletion));

    return completionDate.toISOString().slice(0, 10);
  }

  function calculateProgress(activityId: number, period: 'all' | 'year' | 'month' | 'week' | 'day') {
    const eventArray = Array.isArray(events) ? events : (events as any)?.events || [];
    const now = new Date();
    let startDate = new Date(0);

    switch (period) {
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'week':
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(now.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'all':
      default:
        startDate = new Date(0);
        break;
    }

    return eventArray.filter((event: TrainingEvent) => event.activity_id === activityId && new Date(event.timestamp) >= startDate)
                 .reduce((sum: number, event: TrainingEvent) => sum + event.count, 0);
  }

  async function handleUpdateTarget(activityId: number) {
    error = null;
    try {
      const activity = activities.find(act => act.id === activityId);
      if (!activity) {
        throw new Error('Activity not found');
      }

      const response = await authFetch(`/api/activities/${activityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: activity.name, target_count: parseInt(editTargetCount) }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update target');
      }

      editingActivityId = null;
      dispatch('activityChanged');
    } catch (err: any) {
      error = err.message;
    }
  }

  function handleEditClick(activity: Activity) {
    editingActivityId = activity.id;
    editTargetCount = activity.target_count.toString();
  }

  function handleCancelEdit() {
    editingActivityId = null;
    error = null;
  }

  async function handleDeleteActivity(activityId: number) {
    if (!confirm($m.confirmDeleteActivity)) {
      return;
    }
    error = null;
    try {
      const response = await authFetch(`/api/activities/${activityId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete activity');
      }

      dispatch('activityChanged');
    } catch (err: any) {
      error = err.message;
    }
  }
</script>

<div>
  <h3>{$m.activityProgress}</h3>
  {#if error}
    <p style="color: var(--error-color);">{error}</p>
  {/if}

  <div class="activity-progress-table-container">
    <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
      <thead>
        <tr style="border-bottom: 1px solid var(--on-surface-color);">
          <th style="padding: 0.5rem; text-align: left;">{$m.activityName}</th>
          <th style="padding: 0.5rem; text-align: left;">{$m.targetCount}</th>
          <th style="padding: 0.5rem; text-align: left;">{$m.missing}</th>
          <th style="padding: 0.5rem; text-align: left;">{$m.all}</th>
          <th style="padding: 0.5rem; text-align: left;">{$m.year}</th>
          <th style="padding: 0.5rem; text-align: left;">{$m.month}</th>
          <th style="padding: 0.5rem; text-align: left;">{$m.week}</th>
          <th style="padding: 0.5rem; text-align: left;">{$m.day}</th>
          <th style="padding: 0.5rem; text-align: left;">{$m.estCompletion}</th>
          <th style="padding: 0.5rem; text-align: left;">{$m.actions}</th>
        </tr>
      </thead>
      <tbody>
        {#each activities as activity (activity.id)}
          <tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 0.5rem;">{activity.name}</td>
            <td style="padding: 0.5rem;">
              {#if editingActivityId === activity.id}
                <input
                  type="number"
                  bind:value={editTargetCount}
                  min="0"
                  style="width: 80px; padding: 0.2rem;"
                />
              {:else}
                {activity.target_count}
              {/if}
            </td>
            <td style="padding: 0.5rem;">{activity.target_count > 0 ? activity.target_count - calculateProgress(activity.id, 'all') : ''}</td>
            <td style="padding: 0.5rem;">{calculateProgress(activity.id, 'all')}</td>
            <td style="padding: 0.5rem;">{calculateProgress(activity.id, 'year')}</td>
            <td style="padding: 0.5rem;">{calculateProgress(activity.id, 'month')}</td>
            <td style="padding: 0.5rem;">{calculateProgress(activity.id, 'week')}</td>
            <td style="padding: 0.5rem;">{calculateProgress(activity.id, 'day')}</td>
            <td style="padding: 0.5rem;">{calculateEstimatedCompletion(activity.id)}</td>
            <td style="padding: 0.5rem;">
              {#if editingActivityId === activity.id}
                <button onclick={() => handleUpdateTarget(activity.id)}>{$m.updateTarget}</button>
                <button onclick={handleCancelEdit} style="margin-left: 0.5rem;">{$m.cancel}</button>
              {:else}
                <button onclick={() => handleEditClick(activity)}>{$m.edit}</button>
                <button onclick={() => handleDeleteActivity(activity.id)} style="margin-left: 0.5rem;">{$m.delete}</button>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="activity-progress-cards-container">
    {#each activities as activity (activity.id)}
      <div class="activity-card">
        <h4 style="margin-top: 0; margin-bottom: 0.75rem;">{activity.name}</h4>
        <div class="activity-card-content">
          <div class="activity-card-row">
            <span class="activity-card-label">{$m.targetCount}:</span>
            {#if editingActivityId === activity.id}
              <input
                type="number"
                bind:value={editTargetCount}
                min="0"
                style="width: 80px; padding: 0.2rem;"
              />
            {:else}
              <span>{activity.target_count}</span>
            {/if}
          </div>
          <div class="activity-card-row">
            <span class="activity-card-label">{$m.missing}:</span>
            <span>{activity.target_count > 0 ? activity.target_count - calculateProgress(activity.id, 'all') : ''}</span>
          </div>
          <div class="activity-card-row">
            <span class="activity-card-label">{$m.all}:</span>
            <span>{calculateProgress(activity.id, 'all')}</span>
          </div>
          <div class="activity-card-row">
            <span class="activity-card-label">{$m.year}:</span>
            <span>{calculateProgress(activity.id, 'year')}</span>
          </div>
          <div class="activity-card-row">
            <span class="activity-card-label">{$m.month}:</span>
            <span>{calculateProgress(activity.id, 'month')}</span>
          </div>
          <div class="activity-card-row">
            <span class="activity-card-label">{$m.week}:</span>
            <span>{calculateProgress(activity.id, 'week')}</span>
          </div>
          <div class="activity-card-row">
            <span class="activity-card-label">{$m.day}:</span>
            <span>{calculateProgress(activity.id, 'day')}</span>
          </div>
          <div class="activity-card-row">
            <span class="activity-card-label">{$m.estCompletion}:</span>
            <span>{calculateEstimatedCompletion(activity.id)}</span>
          </div>
          <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
            {#if editingActivityId === activity.id}
              <button onclick={() => handleUpdateTarget(activity.id)}>{$m.updateTarget}</button>
              <button onclick={handleCancelEdit}>{$m.cancel}</button>
            {:else}
              <button onclick={() => handleEditClick(activity)}>{$m.edit}</button>
              <button onclick={() => handleDeleteActivity(activity.id)} style="margin-left: 0.5rem;">{$m.delete}</button>
            {/if}
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>