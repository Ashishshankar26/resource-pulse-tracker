import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_URI || "";
let connectionPromise;
let seedPromise;

export function isDatabaseConfigured() {
  return Boolean(mongoUri);
}

export function getStorageMode() {
  return isDatabaseConfigured() ? "mongodb" : "json-fallback";
}

export async function connectDatabase() {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(mongoUri, {
      dbName: process.env.MONGODB_DB_NAME || undefined
    });
  }

  try {
    await connectionPromise;
    return mongoose.connection;
  } catch (error) {
    connectionPromise = null;
    throw error;
  }
}

export function getSeedPromise() {
  return seedPromise;
}

export function setSeedPromise(promise) {
  seedPromise = promise;
}
