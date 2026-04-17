import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const readingsPath = path.join(__dirname, "..", "..", "data", "readings.json");
const isVercel = Boolean(process.env.VERCEL);
let cachedReadings = null;

async function readFromDisk() {
  const raw = await fs.readFile(readingsPath, "utf8");
  return JSON.parse(raw);
}

async function getCachedReadings() {
  if (cachedReadings) {
    return cachedReadings;
  }

  cachedReadings = await readFromDisk();
  return cachedReadings;
}

export async function getAllReadings() {
  if (isVercel) {
    return getCachedReadings();
  }

  return readFromDisk();
}

export async function saveAllReadings(readings) {
  cachedReadings = readings;

  if (isVercel) {
    return;
  }

  await fs.writeFile(readingsPath, JSON.stringify(readings, null, 2));
}

export async function addReading(payload) {
  const readings = await getAllReadings();
  const reading = {
    id: `rd-${Date.now()}`,
    ...payload
  };
  readings.unshift(reading);
  await saveAllReadings(readings);
  return reading;
}

export async function deleteReading(id) {
  const readings = await getAllReadings();
  const nextReadings = readings.filter((reading) => reading.id !== id);

  if (nextReadings.length === readings.length) {
    return null;
  }

  await saveAllReadings(nextReadings);
  return true;
}
