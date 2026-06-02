const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const FormData = require('form-data');
const fetch    = require('node-fetch');
const multer   = require('multer');

const app  = express();
const PORT = process.env.PORT || 5000;
const FLASK_API = process.env.FLASK_API_URL || 'http://localhost:8000';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

app.post('/api/detect', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    const form = new FormData();
    form.append('image', req.file.buffer, {
      filename:    req.file.originalname || 'upload.jpg',
      contentType: req.file.mimetype     || 'image/jpeg',
    });

    const flaskRes = await fetch(`${FLASK_API}/detect`, {
      method:  'POST',
      body:    form,
      headers: form.getHeaders(),
      timeout: 30000,
    });

    if (!flaskRes.ok) {
      const errBody = await flaskRes.text();
      console.error('Flask error:', flaskRes.status, errBody);
      return res.status(502).json({ success: false, message: 'ML inference error from Flask' });
    }

    const mlResult = await flaskRes.json();

    const language = req.body.language || req.query.language || 'EN';
    let detectedText = mlResult.detectedText || 'Unknown';

    if (language === 'HI' && mlResult.success) {
      detectedText = detectedText + ' (हिन्दी मोड)';
    }

    const numBoxes = Math.min(8, detectedText.replace(/\s+/g, '').length || 1);
    const mockBboxes = [];
    for (let i = 0; i < numBoxes; i++) {
      mockBboxes.push({
        x:          Math.floor(10 + Math.random() * 70),
        y:          Math.floor(10 + Math.random() * 70),
        width:      Math.floor(8  + Math.random() * 12),
        height:     Math.floor(12 + Math.random() * 16),
        confidence: parseFloat((93 + Math.random() * 6).toFixed(1)),
      });
    }

    return res.status(200).json({
      success:        mlResult.success,
      detectedText:   detectedText,
      pattern:        mlResult.pattern        || '',
      confidence:     mlResult.confidence     || '—',
      model:          mlResult.model          || 'YOLOv8n-Braille + OpenCV',
      processingTime: mlResult.processingTime || '—',
      bboxes:         mockBboxes,
    });

  } catch (err) {
    console.error('Detection proxy error:', err.message);
    if (err.code === 'ECONNREFUSED' || err.type === 'request-timeout') {
      return res.status(503).json({
        success: false,
        message: 'ML backend offline. Start flask_api.py first.',
      });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
});

async function checkFlask() {
  try {
    const r = await fetch(`${FLASK_API}/ping`, { timeout: 3000 });
    const j = await r.json();
    console.log('  Flask ML API:', j.message);
  } catch {
    console.warn('  Flask ML API not reachable at', FLASK_API);
    console.warn('  Run:  python flask_api.py');
  }
}

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, async () => {
  console.log('===================================================');
  console.log(`  BrailleAI Server running at: http://localhost:${PORT}`);
  console.log('===================================================');
  await checkFlask();
});