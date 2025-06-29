#!/usr/bin/env tsx
/**
 * Quick and dirty endpoint comparison script: Orchestrator vs. Ollama
 * Usage: npx tsx scripts/compare-ollama-endpoints.ts
 *
 * Compares responses for all major endpoints between the orchestrator and a real Ollama server.
 * Prints diffs for response shape, status, and error codes.
 *
 * NOTE: This is not a full test suite—just a fast sanity check for API compatibility.
 */
import fetch, { RequestInit } from 'node-fetch';
import fs from 'fs';
import path from 'path';

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms (${label})`)), ms);
        promise.then(
            val => { clearTimeout(timer); resolve(val); },
            err => { clearTimeout(timer); reject(err); }
        );
    });
}

const orchestrator = 'http://localhost:5100';
const ollama = 'http://localhost:11434';

const OUTPUT_FILE = path.join(process.cwd(), 'compare-ollama-endpoints-results.txt');
const outputLines: string[] = [];

function logToBoth(...args: any[]) {
    const line = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a, null, 2))).join(' ');
    outputLines.push(line);
    console.log(...args);
}

const endpoints = [
    { method: 'GET', path: '/api/tags' },
    { method: 'GET', path: '/api/models' }, // not always present in Ollama
    { method: 'POST', path: '/api/generate', body: { model: 'smollm2:135m', prompt: 'Hello!', stream: false } },
    { method: 'POST', path: '/api/generate', body: { model: 'smollm2:135m', prompt: 'Hello!', stream: true } },
    { method: 'POST', path: '/api/generate/stream', body: { model: 'smollm2:135m', prompt: 'Hello!' } },
    { method: 'GET', path: '/api/show?model=smollm2:135m' },
    { method: 'POST', path: '/api/show', body: { model: 'smollm2:135m' } },
    { method: 'POST', path: '/api/embeddings', body: { model: 'smollm2:135m', prompt: 'Hello!' } },
    { method: 'POST', path: '/api/create', body: { model: 'test', base_model: 'smollm2:135m' } },
    { method: 'POST', path: '/api/convert', body: { model: 'test', format: 'gguf' } },
    { method: 'POST', path: '/api/stop', body: { model: 'smollm2:135m' } },
    { method: 'POST', path: '/api/push', body: { model: 'smollm2:135m' } },
    // { method: 'DELETE', path: '/api/delete', body: { model: 'smollm2:135m' } }, // Disabled: do not mass delete models across the fleet
];

async function call(server: string, endpoint: any) {
    const url = server + endpoint.path;
    const opts: RequestInit = { method: endpoint.method };
    if (endpoint.body) {
        opts.headers = { 'Content-Type': 'application/json' };
        opts.body = JSON.stringify(endpoint.body);
    }
    const label = `${server} ${endpoint.method} ${endpoint.path}`;
    const start = Date.now();
    try {
        process.stdout.write(`[DEBUG] Requesting ${label}\n`);
        const resp = await withTimeout(fetch(url, opts), 20000, label); // 20s timeout
        const elapsed = Date.now() - start;
        process.stdout.write(`[DEBUG] Response (${elapsed}ms) from ${label}\n`);
        let data;
        const contentType = resp.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            data = await resp.json();
        } else if (contentType.includes('application/x-ndjson')) {
            data = (await resp.text()).split('\n').filter(Boolean).map(line => {
                try { return JSON.parse(line); } catch { return line; }
            });
        } else {
            data = await resp.text();
        }
        return { status: resp.status, data };
    } catch (err) {
        process.stdout.write(`[ERROR] ${label}: ${err instanceof Error ? err.message : String(err)}\n`);
        return { error: err instanceof Error ? err.message : String(err) };
    }
}

function diff(a: any, b: any): string {
    if (JSON.stringify(a) === JSON.stringify(b)) return '';
    return `--- Orchestrator\n+++ Ollama\n${JSON.stringify(a, null, 2)}\n---\n${JSON.stringify(b, null, 2)}`;
}

async function setOrchestratorServers() {
    // Set orchestrator to use the local Ollama server before running tests
    const servers = [{ id: 'ollama', url: ollama, type: 'ollama' }];
    try {
        const resp = await fetch(`${orchestrator}/api/orchestrator/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ servers })
        });
        if (!resp.ok) {
            logToBoth(`[WARN] Failed to set orchestrator servers: ${resp.status}`);
        } else {
            logToBoth(`[INFO] Orchestrator servers set to local Ollama`);
        }
    } catch (err) {
        logToBoth(`[ERROR] Could not set orchestrator servers: ${err}`);
    }
}

(async () => {
    await setOrchestratorServers();
    for (const endpoint of endpoints) {
        const name = `${endpoint.method} ${endpoint.path}`;
        logToBoth(`\n[${name}]`);
        const orch = await call(orchestrator, endpoint);
        const oll = await call(ollama, endpoint);
        if (orch.error || oll.error) {
            logToBoth('Error:', { orchestrator: orch.error, ollama: oll.error });
            continue;
        }
        if (orch.status !== oll.status) {
            logToBoth(`Status mismatch: Orchestrator=${orch.status}, Ollama=${oll.status}`);
        }
        const d = diff(orch.data, oll.data);
        if (d) {
            logToBoth('Response diff:', d);
        } else {
            logToBoth('OK (responses match)');
        }
    }
    fs.writeFileSync(OUTPUT_FILE, outputLines.join('\n'), 'utf8');
    console.log(`\nResults written to ${OUTPUT_FILE}`);
})();
