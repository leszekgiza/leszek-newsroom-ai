#!/usr/bin/env node
/**
 * Diagnostyczny skrypt do debugowania uruchamiania Next.js
 * Loguje: pamięć, procesy, zdarzenia, błędy
 */

import { spawn } from 'child_process';
import { writeFileSync, appendFileSync } from 'fs';
import { platform, totalmem, freemem } from 'os';

const LOG_FILE = 'startup-debug.log';
const startTime = Date.now();

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function formatTime() {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  return `[+${elapsed}s]`;
}

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const mem = process.memoryUsage();
  const systemMem = {
    total: formatBytes(totalmem()),
    free: formatBytes(freemem()),
    usedPercent: ((1 - freemem() / totalmem()) * 100).toFixed(1) + '%'
  };

  const logEntry = {
    timestamp,
    elapsed: formatTime(),
    message,
    processMemory: {
      heapUsed: formatBytes(mem.heapUsed),
      heapTotal: formatBytes(mem.heapTotal),
      rss: formatBytes(mem.rss),
      external: formatBytes(mem.external)
    },
    systemMemory: systemMem,
    data
  };

  const logLine = JSON.stringify(logEntry, null, 2) + '\n---\n';

  console.log(`${formatTime()} ${message}`);
  if (data) console.log('  Data:', JSON.stringify(data));
  console.log(`  Process RSS: ${logEntry.processMemory.rss}, System free: ${systemMem.free} (${systemMem.usedPercent} used)`);

  appendFileSync(LOG_FILE, logLine);
}

function logError(message, error) {
  log(`ERROR: ${message}`, {
    errorMessage: error?.message,
    errorStack: error?.stack,
    errorCode: error?.code,
    errorSignal: error?.signal
  });
}

// Inicjalizacja logu
writeFileSync(LOG_FILE, `=== Next.js Startup Debug Log ===\nStarted: ${new Date().toISOString()}\nPlatform: ${platform()}\nNode: ${process.version}\n\n`);

log('Starting diagnostics', {
  cwd: process.cwd(),
  nodeVersion: process.version,
  platform: platform(),
  pid: process.pid
});

// Obsługa sygnałów procesu
process.on('uncaughtException', (err) => {
  logError('Uncaught exception in debug script', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logError('Unhandled rejection in debug script', reason);
});

process.on('SIGINT', () => {
  log('Received SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM');
  process.exit(0);
});

// Monitorowanie pamięci co 2 sekundy
const memoryInterval = setInterval(() => {
  const mem = process.memoryUsage();
  const sysFree = freemem();
  const sysTotal = totalmem();

  // Ostrzeżenie jeśli mało pamięci
  if (sysFree < 500 * 1024 * 1024) { // < 500MB free
    log('WARNING: Low system memory!', {
      freeMemory: formatBytes(sysFree),
      percentFree: ((sysFree / sysTotal) * 100).toFixed(1) + '%'
    });
  }
}, 2000);

// Uruchom Next.js dev server
log('Spawning Next.js dev server...');

const nextProcess = spawn('npm', ['run', 'dev'], {
  cwd: process.cwd(),
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NODE_OPTIONS: '--max-old-space-size=4096', // 4GB limit
    FORCE_COLOR: '1'
  }
});

log('Next.js process spawned', { pid: nextProcess.pid });

// Logowanie stdout
nextProcess.stdout.on('data', (data) => {
  const text = data.toString().trim();
  if (text) {
    log('STDOUT', { output: text.substring(0, 500) });
  }
});

// Logowanie stderr
nextProcess.stderr.on('data', (data) => {
  const text = data.toString().trim();
  if (text) {
    log('STDERR', { output: text.substring(0, 500) });
  }
});

// Obsługa błędów procesu
nextProcess.on('error', (err) => {
  logError('Process spawn error', err);
  clearInterval(memoryInterval);
});

// Obsługa zamknięcia procesu
nextProcess.on('close', (code, signal) => {
  log('Process closed', { exitCode: code, signal });
  clearInterval(memoryInterval);

  if (code !== 0 && code !== null) {
    log('ABNORMAL EXIT - check logs above for errors');
  }
  if (signal) {
    log(`Process was killed by signal: ${signal}`);
  }
});

nextProcess.on('exit', (code, signal) => {
  log('Process exited', { exitCode: code, signal });
});

// Informacja dla użytkownika
console.log('\n========================================');
console.log('Debug mode active. Logs saved to:', LOG_FILE);
console.log('Press Ctrl+C to stop');
console.log('========================================\n');
