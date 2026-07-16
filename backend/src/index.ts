import cors from 'cors';
import express from 'express';

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

// Future: add authentication middleware and associate all records with a userId.
app.listen(port, () => {
  console.info(`Life Admin Autopilot API listening on port ${port}`);
});
