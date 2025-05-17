const express = require('express');
const app = express();
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

const upload = multer();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/detect_and_ocr', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
      }
  
      // Log for debugging
      console.log('Got file:', {
        originalname: req.file.originalname,
        mimetype:     req.file.mimetype,
        size:         req.file.size
      });
      console.log('Head of buffer:', req.file.buffer.slice(0, 16));
  
      // 1) Base64-encode the buffer
      const b64 = req.file.buffer.toString('base64');
  
      // 2) Build the Gradio JSON payload
      const payload = {
        data: [
          `data:${req.file.mimetype};base64,${b64}`
        ]
      };
  
      // 3) POST as JSON
      const hfResponse = await axios.post(
        'https://thalenn-lpr-permit-detection.hf.space/gradio_api/call/detect_and_ocr',
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
  
      // 4) Forward HF-space’s JSON result back to your client
      res.json(hfResponse.data);
  
    } catch (err) {
      console.error('OCR proxy error:', err.response?.data || err.message);
      res.status(500).json({
        error:   'Failed to process image',
        details: err.response?.data || err.message
      });
    }
  });

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app; 