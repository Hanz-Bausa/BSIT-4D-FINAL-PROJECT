import { Router } from 'express';

const router = Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Admission API is working!' });
});

// Test data initialization
router.post('/init-data', async (req, res) => {
  try {
    const { initializeSampleData } = await import('../infrastructure/storage/initial-data.js');
    const result = await initializeSampleData();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;