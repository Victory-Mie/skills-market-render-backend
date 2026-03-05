import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes - Import serverless functions
const apiRoutes = [
  { path: '/api/orders', file: './api/orders/index.js' },
  { path: '/api/orders/:id', file: './api/orders/[id].js' },
  { path: '/api/skills', file: './api/skills/index.js' },
  { path: '/api/my-skills', file: './api/my-skills/index.js' },
  { path: '/api/user/profile', file: './api/user/profile.js' },
  { path: '/api/health', file: './api/health.js' },
  { path: '/api/trials/config', file: './api/trials/config/index.js' },
  { path: '/api/trials/start', file: './api/trials/start.js' },
  { path: '/api/trials', file: './api/trials/index.js' },
  { path: '/api/developer/trials/config', file: './api/developer/trials/config.js' },
  { path: '/api/developer/trials/stats', file: './api/developer/trials/stats.js' },
  { path: '/api/cleanup/trials', file: './api/cleanup/trials.js' },
];

// Register routes dynamically
apiRoutes.forEach(({ path, file }) => {
  app.all(path, async (req, res) => {
    try {
      const module = await import(join(__dirname, file));
      const handler = module.default;
      await handler(req, res);
    } catch (error) {
      console.error(`Error in ${path}:`, error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
