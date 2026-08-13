import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { prisma } from '../database/client.js';
import { validateFile, extractText } from '../services/resume/extractor.js';
import { runSearchPipeline, getSearchResults } from '../services/search/pipeline.js';
import { routeParam } from '../utils/routeParam.js';
import { SEARCH_PROGRESS_STEPS } from '@resumeradar/shared';
mkdirSync(config.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadDir),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSizeMb * 1024 * 1024 },
});

export const resumeRouter = Router();

resumeRouter.post('/', upload.single('resume'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    validateFile(req.file.mimetype, req.file.originalname, req.file.size, config.maxFileSizeMb);

    const extractedText = await extractText(req.file.path, req.file.mimetype);

    const resume = await prisma.resume.create({
      data: {
        filename: req.file.originalname,
        fileType: req.file.mimetype,
        storagePath: req.file.path,
        extractedText,
      },
    });

    res.status(201).json({
      id: resume.id,
      filename: resume.filename,
      fileType: resume.fileType,
      createdAt: resume.createdAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    res.status(400).json({ error: message });
  }
});

resumeRouter.get('/:id', async (req: Request, res: Response) => {
  const id = routeParam(req, 'id');
  const resume = await prisma.resume.findUnique({
    where: { id },
    include: { candidateProfile: true },
  });

  if (!resume) {
    res.status(404).json({ error: 'Resume not found' });
    return;
  }

  res.json({
    id: resume.id,
    filename: resume.filename,
    fileType: resume.fileType,
    hasProfile: !!resume.candidateProfile,
    createdAt: resume.createdAt,
  });
});

resumeRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.resume.delete({ where: { id: routeParam(req, 'id') } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: 'Resume not found' });
  }
});

export const searchRouter = Router();

searchRouter.post('/resume/:id', async (req: Request, res: Response) => {
  try {
    const resumeId = routeParam(req, 'id');
    const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
    if (!resume) {
      res.status(404).json({ error: 'Resume not found' });
      return;
    }

    const searchRun = await prisma.searchRun.create({
      data: {
        resumeId: resume.id,
        status: 'pending',
        currentStep: 'uploaded',
        queries: [],
      },
    });

    runSearchPipeline(resume.id, searchRun.id).catch(console.error);

    res.status(202).json({
      searchRunId: searchRun.id,
      resumeId: resume.id,
      status: 'pending',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed to start';
    res.status(500).json({ error: message });
  }
});

searchRouter.get('/:id/status', async (req: Request, res: Response) => {
  const searchRun = await prisma.searchRun.findUnique({ where: { id: routeParam(req, 'id') } });
  if (!searchRun) {
    res.status(404).json({ error: 'Search run not found' });
    return;
  }

  const stepOrder = SEARCH_PROGRESS_STEPS.map((s) => s.id);
  const currentIdx = searchRun.currentStep
    ? stepOrder.indexOf(searchRun.currentStep)
    : -1;

  const steps = SEARCH_PROGRESS_STEPS.map((step, idx) => {
    let status: 'pending' | 'in_progress' | 'completed' | 'failed' = 'pending';
    if (searchRun.status === 'failed' && idx === currentIdx) status = 'failed';
    else if (searchRun.status === 'completed' || idx < currentIdx) status = 'completed';
    else if (idx === currentIdx) status = 'in_progress';
    return { ...step, status };
  });

  res.json({
    id: searchRun.id,
    resumeId: searchRun.resumeId,
    status: searchRun.status,
    currentStep: searchRun.currentStep,
    resultsFound: searchRun.resultsFound,
    error: searchRun.error,
    steps,
    completedAt: searchRun.completedAt,
  });
});

searchRouter.get('/resume/:id/results', async (req: Request, res: Response) => {
  try {
    const results = await getSearchResults(routeParam(req, 'id'));
    res.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get results';
    res.status(500).json({ error: message });
  }
});

export const jobsRouter = Router();

jobsRouter.get('/', async (req: Request, res: Response) => {
  const resumeId = req.query.resumeId as string | undefined;
  if (!resumeId) {
    res.status(400).json({ error: 'resumeId query parameter required' });
    return;
  }

  const results = await getSearchResults(resumeId);
  res.json({ jobs: results.jobs, total: results.jobs.length });
});

jobsRouter.get('/:id', async (req: Request, res: Response) => {
  const job = await prisma.job.findUnique({
    where: { id: routeParam(req, 'id') },
    include: { jobMatches: true },
  });

  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.json(job);
});
