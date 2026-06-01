const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all requests
app.use(cors());

// Parse JSON and URL-encoded bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Import Routes
const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

// Mock Detection Endpoint
app.post('/api/detect', (req, res) => {
  try {
    const { imageName, language } = req.body;
    
    // Simulate model inference time (1.5 seconds)
    setTimeout(() => {
      // Sample translations
      const englishTranslations = [
        { text: "HELLO WORLD", confidence: 99.1 },
        { text: "VISION FOR ALL", confidence: 98.4 },
        { text: "WELCOME TO HACKATHON", confidence: 97.8 },
        { text: "BRAILLE DETECTED SUCCESSFULLY", confidence: 99.4 },
        { text: "INNOVATIVE AI SOLUTION", confidence: 96.5 }
      ];

      const hindiTranslations = [
        { text: "नमस्ते दुनिया (HELLO WORLD)", confidence: 98.7 },
        { text: "सभी के लिए दृष्टि (VISION FOR ALL)", confidence: 97.5 },
        { text: "हैकथॉन में आपका स्वागत है", confidence: 98.2 },
        { text: "जय हिन्द (JAY HIND)", confidence: 99.6 },
        { text: "नया सवेरा (NEW DAWN)", confidence: 96.9 }
      ];

      const list = (language === 'HI' || language === 'Hindi') ? hindiTranslations : englishTranslations;
      
      // Determine index based on the hash of imageName, to keep it consistent for the same image name
      let sum = 0;
      if (imageName) {
        for (let i = 0; i < imageName.length; i++) {
          sum += imageName.charCodeAt(i);
        }
      } else {
        sum = Math.floor(Math.random() * 100);
      }
      const selectedIndex = sum % list.length;
      const result = list[selectedIndex];

      // Simulated bounding box data for visual overlays in the frontend
      const mockBboxes = [];
      const numBoxes = Math.min(10, result.text.replace(/\s+/g, '').length);
      for (let i = 0; i < numBoxes; i++) {
        mockBboxes.push({
          x: Math.floor(20 + Math.random() * 60),
          y: Math.floor(20 + Math.random() * 60),
          width: Math.floor(8 + Math.random() * 12),
          height: Math.floor(12 + Math.random() * 16),
          confidence: parseFloat((95 + Math.random() * 4.9).toFixed(1))
        });
      }

      return res.status(200).json({
        success: true,
        detectedText: result.text,
        confidence: `${result.confidence}%`,
        model: 'YOLOv8n-Braille (v1.0.4)',
        processingTime: '184ms',
        bboxes: mockBboxes
      });
    }, 1500);

  } catch (error) {
    console.error('Detection API error:', error);
    return res.status(500).json({ success: false, message: 'Inference engine error' });
  }
});

// Fallback to index.html for undefined frontend routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`  BrailleAI Server running at: http://localhost:${PORT}`);
  console.log(`  Serving Frontend from: ${path.join(__dirname, '../frontend')}`);
  console.log(`  Press Ctrl+C to terminate`);
  console.log(`===================================================`);
});
