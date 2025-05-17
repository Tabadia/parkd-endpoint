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
    const form = new FormData();
    form.append('img_np', req.file.buffer, req.file.originalname);

    const response = await axios.post(
      'https://thalenn-lpr-permit-detection.hf.space/run/predict',
      form,
      {
        headers: {
          ...form.getHeaders()
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process image', details: err.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app; 