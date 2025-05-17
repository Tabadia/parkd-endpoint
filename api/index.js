const express = require('express');
const app = express();
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

const upload = multer();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(express.json({ limit: '10mb' }));

app.post('/api/detect_and_ocr', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload?.data?.[0]) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // debug logging
    console.log('Forwarding payload size:', Buffer.byteLength(JSON.stringify(payload)), 'bytes');

    const hfResponse = await axios.post(
      'https://thalenn-lpr-permit-detection.hf.space/gradio_api/call/detect_and_ocr',
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );

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