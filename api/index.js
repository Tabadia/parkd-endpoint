import express from 'express';
import { Client } from "@gradio/client";

const app = express();
const SPACE_URL = "https://thalenn-lpr-permit-detection.hf.space";
let gradioClient;

/**
 * Try to connect over WebSocket, falling back to HTTP if all retries fail.
 */
async function initGradioClient(url, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempting WS connect to Gradio Space (#${i+1})…`);
      return await Client.connect(url);
    } catch (err) {
      console.warn(`WS connect failed (attempt ${i+1}):`, err.message);
      await new Promise(r => setTimeout(r, 1000 * 2**i));
    }
  }
  console.warn("All WS connect attempts failed—falling back to HTTP client");
  // HTTP client never sleeps on connect, each .predict() is a POST
  return new Client(url);
}

async function bootstrap() {
  gradioClient = await initGradioClient(SPACE_URL);
  console.log(`✅ Gradio client ready (${gradioClient instanceof Client ? 'HTTP' : 'WS/HTTP'})`);

  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.post('/api/detect_and_ocr', async (req, res) => {
    const { image: base64Image } = req.body;
    if (!base64Image) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const buf = Buffer.from(base64Image, 'base64');
    try {
      // If this was the HTTP client fallback, this will POST; otherwise WS.
      const result = await gradioClient.predict("/detect_and_ocr", { img_np: buf });
      return res.json(result.data);
    } catch (err) {
      console.error('OCR proxy error:', err);
      // If we were still on WS and it died mid-stream, switch to HTTP on the fly:
      if (gradioClient instanceof Client && gradioClient._transport === 'websocket') {
        console.warn("WebSocket failed during predict—switching to HTTP client and retrying once");
        gradioClient = new Client(SPACE_URL);
        try {
          const retry = await gradioClient.predict("/detect_and_ocr", { img_np: buf });
          return res.json(retry.data);
        } catch (retryErr) {
          console.error('Retry via HTTP also failed:', retryErr);
        }
      }
      return res.status(500).json({ error: 'Failed to process image', details: err.message });
    }
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}

bootstrap().catch(err => {
  console.error("Fatal error initializing Gradio client:", err);
  process.exit(1);
});
