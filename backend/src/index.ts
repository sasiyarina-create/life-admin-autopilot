import cors from 'cors';
import express from 'express';
import { prisma } from './prisma/client.js';
import { itemRouter } from './routes/item.routes.js';
import { errorHandler } from './utils/error-handler.js';

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

app.use('/api/items', itemRouter);

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use(errorHandler);

// Future: add authentication middleware and associate all records with a userId.
const server = app.listen(port, () => {
  console.info(`Life Admin Autopilot API listening on port ${port}`);
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
