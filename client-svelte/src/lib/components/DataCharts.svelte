<script lang="ts">
  import { Chart, registerables } from 'chart.js';
  import { onMount, onDestroy } from 'svelte';
  import type { Activity } from '../../routes/+page.svelte';
  import { m } from '../paraglide/messages.js';

  Chart.register(...registerables);

  let { activities = [], events = [] }: {
    activities?: Activity[];
    events?: any[];
  } = $props();

  let activityFilter: number | null = $state(null);
  let chartType: 'volume' | 'timeOfDay' = $state('volume');
  let timePeriod: 'all' | 'year' | 'month' | 'week' = $state('all');
  let timeOffset: number = $state(0); // 0 = current period, -1 = previous period, etc.

  let volumeChartCanvas: HTMLCanvasElement = $state()!;
  let timeOfDayChartCanvas: HTMLCanvasElement = $state()!;
  let volumeChart: Chart | null = null;
  let timeOfDayChart: Chart | null = null;

  function navigatePrevious() {
    timeOffset--;
  }

  function navigateNext() {
    if (timeOffset < 0) {
      timeOffset++;
    }
  }

  function resetTimeOffset() {
    timeOffset = 0;
  }

  // Reset offset when period changes
  $effect(() => {
    timePeriod;
    timeOffset = 0;
  });

  let filteredEvents = $derived(activityFilter
    ? events.filter((e) => e.activity_id === activityFilter)
    : events);

  let allActivityNames = $derived(activities.reduce((acc, activity) => {
    acc[activity.id] = activity.name;
    return acc;
  }, {}));

  function setupVolumeChart() {
    if (!volumeChartCanvas) return;
    if (volumeChart) volumeChart.destroy();

    const data = processVolumeData(filteredEvents, timePeriod, timeOffset);
    try {
      volumeChart = new Chart(volumeChartCanvas, {
      type: 'bar',
      data: {
        labels: data.map((row) => row.date),
        datasets: [
          {
            label: $m.totalReps,
            data: data.map((row) => row.reps),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            stacked: true,
            ticks: {
              font: {
                size: 16
              }
            }
          },
          y: {
            beginAtZero: true,
            stacked: true,
            ticks: {
              font: {
                size: 16
              }
            }
          },
        },
        plugins: {
          title: {
            display: true,
            text: `${activityFilter ? allActivityNames[activityFilter] : 'All Activities'} - ${$m.workoutVolumeTitle}`,
            font: {
              size: 20,
              weight: 'bold'
            }
          },
          legend: {
            labels: {
              font: {
                size: 16
              }
            }
          }
        },
      },
    });
    } catch (error) {
      console.error('Failed to create chart:', error);
    }
  }

  function setupTimeOfDayChart() {
    if (!timeOfDayChartCanvas) return;
    if (timeOfDayChart) timeOfDayChart.destroy();

    const data = processTimeOfDayData(filteredEvents, timePeriod, timeOffset);
    try {
      timeOfDayChart = new Chart(timeOfDayChartCanvas, {
      type: 'bar',
      data: {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        datasets: [
          {
            label: $m.repsPerEvent,
            data: data,
            backgroundColor: 'rgba(153, 102, 255, 0.6)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              font: {
                size: 16
              }
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              font: {
                size: 16
              }
            }
          },
        },
        plugins: {
          title: {
            display: true,
            text: `${activityFilter ? allActivityNames[activityFilter] : 'All Activities'} - ${$m.timeOfDayTitle}`,
            font: {
              size: 20,
              weight: 'bold'
            }
          },
          legend: {
            labels: {
              font: {
                size: 16
              }
            }
          }
        },
      },
    });
    } catch (error) {
      console.error('Failed to create chart:', error);
    }
  }

  function processVolumeData(events: any[], period: 'all' | 'year' | 'month' | 'week', offset: number = 0) {
    const volumeMap = new Map<string, number>();
    const now = new Date();

    // Helper to get Monday of a week
    function getMonday(date: Date): Date {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    // Calculate the reference date based on offset
    let refDate = new Date(now);
    if (period === 'week') {
      refDate.setDate(now.getDate() + (offset * 7));
    } else if (period === 'month') {
      refDate.setMonth(now.getMonth() + offset);
    } else if (period === 'year') {
      refDate.setFullYear(now.getFullYear() + offset);
    } else if (period === 'all') {
      refDate.setDate(now.getDate() + (offset * 7)); // Navigate by weeks for "all"
    }

    // Process events and group by date
    events.forEach((event) => {
      const eventDate = new Date(event.timestamp);
      let key = '';
      let include = false;

      switch (period) {
        case 'year':
          // Group by month for the selected year
          if (eventDate.getFullYear() === refDate.getFullYear()) {
            key = `${eventDate.getFullYear()}-${(eventDate.getMonth() + 1).toString().padStart(2, '0')}`;
            include = true;
          }
          break;
        case 'month':
          // Group by day for the selected month
          if (eventDate.getFullYear() === refDate.getFullYear() && eventDate.getMonth() === refDate.getMonth()) {
            key = eventDate.toISOString().slice(0, 10); // YYYY-MM-DD
            include = true;
          }
          break;
        case 'week':
          // Group by day for the selected week (Monday to Sunday)
          const monday = getMonday(refDate);
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          sunday.setHours(23, 59, 59, 999);

          if (eventDate >= monday && eventDate <= sunday) {
            key = eventDate.toISOString().slice(0, 10); // YYYY-MM-DD
            include = true;
          }
          break;
        case 'all':
        default:
          // Group by week for the last 12 weeks from refDate
          const monday12WeeksAgo = getMonday(refDate);
          monday12WeeksAgo.setDate(monday12WeeksAgo.getDate() - (11 * 7));
          const sundayRefWeek = new Date(getMonday(refDate));
          sundayRefWeek.setDate(sundayRefWeek.getDate() + 6);
          sundayRefWeek.setHours(23, 59, 59, 999);

          if (eventDate >= monday12WeeksAgo && eventDate <= sundayRefWeek) {
            const eventMonday = getMonday(eventDate);
            key = eventMonday.toISOString().slice(0, 10);
            include = true;
          }
          break;
      }

      if (include && key) {
        volumeMap.set(key, (volumeMap.get(key) || 0) + event.count);
      }
    });

    // Fill in missing dates/periods with zeros
    const sortedData: { date: string; reps: number }[] = [];

    if (period === 'week') {
      // Create all 7 days of the selected week (Mon-Sun)
      const monday = getMonday(refDate);
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const key = date.toISOString().slice(0, 10);
        const dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i];
        sortedData.push({
          date: dayName,
          reps: volumeMap.get(key) || 0
        });
      }
    } else if (period === 'month') {
      // Create all days in the selected month
      const year = refDate.getFullYear();
      const month = refDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const key = date.toISOString().slice(0, 10);
        sortedData.push({
          date: `${day}`,
          reps: volumeMap.get(key) || 0
        });
      }
    } else if (period === 'year') {
      // Create all 12 months for the selected year
      const year = refDate.getFullYear();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      for (let month = 0; month < 12; month++) {
        const key = `${year}-${(month + 1).toString().padStart(2, '0')}`;
        sortedData.push({
          date: monthNames[month],
          reps: volumeMap.get(key) || 0
        });
      }
    } else {
      // 'all' - show 12 weeks
      const mondayRef = getMonday(refDate);
      for (let i = 11; i >= 0; i--) {
        const monday = new Date(mondayRef);
        monday.setDate(mondayRef.getDate() - (i * 7));
        const key = monday.toISOString().slice(0, 10);
        const weekLabel = `${monday.getMonth() + 1}/${monday.getDate()}`;
        sortedData.push({
          date: weekLabel,
          reps: volumeMap.get(key) || 0
        });
      }
    }

    return sortedData;
  }

  function processTimeOfDayData(events: any[], period: 'all' | 'year' | 'month' | 'week', offset: number = 0) {
    const timeOfDayCounts = new Array(24).fill(0);
    const now = new Date();

    // Helper to get Monday of a week
    function getMonday(date: Date): Date {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    // Calculate the reference date based on offset
    let refDate = new Date(now);
    if (period === 'week') {
      refDate.setDate(now.getDate() + (offset * 7));
    } else if (period === 'month') {
      refDate.setMonth(now.getMonth() + offset);
    } else if (period === 'year') {
      refDate.setFullYear(now.getFullYear() + offset);
    } else if (period === 'all') {
      refDate.setDate(now.getDate() + (offset * 7));
    }

    events.forEach((event) => {
      const eventDate = new Date(event.timestamp);
      let include = false;

      switch (period) {
        case 'year':
          if (eventDate.getFullYear() === refDate.getFullYear()) {
            include = true;
          }
          break;
        case 'month':
          if (eventDate.getFullYear() === refDate.getFullYear() && eventDate.getMonth() === refDate.getMonth()) {
            include = true;
          }
          break;
        case 'week':
          const monday = getMonday(refDate);
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          sunday.setHours(23, 59, 59, 999);

          if (eventDate >= monday && eventDate <= sunday) {
            include = true;
          }
          break;
        case 'all':
        default:
          const monday12WeeksAgo = getMonday(refDate);
          monday12WeeksAgo.setDate(monday12WeeksAgo.getDate() - (11 * 7));
          const sundayRefWeek = new Date(getMonday(refDate));
          sundayRefWeek.setDate(sundayRefWeek.getDate() + 6);
          sundayRefWeek.setHours(23, 59, 59, 999);

          if (eventDate >= monday12WeeksAgo && eventDate <= sundayRefWeek) {
            include = true;
          }
          break;
      }

      if (include) {
        const hour = eventDate.getHours();
        timeOfDayCounts[hour] += event.count;
      }
    });
    return timeOfDayCounts;
  }

  $effect(() => {
    // Setup volume chart when relevant dependencies change
    // Must directly access all reactive dependencies for tracking
    if (chartType === 'volume' && volumeChartCanvas) {
      // Access dependencies to track them
      timePeriod;
      timeOffset;
      filteredEvents.length;
      activityFilter;
      setupVolumeChart();
    }
  });

  $effect(() => {
    // Setup time of day chart when relevant dependencies change
    if (chartType === 'timeOfDay' && timeOfDayChartCanvas) {
      // Access dependencies to track them
      timePeriod;
      timeOffset;
      filteredEvents.length;
      activityFilter;
      setupTimeOfDayChart();
    }
  });

  onDestroy(() => {
    if (volumeChart) volumeChart.destroy();
    if (timeOfDayChart) timeOfDayChart.destroy();
  });
</script>

<div class="charts-container">
  <h3>{$m.charts}</h3>
  <div class="chart-controls">
    <div class="chart-control-group">
      <label for="activityFilter">{$m.selectActivityToView}:</label>
      <select id="activityFilter" bind:value={activityFilter}>
        <option value={null}>{$m.all}</option>
        {#each activities as activity}
          <option value={activity.id}>{activity.name}</option>
        {/each}
      </select>
    </div>

    <div class="chart-control-group">
      <span class="chart-control-label">{$m.chartType}:</span>
      <div class="chart-buttons">
        <button onclick={() => chartType = 'volume'} disabled={chartType === 'volume'}>{$m.volume}</button>
        <button onclick={() => chartType = 'timeOfDay'} disabled={chartType === 'timeOfDay'}>{$m.timeOfDay}</button>
      </div>
    </div>

    <div class="chart-control-group">
      <span class="chart-control-label">{$m.period}:</span>
      <div class="chart-buttons">
        <button onclick={() => timePeriod = 'week'} disabled={timePeriod === 'week'}>{$m.week}</button>
        <button onclick={() => timePeriod = 'month'} disabled={timePeriod === 'month'}>{$m.month}</button>
        <button onclick={() => timePeriod = 'year'} disabled={timePeriod === 'year'}>{$m.year}</button>
        <button onclick={() => timePeriod = 'all'} disabled={timePeriod === 'all'}>{$m.all}</button>
      </div>
    </div>

    <div class="chart-control-group">
      <span class="chart-control-label">{$m.navigate}:</span>
      <div class="chart-buttons">
        <button onclick={navigatePrevious}>{$m.previous}</button>
        <button onclick={resetTimeOffset} disabled={timeOffset === 0}>Current</button>
        <button onclick={navigateNext} disabled={timeOffset >= 0}>{$m.next}</button>
      </div>
    </div>
  </div>

  {#if chartType === 'volume'}
    <div class="chart-placeholder" style="height: 300px;">
      <canvas bind:this={volumeChartCanvas}></canvas>
    </div>
  {:else if chartType === 'timeOfDay'}
    <div class="chart-placeholder" style="height: 300px;">
      <canvas bind:this={timeOfDayChartCanvas}></canvas>
    </div>
  {/if}
</div>