import express from 'express';
import { loadRoutes } from './lib/dynamicRoutes';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

async function startServer() {
  app.get('/api', (req, res) => {
    res.json({ message: 'API is running' });
  });

  const dynamicRoutes = await loadRoutes();
  for (const router of dynamicRoutes) {
    app.use('/api', router);
  }

  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
}

startServer();
