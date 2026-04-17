const state = {
  readings: [],
  analytics: null
};

const DEFAULT_API_ORIGIN = "http://127.0.0.1:4000";
const API_ORIGIN =
  window.location.protocol.startsWith("http") && window.location.port === "4000"
    ? window.location.origin
    : DEFAULT_API_ORIGIN;

const elements = {
  heroEntries: document.querySelector("#heroEntries"),
  heroWater: document.querySelector("#heroWater"),
  heroElectricity: document.querySelector("#heroElectricity"),
  heroCost: document.querySelector("#heroCost"),
  waterTotal: document.querySelector("#waterTotal"),
  electricityTotal: document.querySelector("#electricityTotal"),
  costTotal: document.querySelector("#costTotal"),
  healthStatus: document.querySelector("#healthStatus"),
  trendChart: document.querySelector("#trendChart"),
  insightCards: document.querySelector("#insightCards"),
  activityFeed: document.querySelector("#activityFeed"),
  readingForm: document.querySelector("#readingForm"),
  formFeedback: document.querySelector("#formFeedback"),
  liveStatus: document.querySelector("#liveStatus")
};

const apiHeaders = {
  "Content-Type": "application/json",
  "x-demo-user": "admin"
};

async function fetchJson(url, options = {}) {
  const response = await fetch(`${API_ORIGIN}${url}`, {
    headers: apiHeaders,
    ...options
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }

  return payload;
}

function formatUsage(resourceType, value) {
  return resourceType === "water"
    ? `${Math.round(value)} L`
    : `${Math.round(value)} kWh`;
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

function renderSummary() {
  const { summary } = state.analytics;
  elements.heroEntries.textContent = summary.totalEntries;
  elements.heroWater.textContent = formatUsage("water", summary.waterUsage);
  elements.heroElectricity.textContent = formatUsage(
    "electricity",
    summary.electricityUsage
  );
  elements.heroCost.textContent = formatCurrency(summary.totalCost);
  elements.waterTotal.textContent = formatUsage("water", summary.waterUsage);
  elements.electricityTotal.textContent = formatUsage(
    "electricity",
    summary.electricityUsage
  );
  elements.costTotal.textContent = formatCurrency(summary.totalCost);
}

function renderTrend() {
  const maxValue = Math.max(
    ...state.analytics.trend.map((entry) => entry.water + entry.electricity),
    1
  );

  elements.trendChart.innerHTML = state.analytics.trend
    .map((entry) => {
      const waterHeight = (entry.water / maxValue) * 100;
      const electricityHeight = (entry.electricity / maxValue) * 100;
      return `
        <article class="trend-bar">
          <div class="trend-bar__stack">
            <div class="trend-bar__water" style="height: ${waterHeight}%"></div>
            <div class="trend-bar__electricity" style="height: ${electricityHeight}%"></div>
          </div>
          <div class="trend-bar__label">${entry.date.slice(5)}</div>
        </article>
      `;
    })
    .join("");
}

function renderInsights() {
  elements.insightCards.innerHTML = state.analytics.insights
    .map(
      (insight) => `
        <article class="insight-item">
          <h5>${insight.title}</h5>
          <p>Average usage: ${formatUsage(insight.resourceType, insight.averageUsage)}</p>
          <p>Peak usage: ${formatUsage(insight.resourceType, insight.peakUsage)} on ${formatDate(insight.peakDate)}</p>
          <p>${insight.recommendation}</p>
        </article>
      `
    )
    .join("");
}

function renderActivity() {
  elements.activityFeed.innerHTML = state.readings
    .slice(0, 8)
    .map(
      (reading) => `
        <article class="activity-item" data-reading-id="${reading.id}">
          <div class="activity-item__head">
            <div>
              <span class="tag tag--${reading.resourceType}">${reading.resourceType}</span>
              <h5>${formatUsage(reading.resourceType, reading.amount)} at ${reading.location}</h5>
            </div>
            <button class="icon-button" type="button" data-action="delete" aria-label="Delete reading">&times;</button>
          </div>
          <div class="activity-item__meta">${formatDate(reading.recordedAt)}</div>
          <div class="activity-item__meta">Cost: ${formatCurrency(reading.cost)}</div>
          <div class="activity-item__meta">${reading.notes || "No notes provided"}</div>
        </article>
      `
    )
    .join("");
}

async function loadDashboard() {
  const [health, readings, analytics] = await Promise.all([
    fetchJson("/api/v1/health"),
    fetchJson("/api/v1/readings"),
    fetchJson("/api/v1/analytics/summary")
  ]);

  elements.healthStatus.textContent = `${health.message} - ${health.sessionViews} visits`;
  state.readings = readings.data;
  state.analytics = analytics.data;

  renderSummary();
  renderTrend();
  renderInsights();
  renderActivity();
}

async function submitReading(event) {
  event.preventDefault();
  const formData = new FormData(elements.readingForm);
  const payload = Object.fromEntries(formData.entries());
  payload.amount = Number(payload.amount);
  payload.cost = Number(payload.cost);
  payload.recordedAt = new Date(payload.recordedAt).toISOString();

  try {
    await fetchJson("/api/v1/readings", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    elements.formFeedback.textContent = "Reading saved and dashboard refreshed.";
    elements.readingForm.reset();
    await loadDashboard();
  } catch (error) {
    elements.formFeedback.textContent = error.message;
  }
}

async function handleFeedAction(event) {
  const actionButton = event.target.closest("[data-action='delete']");
  if (!actionButton) {
    return;
  }

  const item = actionButton.closest("[data-reading-id]");
  const readingId = item?.dataset.readingId;
  if (!readingId) {
    return;
  }

  try {
    await fetchJson(`/api/v1/readings/${readingId}`, {
      method: "DELETE"
    });
    await loadDashboard();
  } catch (error) {
    elements.formFeedback.textContent = error.message;
  }
}

function attachSocket() {
  if (!window.io) {
    elements.liveStatus.textContent = "Live updates unavailable";
    return;
  }

  const socket = window.io(API_ORIGIN);
  socket.on("tracker:status", (payload) => {
    elements.liveStatus.textContent = `${payload.message} - ${formatDate(payload.at)}`;
  });
  socket.on("reading:created", async () => {
    elements.liveStatus.textContent = "New reading received in real time";
    await loadDashboard();
  });
  socket.on("reading:deleted", async () => {
    elements.liveStatus.textContent = "Reading removed and synced";
    await loadDashboard();
  });
}

elements.readingForm.addEventListener("submit", submitReading);
elements.activityFeed.addEventListener("click", handleFeedAction);

loadDashboard().catch((error) => {
  elements.formFeedback.textContent = error.message;
  elements.healthStatus.textContent = "Backend connection failed";
});

attachSocket();
