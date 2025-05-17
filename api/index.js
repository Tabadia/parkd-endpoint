const express = require('express');
const app = express();
const { Client } = require('@gradio/client');
const multer = require('multer');

// Set up multer for file uploads
const upload = multer();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/detect_and_ocr', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    // Connect to the Gradio Space
    const client = await Client.connect("thalenn/lpr-permit-detection");
    // Call the predict function with the uploaded image
    const result = await client.predict("/detect_and_ocr", {
      img_np: new Blob([req.file.buffer], { type: req.file.mimetype })
    });
    res.json(result.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process image', details: err.message });
  }
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export the Express API
module.exports = app; 