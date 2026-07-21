import dotenv from 'dotenv';
import { resolve } from 'node:path';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import SQLiteStoreFactory from 'connect-sqlite3';
import { prisma } from './prisma/client.js';
import { itemRouter } from './routes/item.routes.js';
import { extractRouter } from './routes/extract.routes.js';
import { gmailRouter } from './routes/gmail.routes.js';
import { insightsRouter } from './routes/insights.routes.js';
import { errorHandler } from './utils/error-handler.js';
import { authRouter } from './routes/auth.routes.js';
import { requireAuthentication } from './utils/auth-middleware.js';
import { pendingImportRouter } from './routes/pending-import.routes.js';
import './types/session.js';

dotenv.config({ path: resolve(process.cwd(), '..', '.env') });

const app = express();
const port = Number(process.env.PORT ?? 3001);
const sqlite3 = require('sqlite3') as { Database: new (filename: string) => unknown };

app.use(cors());
app.use(express.json({ limit: '1mb' }));
const SQLiteStore = SQLiteStoreFactory(session);
const sessionDatabase = new sqlite3.Database(resolve(process.cwd(), '..', 'prisma', 'sessions.sqlite'));
const SessionStore = SQLiteStore as unknown as new (options: { db: unknown }) => session.Store;
app.use(session({ store: new SessionStore({ db: sessionDatabase }), secret: process.env.SESSION_SECRET ?? 'development-session-secret', resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' } }));

app.use('/api/auth', authRouter);
app.use('/api', requireAuthentication);
app.use('/api/items', itemRouter);
app.use('/api/extract', extractRouter);
app.use('/api', gmailRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/pending-imports', pendingImportRouter);

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use(errorHandler);

const server = app.listen(port, () => {
  console.info(`Tendly API listening on port ${port}`);
});

async function shutdown(signal: string) {
  console.info(`${signal} received: closing server.`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
