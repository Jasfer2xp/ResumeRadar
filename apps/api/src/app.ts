import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { resumeRouter, searchRouter, jobsRouter } from './routes/index.js';

const app = express();

const allowedOrigins = [
  config.appUrl,
  ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'resumeradar-api' });
});

app.use('/api/resumes', resumeRouter);
app.use('/api/search', searchRouter);
app.use('/api/jobs', jobsRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
