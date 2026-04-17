const DEFAULT_API_ORIGIN = "http://127.0.0.1:4000";
const isFilePreview = window.location.protocol === "file:";
const isNonAppLocalPreview =
  ["127.0.0.1", "localhost"].includes(window.location.hostname) &&
  window.location.port !== "" &&
  window.location.port !== "4000";
const API_ORIGIN =
  isFilePreview || isNonAppLocalPreview
    ? DEFAULT_API_ORIGIN
    : window.location.origin;

const STORAGE_KEYS = {
  filters: "resource-pulse-console-filters",
  settings: "resource-pulse-console-settings"
};

const state = {
  readings: [],
  health: null,
  filters: {
    search: "",
    resource: "",
    location: "",
    from: "",
    to: ""
  },
  settings: {
    compactMode: false,
    highlightWater: false,
    showToasts: true,
    darkMode: false
  },
  chartMode: "combined",
  lineMode: "electricity",
  selectedReadingId: null,
  currentRangeLabel: "17 Apr, 2026 - 17 May, 2026"
};

const elements = {
  proLive: document.querySelector("#proLive"),
  proEntries: document.querySelector("#proEntries"),
  proCost: document.querySelector("#proCost"),
  proWater: document.querySelector("#proWater"),
  proElectricity: document.querySelector("#proElectricity"),
  proHealth: document.querySelector("#proHealth"),
  waterGoalValue: document.querySelector("#waterGoalValue"),
  electricityGoalValue: document.querySelector("#electricityGoalValue"),
  averageCostPro: document.querySelector("#averageCostPro"),
  trendDaysPro: document.querySelector("#trendDaysPro"),
  totalCostCard: document.querySelector("#totalCostCard"),
  entryCount: document.querySelector("#entryCount"),
  waterRecommendationMini: document.querySelector("#waterRecommendationMini"),
  healthBadgeMini: document.querySelector("#healthBadgeMini"),
  efficiencyDelta: document.querySelector("#efficiencyDelta"),
  historyBody: document.querySelector("#historyBody"),
  formStatus: document.querySelector("#formStatus"),
  captureForm: document.querySelector("#capture"),
  submitReadingButton: document.querySelector("#submitReadingButton"),
  barChart: document.querySelector("#barChart"),
  lineChart: document.querySelector("#lineChart"),
  searchPanel: document.querySelector("#searchPanel"),
  notificationsPanel: document.querySelector("#notificationsPanel"),
  settingsPanel: document.querySelector("#settingsPanel"),
  historySearch: document.querySelector("#historySearch"),
  resourceFilter: document.querySelector("#resourceFilter"),
  locationFilter: document.querySelector("#locationFilter"),
  dateFrom: document.querySelector("#dateFrom"),
  dateTo: document.querySelector("#dateTo"),
  notificationList: document.querySelector("#notificationList"),
  compactModeToggle: document.querySelector("#compactModeToggle"),
  highlightWaterToggle: document.querySelector("#highlightWaterToggle"),
  toastToggle: document.querySelector("#toastToggle"),
  darkModeToggle: document.querySelector("#darkModeToggle"),
  toast: document.querySelector("#toast"),
  toastMessage: document.querySelector("#toastMessage"),
  datePill: document.querySelector(".date-pill"),
  railModeTitle: document.querySelector("#railModeTitle"),
  filteredEntriesCount: document.querySelector("#filteredEntriesCount"),
  historyFocusLabel: document.querySelector("#historyFocusLabel"),
  historyFocusDetail: document.querySelector("#historyFocusDetail"),
  latestHistoryLocation: document.querySelector("#latestHistoryLocation"),
  latestHistoryNote: document.querySelector("#latestHistoryNote"),
  navButtons: [...document.querySelectorAll(".pill-nav__item")],
  railButtons: [...document.querySelectorAll(".rail-link[data-nav-target]")],
  pageLinks: [...document.querySelectorAll("[data-page-link]")],
  chartModeButtons: [...document.querySelectorAll("[data-chart-mode]")],
  lineModeButtons: [...document.querySelectorAll("[data-line-mode]")],
  actionButtons: [...document.querySelectorAll("[data-action]")],
  memberButtons: [...document.querySelectorAll("[data-member]")]
};

let barChartInstance;
let lineChartInstance;
let toastTimeout;

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function loadPreferences() {
  state.filters = {
    ...state.filters,
    ...safeParse(localStorage.getItem(STORAGE_KEYS.filters), {})
  };
  state.settings = {
    ...state.settings,
    ...safeParse(localStorage.getItem(STORAGE_KEYS.settings), {})
  };
}

function syncPageLinks() {
  const currentPage = document.body.dataset.page;
  elements.pageLinks.forEach((link) => {
    link.classList.toggle("rail-link--active", link.dataset.pageLink === currentPage);
  });
}

function persistFilters() {
  localStorage.setItem(STORAGE_KEYS.filters, JSON.stringify(state.filters));
}

function persistSettings() {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
}

function applySettingsToUi() {
  document.body.classList.toggle("compact-mode", state.settings.compactMode);
  document.body.classList.toggle("highlight-water", state.settings.highlightWater);
  document.body.classList.toggle("dark-mode", state.settings.darkMode);
  elements.compactModeToggle.checked = state.settings.compactMode;
  elements.highlightWaterToggle.checked = state.settings.highlightWater;
  elements.toastToggle.checked = state.settings.showToasts;
  elements.darkModeToggle.checked = state.settings.darkMode;
}

function syncFilterInputs() {
  elements.historySearch.value = state.filters.search;
  elements.resourceFilter.value = state.filters.resource;
  elements.dateFrom.value = state.filters.from;
  elements.dateTo.value = state.filters.to;
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "x-demo-user": "admin"
    },
    ...options
  });
  const payload = await response.json();

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

function formatUsage(resourceType, value) {
  return resourceType === "water"
    ? `${Math.round(value || 0)} L`
    : `${Math.round(value || 0)} kWh`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function toDateInputValue(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function showToast(message) {
  if (!state.settings.showToasts) {
    return;
  }

  window.clearTimeout(toastTimeout);
  elements.toastMessage.textContent = message;
  elements.toast.hidden = false;
  toastTimeout = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2600);
}

function scrollToSection(targetId) {
  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }

  target.scrollIntoView({ behavior: "smooth", block: "start" });
  syncNavigation(targetId);
}

function syncNavigation(activeTarget) {
  elements.navButtons.forEach((button) => {
    button.classList.toggle("pill-nav__item--active", button.dataset.navTarget === activeTarget);
  });

  elements.railButtons.forEach((button) => {
    button.classList.toggle("rail-icon--active", button.dataset.navTarget === activeTarget);
  });
}

function syncChartButtons() {
  elements.chartModeButtons.forEach((button) => {
    button.classList.toggle("segment-toggle__active", button.dataset.chartMode === state.chartMode);
  });
}

function syncLineButtons() {
  elements.lineModeButtons.forEach((button) => {
    button.classList.toggle("balance-actions__active", button.dataset.lineMode === state.lineMode);
  });
}

function populateLocationFilter() {
  const currentValue = state.filters.location;
  const locations = [...new Set(state.readings.map((reading) => reading.location))].sort();
  elements.locationFilter.innerHTML = `
    <option value="">All locations</option>
    ${locations.map((location) => `<option value="${location}">${location}</option>`).join("")}
  `;
  elements.locationFilter.value = currentValue;
}

function getFilteredReadings() {
  return state.readings.filter((reading) => {
    const textPass = state.filters.search
      ? [
          reading.resourceType,
          reading.location,
          reading.notes,
          String(reading.amount),
          String(reading.cost)
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(state.filters.search.toLowerCase())
      : true;

    const resourcePass = state.filters.resource
      ? reading.resourceType === state.filters.resource
      : true;
    const locationPass = state.filters.location
      ? reading.location === state.filters.location
      : true;
    const fromPass = state.filters.from
      ? new Date(reading.recordedAt) >= new Date(`${state.filters.from}T00:00:00`)
      : true;
    const toPass = state.filters.to
      ? new Date(reading.recordedAt) <= new Date(`${state.filters.to}T23:59:59`)
      : true;

    return textPass && resourcePass && locationPass && fromPass && toPass;
  });
}

function buildClientAnalytics(readings) {
  const summary = readings.reduce(
    (acc, reading) => {
      if (reading.resourceType === "water") {
        acc.waterUsage += Number(reading.amount);
      } else {
        acc.electricityUsage += Number(reading.amount);
      }

      acc.totalEntries += 1;
      acc.totalCost += Number(reading.cost);
      return acc;
    },
    {
      totalEntries: 0,
      waterUsage: 0,
      electricityUsage: 0,
      totalCost: 0
    }
  );

  const trendMap = readings.reduce((acc, reading) => {
    const date = new Date(reading.recordedAt).toLocaleDateString("en-CA");
    if (!acc[date]) {
      acc[date] = { date, water: 0, electricity: 0 };
    }
    acc[date][reading.resourceType] += Number(reading.amount);
    return acc;
  }, {});

  const trend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

  const insights = ["water", "electricity"].map((resourceType) => {
    const resourceReadings = readings.filter((reading) => reading.resourceType === resourceType);
    const totalUsage =
      resourceType === "water" ? summary.waterUsage : summary.electricityUsage;
    const averageUsage =
      resourceReadings.length > 0 ? totalUsage / resourceReadings.length : 0;
    const peakReading = resourceReadings.reduce(
      (peak, reading) => (Number(reading.amount) > Number(peak.amount) ? reading : peak),
      resourceReadings[0] || {
        amount: 0,
        recordedAt: new Date().toISOString()
      }
    );

    return {
      resourceType,
      title: resourceType === "water" ? "Water efficiency" : "Electricity efficiency",
      averageUsage,
      peakUsage: Number(peakReading.amount),
      peakDate: peakReading.recordedAt,
      recommendation:
        resourceType === "water"
          ? "Shift cleaning and irrigation tasks away from your heaviest days to flatten water demand."
          : "Move high-load equipment to lower-demand windows to reduce electricity spikes."
    };
  });

  return { summary, trend, insights };
}

function renderSummary(filteredAnalytics) {
  const { summary, insights, trend } = filteredAnalytics;
  const totalUsage = summary.waterUsage + summary.electricityUsage;
  const waterShare = totalUsage > 0 ? (summary.waterUsage / totalUsage) * 100 : 0;
  const averageCost = summary.totalEntries > 0 ? summary.totalCost / summary.totalEntries : 0;

  elements.proEntries.textContent = summary.totalEntries;
  elements.proCost.textContent = formatCurrency(summary.totalCost);
  elements.proWater.textContent = formatUsage("water", summary.waterUsage);
  elements.proElectricity.textContent = formatUsage("electricity", summary.electricityUsage);
  elements.proHealth.textContent = state.health
    ? `${state.health.message} - ${state.health.sessionViews} visits`
    : "Unavailable";
  elements.proLive.textContent = `Live utility overview - ${trend.length} tracked periods`;
  elements.waterGoalValue.textContent = formatUsage("water", summary.waterUsage);
  elements.electricityGoalValue.textContent = formatUsage("electricity", summary.electricityUsage);
  elements.averageCostPro.textContent = formatCurrency(averageCost);
  elements.trendDaysPro.textContent = trend.length;
  elements.totalCostCard.textContent = formatCurrency(summary.totalCost);
  elements.entryCount.textContent = `${summary.totalEntries} entries`;
  elements.waterRecommendationMini.textContent =
    insights[0]?.recommendation || "Review water usage patterns.";
  elements.healthBadgeMini.textContent = `${Math.round(waterShare)}%`;
  elements.efficiencyDelta.textContent = `${Math.round(100 - waterShare)}%`;
  elements.datePill.textContent = state.currentRangeLabel;
  if (elements.railModeTitle) {
    elements.railModeTitle.textContent = "Unified monitoring";
  }
}

function renderHistory(filteredReadings) {
  elements.historyBody.innerHTML = filteredReadings
    .slice(0, 8)
    .map((reading) => {
      const iconLabel = reading.resourceType === "water" ? "W" : "E";
      return `
        <tr class="${state.selectedReadingId === reading.id ? "row-selected" : ""}" data-row-id="${reading.id}">
          <td>
            <div class="history-badge">
              <span class="resource-dot resource-dot--${reading.resourceType}">${iconLabel}</span>
              <div class="history-name">
                <strong>${reading.resourceType === "water" ? "Water usage" : "Electricity usage"}</strong>
                <span class="history-sub">${reading.notes || "Tracked usage entry"}</span>
              </div>
            </div>
          </td>
          <td>${reading.location}</td>
          <td>${formatDate(reading.recordedAt)}</td>
          <td><span class="status-ok">Logged</span></td>
          <td>${formatUsage(reading.resourceType, reading.amount)}</td>
          <td>
            <button class="history-action" type="button" data-history-action="edit" data-reading-id="${reading.id}">Edit</button>
            <button class="history-action history-action--danger" type="button" data-history-action="delete" data-reading-id="${reading.id}">Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");

  if (!elements.historyBody.innerHTML) {
    elements.historyBody.innerHTML = `
      <tr>
        <td colspan="6">No matching readings found for the current filters.</td>
      </tr>
    `;
  }

  const latest = filteredReadings[0];
  const activeResource =
    state.filters.resource === "water"
      ? "Water"
      : state.filters.resource === "electricity"
        ? "Electricity"
        : "All resources";
  const focusDetail = state.filters.location
    ? `Currently narrowed to ${state.filters.location}.`
    : state.filters.from || state.filters.to
      ? "Date filters are shaping the visible records."
      : "Review water and electricity usage together for faster comparisons.";

  elements.filteredEntriesCount.textContent = filteredReadings.length;
  elements.historyFocusLabel.textContent = activeResource;
  elements.historyFocusDetail.textContent = focusDetail;
  elements.latestHistoryLocation.textContent = latest
    ? `${latest.location} · ${formatUsage(latest.resourceType, latest.amount)}`
    : "No recent activity";
  elements.latestHistoryNote.textContent = latest
    ? latest.notes || "Latest record logged without an extra note."
    : "Add a reading to surface the latest operational note here.";
}

function renderNotifications(filteredReadings, filteredAnalytics) {
  const latest = filteredReadings[0];
  const insights = filteredAnalytics.insights;
  const activeFilters = [
    state.filters.search,
    state.filters.resource,
    state.filters.location,
    state.filters.from,
    state.filters.to
  ].filter(Boolean).length;

  elements.notificationList.innerHTML = `
    <article class="notification-item">
      <strong>${latest ? "Latest record available" : "No recent records"}</strong>
      <p>${latest ? `${latest.location} - ${formatUsage(latest.resourceType, latest.amount)}` : "Add a reading to populate this panel."}</p>
    </article>
    <article class="notification-item">
      <strong>Water recommendation</strong>
      <p>${insights[0]?.recommendation || "Water insights will appear here."}</p>
    </article>
    <article class="notification-item">
      <strong>Electricity recommendation</strong>
      <p>${insights[1]?.recommendation || "Electricity insights will appear here."}</p>
    </article>
    <article class="notification-item">
      <strong>Active filters</strong>
      <p>${activeFilters > 0 ? `${activeFilters} filters currently applied.` : "No filters are active."}</p>
    </article>
  `;
}

function renderCharts(filteredAnalytics) {
  const css = getComputedStyle(document.body);
  const chartContext = elements.barChart.getContext("2d");
  const labels = filteredAnalytics.trend.map((entry) => entry.date.slice(5).toUpperCase());
  const waterSeries = filteredAnalytics.trend.map((entry) => entry.water);
  const electricitySeries = filteredAnalytics.trend.map((entry) => entry.electricity);
  const barSeries =
    state.chartMode === "water"
      ? waterSeries
      : waterSeries.map((value, index) => value + (electricitySeries[index] || 0));
  const lineSeries = state.lineMode === "water" ? waterSeries : electricitySeries;
  const lineLabel = state.lineMode === "water" ? "Water" : "Electricity";
  const lineColor = state.lineMode === "water" ? css.getPropertyValue("--water").trim() : css.getPropertyValue("--power").trim();
  const lineFill =
    state.lineMode === "water"
      ? "rgba(27, 166, 122, 0.15)"
      : "rgba(240, 175, 66, 0.15)";
  const greenStrong = css.getPropertyValue("--green-strong").trim() || "#168f58";
  const greenSoft = css.getPropertyValue("--green-soft").trim() || "#a8ddc4";
  const gridLine = css.getPropertyValue("--grid-line").trim() || "#ece7e2";
  const textColor = css.getPropertyValue("--muted").trim() || "#8c9096";
  const baseBar = state.settings.darkMode ? "#234f3c" : "#a8ddc4";
  const accentBar = state.settings.darkMode ? "#20c37a" : greenStrong;
  const barBorder = state.settings.darkMode ? "#30d98b" : "#149357";
  const barGradient = chartContext.createLinearGradient(0, 0, 0, elements.barChart.height || 286);
  barGradient.addColorStop(0, accentBar);
  barGradient.addColorStop(1, state.settings.darkMode ? "#158554" : "#22a86a");

  if (barChartInstance) {
    barChartInstance.destroy();
  }

  if (lineChartInstance) {
    lineChartInstance.destroy();
  }

  barChartInstance = new Chart(elements.barChart, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: state.chartMode === "water" ? "Water" : "Combined Usage",
          data: barSeries,
          borderRadius: 999,
          maxBarThickness: 58,
          backgroundColor: labels.map((_, index) =>
            index === Math.floor(labels.length / 2) ? barGradient : baseBar
          ),
          borderColor: labels.map((_, index) =>
            index === Math.floor(labels.length / 2) ? barBorder : state.settings.darkMode ? "#2f7d5b" : "#8bcfb0"
          ),
          borderWidth: 1.5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: textColor } },
        y: {
          beginAtZero: true,
          grid: { color: gridLine },
          border: { display: false },
          ticks: { color: textColor }
        }
      }
    }
  });

  lineChartInstance = new Chart(elements.lineChart, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: lineLabel,
          data: lineSeries,
          borderColor: lineColor,
          backgroundColor: lineFill,
          fill: true,
          tension: 0.4,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } }
    }
  });

  syncChartButtons();
  syncLineButtons();
}

function renderDashboard() {
  const filteredReadings = getFilteredReadings();
  const filteredAnalytics = buildClientAnalytics(filteredReadings);

  renderSummary(filteredAnalytics);
  renderHistory(filteredReadings);
  renderNotifications(filteredReadings, filteredAnalytics);
  renderCharts(filteredAnalytics);
}

function populateForm(reading) {
  state.selectedReadingId = reading.id;
  elements.captureForm.elements.editingId.value = reading.id;
  elements.captureForm.elements.resourceType.value = reading.resourceType;
  elements.captureForm.elements.amount.value = reading.amount;
  elements.captureForm.elements.unit.value = reading.unit;
  elements.captureForm.elements.cost.value = reading.cost;
  elements.captureForm.elements.location.value = reading.location;
  elements.captureForm.elements.recordedAt.value = new Date(reading.recordedAt)
    .toISOString()
    .slice(0, 16);
  elements.captureForm.elements.notes.value = reading.notes || "";
  elements.submitReadingButton.textContent = "Update Reading";
  elements.formStatus.textContent = "Editing existing reading.";
  renderHistory(getFilteredReadings());
}

function resetFormState() {
  state.selectedReadingId = null;
  elements.captureForm.reset();
  elements.captureForm.elements.editingId.value = "";
  elements.submitReadingButton.textContent = "Save Reading";
  elements.formStatus.textContent = "Ready to save usage data.";
  renderHistory(getFilteredReadings());
}

async function loadDashboard(showSyncToast = false) {
  const [health, readings] = await Promise.all([
    fetchJson("/api/v1/health"),
    fetchJson("/api/v1/readings")
  ]);

  state.health = health;
  state.readings = readings.data.sort(
    (a, b) => new Date(b.recordedAt) - new Date(a.recordedAt)
  );

  populateLocationFilter();
  syncFilterInputs();
  renderDashboard();

  if (showSyncToast) {
    showToast("Dashboard synced successfully.");
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  const formData = new FormData(elements.captureForm);
  const payload = Object.fromEntries(formData.entries());
  const editingId = payload.editingId;
  delete payload.editingId;
  payload.amount = Number(payload.amount);
  payload.cost = Number(payload.cost);
  payload.recordedAt = new Date(payload.recordedAt).toISOString();

  try {
    if (editingId) {
      await fetchJson(`/api/v1/readings/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      elements.formStatus.textContent = "Reading updated successfully.";
      showToast("Reading updated successfully.");
    } else {
      await fetchJson("/api/v1/readings", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      elements.formStatus.textContent = "Reading saved successfully.";
      showToast("Reading saved successfully.");
    }

    resetFormState();
    await loadDashboard(false);
  } catch (error) {
    elements.formStatus.textContent = error.message;
  }
}

async function deleteReading(readingId) {
  try {
    await fetchJson(`/api/v1/readings/${readingId}`, {
      method: "DELETE"
    });
    if (state.selectedReadingId === readingId) {
      resetFormState();
    }
    await loadDashboard(false);
    showToast("Reading deleted successfully.");
  } catch (error) {
    elements.formStatus.textContent = error.message;
  }
}

async function seedDemoData() {
  try {
    const response = await fetchJson("/api/v1/readings/seed-demo?replace=true", {
      method: "POST"
    });
    await loadDashboard(false);
    showToast(response.message || "Demo data loaded.");
  } catch (error) {
    elements.formStatus.textContent = error.message;
  }
}

function exportCsv() {
  const filteredReadings = getFilteredReadings();
  const rows = [
    ["Resource", "Location", "Recorded At", "Amount", "Unit", "Cost", "Notes"],
    ...filteredReadings.map((reading) => [
      reading.resourceType,
      reading.location,
      reading.recordedAt,
      reading.amount,
      reading.unit,
      reading.cost,
      reading.notes || ""
    ])
  ];

  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "resource-pulse-report.csv";
  link.click();
  URL.revokeObjectURL(url);
  showToast("CSV export created.");
}

function exportPdf() {
  const filteredReadings = getFilteredReadings();
  const printableRows = filteredReadings
    .map(
      (reading) => `
        <tr>
          <td>${reading.resourceType}</td>
          <td>${reading.location}</td>
          <td>${formatDate(reading.recordedAt)}</td>
          <td>${formatUsage(reading.resourceType, reading.amount)}</td>
          <td>${formatCurrency(reading.cost)}</td>
        </tr>
      `
    )
    .join("");

  const reportWindow = window.open("", "_blank", "width=1000,height=700");
  if (!reportWindow) {
    showToast("Pop-up blocked. Enable pop-ups to export PDF.");
    return;
  }

  reportWindow.document.write(`
    <html>
      <head>
        <title>Resource Pulse Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
          h1 { margin-bottom: 8px; }
          p { color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 14px; }
          th { background: #f5f5f5; }
        </style>
      </head>
      <body>
        <h1>Resource Pulse Report</h1>
        <p>Generated on ${formatDate(new Date().toISOString())}</p>
        <table>
          <thead>
            <tr>
              <th>Resource</th>
              <th>Location</th>
              <th>Recorded</th>
              <th>Amount</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>${printableRows}</tbody>
        </table>
      </body>
    </html>
  `);
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.print();
  showToast("PDF print view opened.");
}

function toggleSearchPanel() {
  elements.searchPanel.hidden = !elements.searchPanel.hidden;
  if (!elements.searchPanel.hidden) {
    elements.historySearch.focus();
  }
}

function toggleNotificationsPanel() {
  const nextValue = !elements.notificationsPanel.hidden;
  closePanels();
  elements.notificationsPanel.hidden = !nextValue;
}

function openSettingsPanel() {
  const nextValue = !elements.settingsPanel.hidden;
  closePanels();
  elements.settingsPanel.hidden = !nextValue;
}

function closePanels() {
  elements.notificationsPanel.hidden = true;
  elements.settingsPanel.hidden = true;
}

function toggleRangeLabel() {
  if (state.currentRangeLabel === "17 Apr, 2026 - 17 May, 2026") {
    state.currentRangeLabel = "01 Jan, 2026 - 31 Dec, 2026";
    state.filters.from = "2026-01-01";
    state.filters.to = "2026-12-31";
  } else {
    state.currentRangeLabel = "17 Apr, 2026 - 17 May, 2026";
    state.filters.from = "";
    state.filters.to = "";
  }
  persistFilters();
  syncFilterInputs();
  renderDashboard();
  showToast("Date range updated.");
}

function handleGlobalAction(action) {
  if (action === "toggle-search") {
    toggleSearchPanel();
    return;
  }

  if (action === "toggle-notifications") {
    toggleNotificationsPanel();
    return;
  }

  if (action === "toggle-theme") {
    state.settings.darkMode = !state.settings.darkMode;
    persistSettings();
    applySettingsToUi();
    renderCharts(buildClientAnalytics(getFilteredReadings()));
    showToast(state.settings.darkMode ? "Dark mode enabled." : "Light mode enabled.");
    return;
  }

  if (action === "seed-demo") {
    seedDemoData();
    return;
  }

  if (action === "close-notifications") {
    elements.notificationsPanel.hidden = true;
    return;
  }

  if (action === "open-settings") {
    openSettingsPanel();
    return;
  }

  if (action === "close-settings") {
    elements.settingsPanel.hidden = true;
    return;
  }

  if (action === "clear-search") {
    state.filters = { search: "", resource: "", location: "", from: "", to: "" };
    persistFilters();
    syncFilterInputs();
    renderDashboard();
    showToast("Filters cleared.");
    return;
  }

  if (action === "refresh-dashboard" || action === "refresh-history") {
    loadDashboard(true).catch((error) => {
      elements.formStatus.textContent = error.message;
    });
    return;
  }

  if (action === "toggle-range") {
    toggleRangeLabel();
    return;
  }

  if (action === "focus-water") {
    state.chartMode = "water";
    renderCharts(buildClientAnalytics(getFilteredReadings()));
    showToast("Water view enabled.");
    return;
  }

  if (action === "focus-budget" || action === "focus-electricity") {
    state.lineMode = "electricity";
    renderCharts(buildClientAnalytics(getFilteredReadings()));
    showToast("Electricity trend highlighted.");
    return;
  }

  if (action === "show-team") {
    showToast("Resource monitoring team is available.");
    return;
  }

  if (action === "cancel-edit") {
    resetFormState();
    showToast("Edit mode cancelled.");
    return;
  }

  if (action === "reset-dashboard") {
    state.filters = { search: "", resource: "", location: "", from: "", to: "" };
    persistFilters();
    syncFilterInputs();
    resetFormState();
    renderDashboard();
    closePanels();
    showToast("Dashboard reset to default view.");
    return;
  }

  if (action === "export-csv") {
    exportCsv();
    return;
  }

  if (action === "export-pdf") {
    exportPdf();
  }
}

function handleHistoryClick(event) {
  const actionButton = event.target.closest("[data-history-action]");
  if (!actionButton) {
    return;
  }

  const readingId = actionButton.dataset.readingId;
  const action = actionButton.dataset.historyAction;
  const reading = state.readings.find((item) => item.id === readingId);

  if (action === "edit" && reading) {
    populateForm(reading);
    scrollToSection("capture-panel");
    showToast("Reading loaded for editing.");
    return;
  }

  if (action === "delete") {
    deleteReading(readingId);
  }
}

function bindFilterEvents() {
  elements.historySearch.addEventListener("input", (event) => {
    state.filters.search = event.target.value;
    persistFilters();
    renderDashboard();
  });

  elements.resourceFilter.addEventListener("change", (event) => {
    state.filters.resource = event.target.value;
    persistFilters();
    renderDashboard();
  });

  elements.locationFilter.addEventListener("change", (event) => {
    state.filters.location = event.target.value;
    persistFilters();
    renderDashboard();
  });

  elements.dateFrom.addEventListener("change", (event) => {
    state.filters.from = event.target.value;
    persistFilters();
    renderDashboard();
  });

  elements.dateTo.addEventListener("change", (event) => {
    state.filters.to = event.target.value;
    persistFilters();
    renderDashboard();
  });
}

function bindSettingsEvents() {
  elements.compactModeToggle.addEventListener("change", (event) => {
    state.settings.compactMode = event.target.checked;
    persistSettings();
    applySettingsToUi();
  });

  elements.highlightWaterToggle.addEventListener("change", (event) => {
    state.settings.highlightWater = event.target.checked;
    persistSettings();
    applySettingsToUi();
  });

  elements.toastToggle.addEventListener("change", (event) => {
    state.settings.showToasts = event.target.checked;
    persistSettings();
    applySettingsToUi();
  });

  elements.darkModeToggle.addEventListener("change", (event) => {
    state.settings.darkMode = event.target.checked;
    persistSettings();
    applySettingsToUi();
    renderCharts(buildClientAnalytics(getFilteredReadings()));
  });
}

elements.captureForm.addEventListener("submit", handleSubmit);
elements.historyBody.addEventListener("click", handleHistoryClick);

elements.navButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    if (!button.dataset.navTarget) {
      return;
    }
    event.preventDefault();
    scrollToSection(button.dataset.navTarget);
  });
});

elements.railButtons.forEach((button) => {
  button.addEventListener("click", () => {
    scrollToSection(button.dataset.navTarget);
  });
});

elements.chartModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.chartMode = button.dataset.chartMode;
    renderCharts(buildClientAnalytics(getFilteredReadings()));
    showToast(`${button.dataset.chartMode === "water" ? "Water" : "Combined"} chart enabled.`);
  });
});

elements.lineModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.lineMode = button.dataset.lineMode;
    renderCharts(buildClientAnalytics(getFilteredReadings()));
    showToast(`${button.dataset.lineMode === "water" ? "Water" : "Electricity"} line view enabled.`);
  });
});

elements.actionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    handleGlobalAction(button.dataset.action);
  });
});

elements.memberButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showToast(button.dataset.member);
  });
});

bindFilterEvents();
bindSettingsEvents();
loadPreferences();
applySettingsToUi();
syncPageLinks();

loadDashboard().catch((error) => {
  elements.formStatus.textContent = error.message;
  elements.proHealth.textContent = "Backend connection failed";
});
