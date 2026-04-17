function buildEntry(offsetDays, hour, overrides) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() - offsetDays);

  return {
    recordedAt: date.toISOString(),
    ...overrides
  };
}

export function getDemoReadings() {
  return [
    buildEntry(0, 7, {
      resourceType: "water",
      amount: 540,
      unit: "L",
      cost: 24,
      location: "Main Building",
      notes: "Morning cleaning cycle"
    }),
    buildEntry(0, 19, {
      resourceType: "electricity",
      amount: 46,
      unit: "kWh",
      cost: 11,
      location: "Office Wing",
      notes: "Evening lighting and AC"
    }),
    buildEntry(1, 6, {
      resourceType: "water",
      amount: 610,
      unit: "L",
      cost: 27,
      location: "Garden Zone",
      notes: "Irrigation run"
    }),
    buildEntry(1, 20, {
      resourceType: "electricity",
      amount: 51,
      unit: "kWh",
      cost: 12,
      location: "Office Wing",
      notes: "Peak office demand"
    }),
    buildEntry(3, 8, {
      resourceType: "water",
      amount: 450,
      unit: "L",
      cost: 18,
      location: "Cafeteria",
      notes: "Kitchen prep and cleanup"
    }),
    buildEntry(3, 18, {
      resourceType: "electricity",
      amount: 39,
      unit: "kWh",
      cost: 9,
      location: "Lab Block",
      notes: "Late lab equipment load"
    }),
    buildEntry(6, 7, {
      resourceType: "water",
      amount: 500,
      unit: "L",
      cost: 22,
      location: "Hostel A",
      notes: "Laundry and washroom use"
    }),
    buildEntry(6, 21, {
      resourceType: "electricity",
      amount: 58,
      unit: "kWh",
      cost: 13,
      location: "Hostel A",
      notes: "Night cooling demand"
    }),
    buildEntry(12, 9, {
      resourceType: "water",
      amount: 470,
      unit: "L",
      cost: 20,
      location: "Admin Block",
      notes: "Routine sanitation usage"
    }),
    buildEntry(12, 17, {
      resourceType: "electricity",
      amount: 42,
      unit: "kWh",
      cost: 10,
      location: "Admin Block",
      notes: "Printer and server uptime"
    }),
    buildEntry(18, 7, {
      resourceType: "water",
      amount: 690,
      unit: "L",
      cost: 30,
      location: "Sports Complex",
      notes: "Ground maintenance"
    }),
    buildEntry(18, 19, {
      resourceType: "electricity",
      amount: 64,
      unit: "kWh",
      cost: 15,
      location: "Sports Complex",
      notes: "Floodlights and pump load"
    }),
    buildEntry(26, 7, {
      resourceType: "water",
      amount: 520,
      unit: "L",
      cost: 23,
      location: "Main Building",
      notes: "Washroom refill cycle"
    }),
    buildEntry(26, 20, {
      resourceType: "electricity",
      amount: 48,
      unit: "kWh",
      cost: 11,
      location: "Library",
      notes: "Extended study hours"
    }),
    buildEntry(34, 8, {
      resourceType: "water",
      amount: 560,
      unit: "L",
      cost: 25,
      location: "Hostel B",
      notes: "Bathing and cleaning use"
    }),
    buildEntry(34, 19, {
      resourceType: "electricity",
      amount: 44,
      unit: "kWh",
      cost: 10,
      location: "Hostel B",
      notes: "Common room demand"
    }),
    buildEntry(43, 6, {
      resourceType: "water",
      amount: 610,
      unit: "L",
      cost: 28,
      location: "Garden Zone",
      notes: "Landscape irrigation"
    }),
    buildEntry(43, 18, {
      resourceType: "electricity",
      amount: 54,
      unit: "kWh",
      cost: 12,
      location: "Main Building",
      notes: "Conference event load"
    }),
    buildEntry(52, 7, {
      resourceType: "water",
      amount: 480,
      unit: "L",
      cost: 19,
      location: "Cafeteria",
      notes: "Utensil wash and prep"
    }),
    buildEntry(52, 20, {
      resourceType: "electricity",
      amount: 47,
      unit: "kWh",
      cost: 11,
      location: "Cafeteria",
      notes: "Cold storage and ovens"
    }),
    buildEntry(68, 7, {
      resourceType: "water",
      amount: 575,
      unit: "L",
      cost: 26,
      location: "Main Building",
      notes: "Holiday cleaning cycle"
    }),
    buildEntry(68, 18, {
      resourceType: "electricity",
      amount: 52,
      unit: "kWh",
      cost: 12,
      location: "Library",
      notes: "Evening reading hall load"
    }),
    buildEntry(91, 6, {
      resourceType: "water",
      amount: 640,
      unit: "L",
      cost: 29,
      location: "Sports Complex",
      notes: "Weekend maintenance"
    }),
    buildEntry(91, 21, {
      resourceType: "electricity",
      amount: 61,
      unit: "kWh",
      cost: 15,
      location: "Sports Complex",
      notes: "Late event lighting"
    }),
    buildEntry(122, 8, {
      resourceType: "water",
      amount: 490,
      unit: "L",
      cost: 21,
      location: "Hostel B",
      notes: "Routine sanitation"
    }),
    buildEntry(122, 19, {
      resourceType: "electricity",
      amount: 45,
      unit: "kWh",
      cost: 10,
      location: "Hostel B",
      notes: "Cooling and common room load"
    }),
    buildEntry(151, 7, {
      resourceType: "water",
      amount: 530,
      unit: "L",
      cost: 24,
      location: "Garden Zone",
      notes: "Dry-season watering"
    }),
    buildEntry(151, 20, {
      resourceType: "electricity",
      amount: 57,
      unit: "kWh",
      cost: 13,
      location: "Admin Block",
      notes: "Server and HVAC demand"
    })
  ];
}
