import express from 'express';
import { Client } from "@gradio/client";
const app = express();

// Initialize Gradio client (adjust URL if your Gradio app runs elsewhere)
let gradioClient;
(async () => {
  gradioClient = await Client.connect("thalenn/lpr-permit-detection");
})();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(express.json({ limit: '10mb' }));

app.post('/api/detect_and_ocr', async (req, res) => {
  try {
    // Accept image as base64 string in req.body.image
    const base64Image = req.body.image;
    if (!base64Image) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // Convert base64 to Buffer
    const imageBuffer = Buffer.from(base64Image, 'base64');

    // debug logging
    console.log('Forwarding image buffer size:', imageBuffer.length, 'bytes');

    if (!gradioClient) {
      return res.status(503).json({ error: 'Gradio client not initialized yet' });
    }

    // Call Gradio predict endpoint with the correct parameter object
    // This assumes your Gradio function is exposed at "/detect_and_ocr" and expects { img_np: <image> }
    const result = await gradioClient.predict("/detect_and_ocr", { img_np: imageBuffer });
    res.json(result.data);
  } catch (err) {
    console.error('OCR proxy error:', err.message || err);
    res.status(500).json({
      error:   'Failed to process image',
      details: err.message || err
    });
  }
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;