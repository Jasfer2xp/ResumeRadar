import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(__dirname, '../../../.env') });

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL ?? '',
  nvidiaApiKey: process.env.NVIDIA_API_KEY ?? '',
  nvidiaResumeModel: process.env.NVIDIA_RESUME_MODEL ?? 'thinkingmachines/inkling',
  nvidiaMatchModel: process.env.NVIDIA_MATCH_MODEL ?? 'openai/gpt-oss-20b',
  nvidiaReasonModel: process.env.NVIDIA_REASON_MODEL || null,
  searchApiKey: process.env.SEARCH_API_KEY ?? '',
  searchProvider: process.env.SEARCH_PROVIDER ?? 'tavily',
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  apiUrl: process.env.API_URL ?? 'http://localhost:3000',
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB ?? '10', 10),
  maxSearchResults: parseInt(process.env.MAX_SEARCH_RESULTS ?? '50', 10),
  maxJobsToMatch: parseInt(process.env.MAX_JOBS_TO_MATCH ?? '20', 10),
  topResults: parseInt(process.env.TOP_RESULTS ?? '15', 10),
  uploadDir: resolve(__dirname, '../uploads'),
};
