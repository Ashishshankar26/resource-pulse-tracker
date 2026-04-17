const DEFAULT_API_ORIGIN = "http://127.0.0.1:4000";
const API_ORIGIN =
  window.location.protocol.startsWith("http") && window.location.port === "4000"
    ? window.location.origin
    : DEFAULT_API_ORIGIN;

const state = {
  readings: [],
  analytics: null
};

const elements = {
  proLive: document.querySelector("#proLive"),
  proEntries: document.querySelector("#proEntries"),
  proCost: document.querySelector("#proCost"),
  proWater: document.querySelector("#proWater"),
  proElectricity: document.querySelector("#proElectricity"),
  proHealth: document.querySelector("#proHealth"),
  waterTotalPro: document.querySelector("#waterTotalPro"),
  electricityTotalPro: document.querySelector("#electricityTotalPro"),
  averageCostPro: document.querySelector("#averageCostPro"),
  trendDaysPro: document.querySelector("#trendDaysPro"),
  proTrendChart: document.querySelector("#proTrendChart"),
  proMix: document.querySelector("#proMix"),
  proInsights: document.querySelector("#proInsights"),
  proActivity: document.querySelector("#proActivity"),
  proForm: document.querySelector("#proForm"),
  proMessage: document.querySelector("#proMessage")
};

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
  }).format(value);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatUsage(resourceType, value) {
  return resourceType === "water"
    ? `${Math.round(value)} L`
    : `${Math.round(value)} kWh`;
}

function renderSummary(health) {
  const { summary, trend } = state.analytics;
  const averageCost = summary.totalEntries > 0 ? summary.totalCost / summary.totalEntries : 0;

  elements.proEntries.textContent = summary.totalEntries;
  elements.proCost.textContent = formatCurrency(summary.totalCost);
  elements.proWater.textContent = formatUsage("water", summary.waterUsage);
  elements.proElectricity.textContent = formatUsage(
    "electricity",
    summary.electricityUsage
  );
  elements.proHealth.textContent = `${health.message} - ${health.sessionViews} visits`;
  elements.waterTotalPro.textContent = formatUsage("water", summary.waterUsage);
  elements.electricityTotalPro.textContent = formatUsage(
    "electricity",
    summary.electricityUsage
  );
  elements.averageCostPro.textContent = formatCurrency(averageCost);
  elements.trendDaysPro.textContent = trend.length;
}

function renderMix() {
  const { summary } = state.analytics;
  const total = summary.waterUsage + summary.electricityUsage || 1;
  const waterAngle = `${Math.round((summary.waterUsage / total) * 360)}deg`;

  elements.proMix.innerHTML = `
    <div class="mix-ring" style="--mix-angle: ${waterAngle}"></div>
    <div class="mix-center">
      <h4>${Math.round((summary.waterUsage / total) * 100)}% Water</h4>
      <p>Share of the total combined utility usage</p>
    </div>
    <div class="mix-breakdown">
      <article>
        <span>Water</span>
        <strong>${formatUsage("water", summary.waterUsage)}</strong>
      </article>
      <article>
        <span>Electricity</span>
        <strong>${formatUsage("electricity", summary.electricityUsage)}</strong>
      </article>
      <article>
        <span>Total Cost</span>
        <strong>${formatCurrency(summary.totalCost)}</strong>
      </article>
    </div>
  `;
}

function renderInsights() {
  elements.proInsights.innerHTML = state.analytics.insights
    .map(
      (insight) => `
        <article class="insight-item">
          <h4>${insight.title}</h4>
          <p>Average usage: ${formatUsage(insight.resourceType, insight.averageUsage)}</p>
          <p>Peak event: ${formatUsage(insight.resourceType, insight.peakUsage)} on ${formatDate(insight.peakDate)}</p>
          <p>${insight.recommendation}</p>
        </article>
      `
    )
    .join("");
}

function renderActivity() {
  elements.proActivity.innerHTML = state.readings
    .slice(0, 8)
    .map(
      (reading) => `
        <article class="activity-item" data-reading-id="${reading.id}">
          <div class="activity-item__head">
            <div>
              <span class="tag tag--${reading.resourceType}">${reading.resourceType}</span>
              <h4>${formatUsage(reading.resourceType, reading.amount)} at ${reading.location}</h4>
            </div>
            <button class="delete-button" type="button" data-action="delete" aria-label="Delete reading">x</button>
          </div>
          <p>${formatDate(reading.recordedAt)}</p>
          <p>Cost: ${formatCurrency(reading.cost)}</p>
          <p>${reading.notes || "No notes provided"}</p>
        </article>
      `
    )
    .join("");
}

function renderChart() {
  const data = state.analytics.trend;
  const width = 840;
  const height = 340;
  const padding = { top: 24, right: 24, bottom: 50, left: 56 };
  const maxValue = Math.max(
    ...data.flatMap((entry) => [entry.water, entry.electricity]),
    1
  );

  const xAt = (index) => {
    if (data.length === 1) {
      return width / 2;
    }
    return (
      padding.left +
      (index * (width - padding.left - padding.right)) / (data.length - 1)
    );
  };

  const yAt = (value) =>
    height -
    padding.bottom -
    (value / maxValue) * (height - padding.top - padding.bottom);

  const pathFor = (key) =>
    data
      .map((entry, index) => `${index === 0 ? "M" : "L"} ${xAt(index)} ${yAt(entry[key])}`)
      .join(" ");

  const grid = Array.from({ length: 5 }, (_, index) => {
    const value = (maxValue / 4) * index;
    const y = yAt(value);
    return `
      <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4 8"></line>
      <text x="${padding.left - 10}" y="${y + 4}" fill="rgba(169,184,209,0.9)" font-size="11" text-anchor="end">${Math.round(value)}</text>
    `;
  }).join("");

  const labels = data
    .map(
      (entry, index) => `
        <text x="${xAt(index)}" y="${height - 18}" fill="rgba(169,184,209,0.92)" font-size="11" text-anchor="middle">${entry.date.slice(5)}</text>
      `
    )
    .join("");

  const nodes = data
    .map(
      (entry, index) => `
        <circle cx="${xAt(index)}" cy="${yAt(entry.water)}" r="4.5" fill="#61d8ff"></circle>
        <circle cx="${xAt(index)}" cy="${yAt(entry.electricity)}" r="4.5" fill="#ffd46f"></circle>
      `
    )
    .join("");

  elements.proTrendChart.innerHTML = `
    <defs>
      <linearGradient id="waterStroke" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#2792ff"></stop>
        <stop offset="100%" stop-color="#61d8ff"></stop>
      </linearGradient>
      <linearGradient id="powerStroke" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ff9948"></stop>
        <stop offset="100%" stop-color="#ffd46f"></stop>
      </linearGradient>
    </defs>
    ${grid}
    <path d="${pathFor("water")}" fill="none" stroke="url(#waterStroke)" stroke-width="4" stroke-linecap="round"></path>
    <path d="${pathFor("electricity")}" fill="none" stroke="url(#powerStroke)" stroke-width="4" stroke-linecap="round"></path>
    ${nodes}
    ${labels}
  `;
}

async function loadDashboard() {
  const [health, readings, analytics] = await Promise.all([
    fetchJson("/api/v1/health"),
    fetchJson("/api/v1/readings"),
    fetchJson("/api/v1/analytics/summary")
  ]);

  state.readings = readings.data;
  state.analytics = analytics.data;

  renderSummary(health);
  renderMix();
  renderChart();
  renderInsights();
  renderActivity();
}

async function handleSubmit(event) {
  event.preventDefault();
  const formData = new FormData(elements.proForm);
  const payload = Object.fromEntries(formData.entries());
  payload.amount = Number(payload.amount);
  payload.cost = Number(payload.cost);
  payload.recordedAt = new Date(payload.recordedAt).toISOString();

  try {
    await fetchJson("/api/v1/readings", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    elements.proMessage.textContent = "Reading saved successfully.";
    elements.proForm.reset();
    await loadDashboard();
  } catch (error) {
    elements.proMessage.textContent = error.message;
  }
}

async function handleActivityClick(event) {
  const button = event.target.closest("[data-action='delete']");
  if (!button) {
    return;
  }

  const item = button.closest("[data-reading-id]");
  const readingId = item?.dataset.readingId;
  if (!readingId) {
    return;
  }

  try {
    await fetchJson(`/api/v1/readings/${readingId}`, {
      method: "DELETE"
    });
    elements.proMessage.textContent = "Reading deleted successfully.";
    await loadDashboard();
  } catch (error) {
    elements.proMessage.textContent = error.message;
  }
}

function attachSocket() {
  if (!window.io) {
    elements.proLive.textContent = "Live updates unavailable";
    return;
  }

  const socket = window.io(API_ORIGIN);
  socket.on("tracker:status", (payload) => {
    elements.proLive.textContent = `${payload.message} - ${formatDate(payload.at)}`;
  });
  socket.on("reading:created", async () => {
    elements.proLive.textContent = "New reading synced";
    await loadDashboard();
  });
  socket.on("reading:deleted", async () => {
    elements.proLive.textContent = "Reading removed and synced";
    await loadDashboard();
  });
}

elements.proForm.addEventListener("submit", handleSubmit);
elements.proActivity.addEventListener("click", handleActivityClick);

loadDashboard().catch((error) => {
  elements.proMessage.textContent = error.message;
  elements.proHealth.textContent = "Backend connection failed";
});

attachSocket();
