import { config } from './config.js';
import app from './app.js';

app.listen(config.port, () => {
  console.log(`ResumeRadar API running on http://localhost:${config.port}`);
});
