const isStandaloneQuixoticHost = window.location.hostname.includes("resource-pulse-quixotic-site");
const DEFAULT_API_ORIGIN = isStandaloneQuixoticHost
  ? "https://resource-pulse-tracker.vercel.app"
  : "http://127.0.0.1:4000";
const isFilePreview = window.location.protocol === "file:";
const isNonAppLocalPreview =
  ["127.0.0.1", "localhost"].includes(window.location.hostname) &&
  window.location.port !== "" &&
  window.location.port !== "4000";
const API_ORIGIN =
  isStandaloneQuixoticHost || isFilePreview || isNonAppLocalPreview
    ? DEFAULT_API_ORIGIN
    : window.location.origin;

const STORAGE_KEYS = {
  settings: "resource-pulse-console-settings"
};

const resourceType = document.body.dataset.resourceType;
const resourceConfig = {
  water: {
    label: "Water",
    unit: "L",
    railCopy: "Deep dive into water usage, average load, and monthly distribution.",
    recommendation: "Shift cleaning and irrigation schedules away from your heaviest days to flatten water demand."
  },
  electricity: {
    label: "Electricity",
    unit: "kWh",
    railCopy: "Track demand, average usage, and monthly load behavior for electricity.",
    recommendation: "Move heavy electrical loads into staggered windows to reduce spikes and smooth demand."
  }
}[resourceType];

const state = {
  readings: [],
  settings: {
    darkMode: false,
    showToasts: true
  }
};

const elements = {
  toast: document.querySelector("#toast"),
  toastMessage: document.querySelector("#toastMessage"),
  resourceTitle: document.querySelector("#resourceTitle"),
  resourceSubtitle: document.querySelector("#resourceSubtitle"),
  resourceRailTitle: document.querySelector("#resourceRailTitle"),
  resourceRailCopy: document.querySelector("#resourceRailCopy"),
  detailTotalUsage: document.querySelector("#detailTotalUsage"),
  detailAverageUsage: document.querySelector("#detailAverageUsage"),
  detailCurrentMonthUsage: document.querySelector("#detailCurrentMonthUsage"),
  detailPeakUsage: document.querySelector("#detailPeakUsage"),
  detailTotalCost: document.querySelector("#detailTotalCost"),
  detailHeroValue: document.querySelector("#detailHeroValue"),
  detailActiveLocations: document.querySelector("#detailActiveLocations"),
  detailEntriesCount: document.querySelector("#detailEntriesCount"),
  detailRecommendation: document.querySelector("#detailRecommendation"),
  detailHistoryBody: document.querySelector("#detailHistoryBody"),
  monthlyChart: document.querySelector("#resourceMonthlyChart"),
  trendChart: document.querySelector("#resourceTrendChart"),
  locationChart: document.querySelector("#resourceLocationChart"),
  pageLinks: [...document.querySelectorAll("[data-page-link]")],
  actionButtons: [...document.querySelectorAll("[data-action]")]
};

let toastTimeout;
let monthlyChartInstance;
let trendChartInstance;
let locationChartInstance;

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function loadPreferences() {
  state.settings = {
    ...state.settings,
    ...safeParse(localStorage.getItem(STORAGE_KEYS.settings), {})
  };
}

function persistSettings() {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
}

function applyTheme() {
  document.body.classList.toggle("dark-mode", state.settings.darkMode);
}

function syncPageLinks() {
  const currentPage = document.body.dataset.page;
  elements.pageLinks.forEach((link) => {
    link.classList.toggle("rail-link--active", link.dataset.pageLink === currentPage);
  });
}

function showToast(message) {
  if (!state.settings.showToasts) {
    return;
  }

  clearTimeout(toastTimeout);
  elements.toastMessage.textContent = message;
  elements.toast.hidden = false;
  toastTimeout = setTimeout(() => {
    elements.toast.hidden = true;
  }, 2600);
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "x-demo-user": "admin"
    },
    ...options
  });
  const raw = await response.text();
  let payload;

  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(`Unexpected response from ${path}.`);
  }

  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }

  return payload;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function formatUsage(value) {
  return `${Math.round(value || 0)} ${resourceConfig.unit}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getMonthlyData(readings) {
  const map = readings.reduce((acc, reading) => {
    const month = new Date(reading.recordedAt).toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric"
    });
    acc[month] = (acc[month] || 0) + Number(reading.amount);
    return acc;
  }, {});

  return Object.entries(map).map(([label, total]) => ({ label, total }));
}

function getDailyTrend(readings) {
  const map = readings.reduce((acc, reading) => {
    const date = new Date(reading.recordedAt).toLocaleDateString("en-CA");
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(Number(reading.amount));
    return acc;
  }, {});

  return Object.entries(map)
    .map(([date, values]) => ({
      date,
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
      peak: Math.max(...values)
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-8);
}

function getLocationSplit(readings) {
  const map = readings.reduce((acc, reading) => {
    acc[reading.location] = (acc[reading.location] || 0) + Number(reading.amount);
    return acc;
  }, {});

  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

function renderSummary(readings) {
  const totalUsage = readings.reduce((sum, reading) => sum + Number(reading.amount), 0);
  const totalCost = readings.reduce((sum, reading) => sum + Number(reading.cost), 0);
  const averageUsage = readings.length ? totalUsage / readings.length : 0;
  const currentMonthKey = new Date().toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric"
  });
  const currentMonthUsage = readings
    .filter((reading) =>
      new Date(reading.recordedAt).toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric"
      }) === currentMonthKey
    )
    .reduce((sum, reading) => sum + Number(reading.amount), 0);
  const peakReading = readings.reduce(
    (peak, reading) => (Number(reading.amount) > Number(peak.amount) ? reading : peak),
    readings[0] || { amount: 0, location: "No data", recordedAt: new Date().toISOString() }
  );
  const locations = new Set(readings.map((reading) => reading.location));

  elements.resourceTitle.textContent = `${resourceConfig.label} Usage Intelligence`;
  elements.resourceSubtitle.textContent = `Usage averages, monthly movement, and location distribution for ${resourceConfig.label.toLowerCase()}.`;
  elements.resourceRailTitle.textContent = `${resourceConfig.label} insights`;
  elements.resourceRailCopy.textContent = resourceConfig.railCopy;
  elements.detailTotalUsage.textContent = formatUsage(totalUsage);
  elements.detailAverageUsage.textContent = formatUsage(averageUsage);
  elements.detailCurrentMonthUsage.textContent = formatUsage(currentMonthUsage);
  elements.detailPeakUsage.textContent = `${Math.round(peakReading.amount || 0)} ${resourceConfig.unit}`;
  elements.detailTotalCost.textContent = formatCurrency(totalCost);
  elements.detailHeroValue.textContent = formatUsage(totalUsage);
  elements.detailActiveLocations.textContent = `${locations.size} locations`;
  elements.detailEntriesCount.textContent = `${readings.length} readings`;
  elements.detailRecommendation.textContent = resourceConfig.recommendation;
}

function renderHistory(readings) {
  elements.detailHistoryBody.innerHTML = readings
    .slice(0, 10)
    .map(
      (reading) => `
        <tr>
          <td data-label="Location">${reading.location}</td>
          <td data-label="Recorded">${formatDate(reading.recordedAt)}</td>
          <td data-label="Amount">${formatUsage(reading.amount)}</td>
          <td data-label="Cost">${formatCurrency(reading.cost)}</td>
          <td data-label="Note">${reading.notes || "Tracked usage entry"}</td>
        </tr>
      `
    )
    .join("");
}

function renderCharts(readings) {
  const css = getComputedStyle(document.body);
  const monthly = getMonthlyData(readings);
  const daily = getDailyTrend(readings);
  const locations = getLocationSplit(readings);
  const muted = css.getPropertyValue("--muted").trim();
  const gridLine = css.getPropertyValue("--grid-line").trim();
  const waterColor = css.getPropertyValue("--water").trim();
  const powerColor = css.getPropertyValue("--power").trim();
  const accent = resourceType === "water" ? waterColor : powerColor;
  const base = state.settings.darkMode
    ? resourceType === "water" ? "#204f3d" : "#5f4721"
    : resourceType === "water" ? "#b8ead7" : "#f7d28b";
  const border = state.settings.darkMode
    ? resourceType === "water" ? "#37d69c" : "#f2bc5b"
    : accent;

  if (monthlyChartInstance) {
    monthlyChartInstance.destroy();
  }
  if (trendChartInstance) {
    trendChartInstance.destroy();
  }
  if (locationChartInstance) {
    locationChartInstance.destroy();
  }

  const monthlyCtx = elements.monthlyChart.getContext("2d");
  const monthlyGradient = monthlyCtx.createLinearGradient(0, 0, 0, elements.monthlyChart.height || 300);
  monthlyGradient.addColorStop(0, accent);
  monthlyGradient.addColorStop(1, state.settings.darkMode ? border : base);

  monthlyChartInstance = new Chart(elements.monthlyChart, {
    type: "bar",
    data: {
      labels: monthly.map((entry) => entry.label),
      datasets: [
        {
          data: monthly.map((entry) => entry.total),
          backgroundColor: monthly.map((_, index) =>
            index === monthly.length - 1 ? monthlyGradient : base
          ),
          borderColor: border,
          borderWidth: 1.5,
          borderRadius: 14,
          maxBarThickness: 56
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: muted }, grid: { display: false }, border: { display: false } },
        y: { ticks: { color: muted }, grid: { color: gridLine }, border: { display: false } }
      }
    }
  });

  trendChartInstance = new Chart(elements.trendChart, {
    type: "line",
    data: {
      labels: daily.map((entry) => entry.date.slice(5)),
      datasets: [
        {
          label: "Average",
          data: daily.map((entry) => entry.average),
          borderColor: accent,
          backgroundColor: state.settings.darkMode
            ? resourceType === "water" ? "rgba(41, 191, 147, 0.15)" : "rgba(243, 177, 79, 0.15)"
            : resourceType === "water" ? "rgba(27, 166, 122, 0.15)" : "rgba(240, 175, 66, 0.15)",
          tension: 0.42,
          fill: true,
          pointRadius: 0
        },
        {
          label: "Peak",
          data: daily.map((entry) => entry.peak),
          borderColor: border,
          borderDash: [6, 6],
          tension: 0.38,
          fill: false,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: muted } } },
      scales: {
        x: { ticks: { color: muted }, grid: { display: false }, border: { display: false } },
        y: { ticks: { color: muted }, grid: { color: gridLine }, border: { display: false } }
      }
    }
  });

  locationChartInstance = new Chart(elements.locationChart, {
    type: "doughnut",
    data: {
      labels: locations.map(([label]) => label),
      datasets: [
        {
          data: locations.map(([, value]) => value),
          backgroundColor: resourceType === "water"
            ? ["#1ba67a", "#58c49c", "#89d8bb", "#b3ead3", "#d7f6e9"]
            : ["#f0af42", "#f3bf6d", "#f7cf97", "#f8debe", "#faecd9"],
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: muted, boxWidth: 12, padding: 16 }
        }
      },
      cutout: "66%"
    }
  });
}

async function seedDemoData() {
  try {
    const response = await fetchJson("/api/v1/readings/seed-demo?replace=true", {
      method: "POST"
    });
    showToast(response.message || "Demo data loaded.");
    await loadResourceDashboard();
  } catch (error) {
    showToast(error.message);
  }
}

function handleAction(action) {
  if (action === "toggle-theme") {
    state.settings.darkMode = !state.settings.darkMode;
    persistSettings();
    applyTheme();
    renderCharts(state.readings);
    showToast(state.settings.darkMode ? "Dark mode enabled." : "Light mode enabled.");
    return;
  }

  if (action === "seed-demo") {
    seedDemoData();
  }
}

async function loadResourceDashboard() {
  const response = await fetchJson("/api/v1/readings");
  state.readings = response.data
    .filter((reading) => reading.resourceType === resourceType)
    .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));

  renderSummary(state.readings);
  renderHistory(state.readings);
  renderCharts(state.readings);
}

loadPreferences();
applyTheme();
syncPageLinks();

elements.actionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    handleAction(button.dataset.action);
  });
});

loadResourceDashboard().catch((error) => {
  showToast(error.message);
});
