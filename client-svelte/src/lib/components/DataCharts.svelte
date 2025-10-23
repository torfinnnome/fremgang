<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import type { Activity, TrainingEvent } from '../routes/+page.svelte';
  import { authFetch } from '$lib/auth';
  import * as m from '$lib/paraglide/messages';

  export let activities: Activity[] = [];
  export let isVisible: boolean = false;

  type ChartType = 'volume' | 'timeOfDay';
  type TimePeriod = 'week' | 'month' | 'year' | 'all';

  let chart: Chart;
  let chartCanvas: HTMLCanvasElement;

  let primaryColor: string = '';
  let events: TrainingEvent[] = [];
  let loadingCharts = false;
  let chartsError: string | null = null;

  let chartType: ChartType = 'volume';
  let timePeriod: TimePeriod = 'month';
  let selectedActivityId: string = '';
  let dateOffset = 0;

  let startDate: Date = new Date(0); // Declare startDate here

  async function fetchEvents() {
    if (!isVisible) return;
    loadingCharts = true;
    chartsError = null;
    try {
      const response = await authFetch('/api/events/all');
      if (!response.ok) {
        throw new Error('Failed to fetch events for charts');
      }
      events = await response.json();
    } catch (err: any) {
      chartsError = err.message;
    } finally {
      loadingCharts = false;
    }
  }

  onMount(() => {
    primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    Chart.register(...registerables);
    fetchEvents();
  });

  $: {
    if (activities.length > 0 && !selectedActivityId) {
      selectedActivityId = activities[0].id.toString();
    }
  }

  let filteredEvents: TrainingEvent[] = [];
  $: {
                      if (selectedActivityId) {
                        const activitySpecificEvents = events.filter(e => e.activity_id.toString() === selectedActivityId.toString());
                        const now = new Date();
                        now.setHours(0, 0, 0, 0); // Normalize to start of day
                
                        switch (timePeriod) {
                          case 'week':
                            now.setDate(now.getDate() + (dateOffset * 7));
                            startDate = new Date(now);
                            const dayOfWeek = startDate.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
                            const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday (0), diff is 6 days back. Otherwise, diff is dayOfWeek - 1.
                            startDate.setDate(startDate.getDate() - diffToMonday);
                            break;
                          case 'month':
                            now.setMonth(now.getMonth() + dateOffset);
                            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                            break;
                          case 'year':
                            now.setFullYear(now.getFullYear() + dateOffset);
                            startDate = new Date(now.getFullYear(), 0, 1);
                            break;
                          case 'all':
                          default:
                            startDate = new Date(0); // All time
                        }
                        filteredEvents = activitySpecificEvents.filter(e => new Date(e.timestamp) >= startDate);
                      } else {
                        filteredEvents = [];
                      }  }

  let chartData: any;
  $: {
    const selectedActivity = activities.find(a => a.id.toString() === selectedActivityId.toString());
    const activityName = selectedActivity ? selectedActivity.name : '';

    if (chartType === 'volume') {
      const data: { [key: string]: number } = {};
      filteredEvents.forEach(event => {
        const d = new Date(event.timestamp);
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        const date = `${year}-${month}-${day}`;
        if (!data[date]) {
          data[date] = 0;
        }
        data[date] += event.count;
      });

      let allDates: string[] = [];
      const periodEndDate = new Date(startDate);

      if (timePeriod === 'week') {
        periodEndDate.setDate(periodEndDate.getDate() + 6);
      } else if (timePeriod === 'month') {
        periodEndDate.setMonth(periodEndDate.getMonth() + 1);
        periodEndDate.setDate(periodEndDate.getDate() - 1);
      } else if (timePeriod === 'year') {
        periodEndDate.setFullYear(periodEndDate.getFullYear() + 1);
        periodEndDate.setDate(periodEndDate.getDate() - 1);
      }

      if (timePeriod === 'week' || timePeriod === 'month' || timePeriod === 'year') {
        for (let d = new Date(startDate); d <= periodEndDate; d.setDate(d.getDate() + 1)) {
          const year = d.getFullYear();
          const month = (d.getMonth() + 1).toString().padStart(2, '0');
          const day = d.getDate().toString().padStart(2, '0');
          allDates.push(`${year}-${month}-${day}`);
        }
      } else {
        // For 'all', just use the dates that have data
        allDates = Object.keys(data).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      }

      const chartLabels = allDates;
      const chartValues = allDates.map(date => data[date] || 0);

      chartData = {
        type: 'bar',
        data: {
          labels: chartLabels,
          datasets: [{
            label: m.totalReps(),
            data: chartValues,
            backgroundColor: `hsl(${primaryColor})`,
          }]
        },
        options: {
          plugins: { title: { display: true, text: `${activityName} - ${m.workoutVolumeTitle()}` } },
          maintainAspectRatio: true,
        }
      };
    } else {
      chartData = {
        type: 'scatter',
        data: {
          datasets: [{
            label: m.repsPerEvent(),
            data: filteredEvents.map(event => ({
              x: new Date(event.timestamp).getHours() + new Date(event.timestamp).getMinutes() / 60,
              y: event.count
            })),
            backgroundColor: `hsl(${primaryColor})`,
            pointRadius: 5,
            pointBackgroundColor: `hsl(${primaryColor})`,
            pointBorderColor: 'hsl(var(--secondary-foreground))',
          }]
        },
        options: {
          plugins: { title: { display: true, text: `${activityName} - ${m.timeOfDayTitle()}` } },
          scales: { x: { type: 'linear', position: 'bottom', min: 0, max: 24 } },
          maintainAspectRatio: true,
        }
      };
    }
  }

  afterUpdate(() => {
    if (chart) {
      chart.destroy();
    }
    if (chartCanvas && chartData) {
      chart = new Chart(chartCanvas, chartData);
    }
  });
</script>

<div class="charts-container">
  <h3>{m.charts()}</h3>
  <div class="chart-select-container">
    <label for="activityFilter">{m.selectActivityToView()}:</label>
    <select
      id="activityFilter"
      bind:value={selectedActivityId}
      style="width: 100%; max-width: 300px; padding: 0.5rem; margin-top: 0.5rem;"
    >
      <option value="">{m.selectActivityToView()}</option>
      {#each activities as activity}
        <option value={activity.id}>
          {activity.name}
        </option>
      {/each}
    </select>
  </div>

  {#if selectedActivityId}
    <div>
      <div class="chart-controls">
        <div class="chart-control-group">
          <span class="chart-control-label">{m.chartType()}:</span>
          <div class="chart-buttons">
            <button on:click={() => chartType = 'volume'} disabled={chartType === 'volume'}>{m.volume()}</button>
            <button on:click={() => chartType = 'timeOfDay'} disabled={chartType === 'timeOfDay'}>{m.timeOfDay()}</button>
          </div>
        </div>
        <div class="chart-control-group">
          <span class="chart-control-label">{m.period()}:</span>
          <div class="chart-buttons">
            <button on:click={() => timePeriod = 'week'} disabled={timePeriod === 'week'}>{m.week()}</button>
            <button on:click={() => timePeriod = 'month'} disabled={timePeriod === 'month'}>{m.month()}</button>
            <button on:click={() => timePeriod = 'year'} disabled={timePeriod === 'year'}>{m.year()}</button>
            <button on:click={() => timePeriod = 'all'} disabled={timePeriod === 'all'}>{m.all()}</button>
          </div>
        </div>
        <div class="chart-control-group">
            <span class="chart-control-label">Navigate:</span>
            <div class="chart-buttons">
                <button on:click={() => dateOffset--}>&lt; Previous</button>
                <button on:click={() => dateOffset++} disabled={dateOffset === 0}>Next &gt;</button>
            </div>
        </div>
      </div>

      <div class="chart-display">
        <canvas bind:this={chartCanvas}></canvas>
      </div>
    </div>
  {:else}
    <p>{m.selectActivityToView()}</p>
  {/if}
</div>
