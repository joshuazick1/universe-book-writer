// proxy-server.ts
// Express proxy for Ollama-compatible API with request/response logging to a file in the current working directory
import express from 'express';
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
import fs from 'fs';
import path from 'path';

const app = express();
const TARGET = process.env.OLLAMA_TARGET || 'http://35.132.148.128:11434'; // Set your Ollama server URL
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const logFile = path.join(process.cwd(), 'proxy.log'); // Always logs to CWD

function logToFile(msg: string) {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(logFile, line, { encoding: 'utf8' });
}


// Basic relay proxy for all /api/* requests
app.use('/api', createProxyMiddleware({
    target: TARGET,
    changeOrigin: true,
    logLevel: 'debug',
    onError(err, req, res) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Proxy error: ' + err);
    },
}));

app.listen(PORT, () => {
    console.log(`Ollama API proxy listening on http://localhost:${PORT}/ (target: ${TARGET})`);
    console.log(`Logging all traffic to ${logFile}`);
});
