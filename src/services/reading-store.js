import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  connectDatabase,
  getSeedPromise,
  isDatabaseConfigured,
  setSeedPromise
} from "../config/database.js";
import { Reading } from "../models/reading.js";
import { getDemoReadings } from "../utils/demo-readings.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const readingsPath = path.join(__dirname, "..", "..", "data", "readings.json");
const isVercelRuntime = Boolean(process.env.VERCEL);
let cachedReadings = null;

async function readFromDisk() {
  const raw = await fs.readFile(readingsPath, "utf8");
  return JSON.parse(raw);
}

async function getFallbackReadings() {
  if (isVercelRuntime) {
    if (!cachedReadings) {
      cachedReadings = await readFromDisk();
    }
    return cachedReadings;
  }

  return readFromDisk();
}

function normalizeReading(reading) {
  if (!reading) {
    return null;
  }

  const source = typeof reading.toObject === "function" ? reading.toObject() : reading;
  const id = source._id ? String(source._id) : source.id;

  return {
    id,
    resourceType: source.resourceType,
    amount: Number(source.amount),
    cost: Number(source.cost),
    unit: source.unit,
    location: source.location,
    recordedAt: new Date(source.recordedAt).toISOString(),
    notes: source.notes || ""
  };
}

async function ensureMongoSeeded() {
  if (!isDatabaseConfigured()) {
    return;
  }

  const currentSeed = getSeedPromise();
  if (currentSeed) {
    await currentSeed;
    return;
  }

  const seedRun = (async () => {
    const existingCount = await Reading.countDocuments();
    if (existingCount > 0) {
      return;
    }

    const fallbackReadings = await readFromDisk();
    if (!fallbackReadings.length) {
      return;
    }

    await Reading.insertMany(
      fallbackReadings.map((reading) => ({
        resourceType: reading.resourceType,
        amount: Number(reading.amount),
        cost: Number(reading.cost),
        unit: reading.unit,
        location: reading.location,
        recordedAt: new Date(reading.recordedAt),
        notes: reading.notes || ""
      }))
    );
  })();

  setSeedPromise(seedRun);

  try {
    await seedRun;
  } catch (error) {
    setSeedPromise(null);
    throw error;
  }
}

export async function getAllReadings() {
  if (isDatabaseConfigured()) {
    await connectDatabase();
    await ensureMongoSeeded();
    const readings = await Reading.find().sort({ recordedAt: -1, createdAt: -1 }).lean();
    return readings.map(normalizeReading);
  }

  return getFallbackReadings();
}

export async function saveAllReadings(readings) {
  if (isDatabaseConfigured()) {
    await connectDatabase();
    await Reading.deleteMany({});

    if (readings.length) {
      await Reading.insertMany(
        readings.map((reading) => ({
          resourceType: reading.resourceType,
          amount: Number(reading.amount),
          cost: Number(reading.cost),
          unit: reading.unit,
          location: reading.location,
          recordedAt: new Date(reading.recordedAt),
          notes: reading.notes || ""
        }))
      );
    }

    return;
  }

  cachedReadings = readings;

  if (isVercelRuntime) {
    return;
  }

  await fs.writeFile(readingsPath, JSON.stringify(readings, null, 2));
}

export async function addReading(payload) {
  if (isDatabaseConfigured()) {
    await connectDatabase();
    await ensureMongoSeeded();
    const reading = await Reading.create({
      ...payload,
      amount: Number(payload.amount),
      cost: Number(payload.cost),
      recordedAt: new Date(payload.recordedAt),
      notes: payload.notes || ""
    });

    return normalizeReading(reading);
  }

  const readings = await getAllReadings();
  const reading = {
    id: `rd-${Date.now()}`,
    ...payload
  };
  readings.unshift(reading);
  await saveAllReadings(readings);
  return reading;
}

export async function updateReading(id, payload) {
  if (isDatabaseConfigured()) {
    await connectDatabase();
    await ensureMongoSeeded();

    const reading = await Reading.findByIdAndUpdate(
      id,
      {
        ...payload,
        amount: Number(payload.amount),
        cost: Number(payload.cost),
        recordedAt: new Date(payload.recordedAt),
        notes: payload.notes || ""
      },
      {
        new: true,
        runValidators: true
      }
    );

    return normalizeReading(reading);
  }

  const readings = await getAllReadings();
  const index = readings.findIndex((reading) => reading.id === id);

  if (index === -1) {
    return null;
  }

  const updated = {
    ...readings[index],
    ...payload,
    id
  };

  readings[index] = updated;
  await saveAllReadings(readings);
  return updated;
}

export async function deleteReading(id) {
  if (isDatabaseConfigured()) {
    await connectDatabase();
    await ensureMongoSeeded();
    const result = await Reading.findByIdAndDelete(id);
    return Boolean(result);
  }

  const readings = await getAllReadings();
  const nextReadings = readings.filter((reading) => reading.id !== id);

  if (nextReadings.length === readings.length) {
    return null;
  }

  await saveAllReadings(nextReadings);
  return true;
}

export async function seedDemoReadings({ replaceExisting = false } = {}) {
  const demoReadings = getDemoReadings();

  if (isDatabaseConfigured()) {
    await connectDatabase();

    if (replaceExisting) {
      await Reading.deleteMany({});
    }

    const existingCount = await Reading.countDocuments();
    if (existingCount > 0 && !replaceExisting) {
      return {
        inserted: 0,
        skipped: true,
        total: existingCount
      };
    }

    const created = await Reading.insertMany(
      demoReadings.map((reading) => ({
        ...reading,
        amount: Number(reading.amount),
        cost: Number(reading.cost),
        recordedAt: new Date(reading.recordedAt),
        notes: reading.notes || ""
      }))
    );

    return {
      inserted: created.length,
      skipped: false,
      total: await Reading.countDocuments()
    };
  }

  const existingReadings = await getAllReadings();
  if (existingReadings.length > 0 && !replaceExisting) {
    return {
      inserted: 0,
      skipped: true,
      total: existingReadings.length
    };
  }

  const normalized = demoReadings.map((reading, index) => ({
    id: `demo-${Date.now()}-${index}`,
    ...reading
  }));

  await saveAllReadings(normalized);

  return {
    inserted: normalized.length,
    skipped: false,
    total: normalized.length
  };
}
