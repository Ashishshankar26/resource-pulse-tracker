const RESOURCE_LABELS = {
  water: "Water",
  electricity: "Electricity"
};

export function buildAnalytics(readings) {
  const totals = readings.reduce(
    (acc, reading) => {
      const key = reading.resourceType;
      acc[key].usage += Number(reading.amount);
      acc[key].cost += Number(reading.cost);
      acc.totalCost += Number(reading.cost);
      return acc;
    },
    {
      water: { usage: 0, cost: 0 },
      electricity: { usage: 0, cost: 0 },
      totalCost: 0
    }
  );

  const groupedByDay = readings.reduce((acc, reading) => {
    const day = new Date(reading.recordedAt).toLocaleDateString("en-CA");
    if (!acc[day]) {
      acc[day] = {
        date: day,
        water: 0,
        electricity: 0
      };
    }
    acc[day][reading.resourceType] += Number(reading.amount);
    return acc;
  }, {});

  const trend = Object.values(groupedByDay).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const recent = [...readings]
    .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
    .slice(0, 5);

  const insightCards = ["water", "electricity"].map((resourceType) => {
    const resourceReadings = readings.filter(
      (reading) => reading.resourceType === resourceType
    );
    const totalUsage = totals[resourceType].usage;
    const average =
      resourceReadings.length > 0 ? totalUsage / resourceReadings.length : 0;
    const peakReading = resourceReadings.reduce(
      (peak, reading) => (reading.amount > peak.amount ? reading : peak),
      resourceReadings[0] || { amount: 0, recordedAt: new Date().toISOString() }
    );

    return {
      resourceType,
      title: `${RESOURCE_LABELS[resourceType]} efficiency`,
      averageUsage: average,
      peakUsage: peakReading.amount,
      peakDate: peakReading.recordedAt,
      recommendation:
        resourceType === "water"
          ? "Shift irrigation and cleaning tasks away from peak days to flatten water demand."
          : "Reduce evening spikes by scheduling high-load appliances during off-peak periods."
    };
  });

  return {
    summary: {
      totalEntries: readings.length,
      waterUsage: totals.water.usage,
      electricityUsage: totals.electricity.usage,
      totalCost: totals.totalCost
    },
    trend,
    recent,
    insights: insightCards
  };
}
