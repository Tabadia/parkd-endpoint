const express = require('express');
const app = express();
const axios = require('axios');

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(express.json({ limit: '10mb' }));

app.post('/api/detect_and_ocr', async (req, res) => {
    try {
      // 1) Forward the same JSON you got from RN straight to HF/Gradio
      const payload = req.body;
      if (!payload?.data?.[0]) {
        return res.status(400).json({ error: 'No image uploaded' });
      }
  
      // 2) POST → get event_id
      const postRes = await axios.post(
        'https://thalenn-lpr-permit-detection.hf.space/gradio_api/call/detect_and_ocr',
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );
      const { event_id: eventId } = postRes.data;
  
      // 3) GET the SSE stream for that event
      const streamRes = await axios.get(
        `https://thalenn-lpr-permit-detection.hf.space/gradio_api/call/detect_and_ocr/${eventId}`,
        { responseType: 'stream' }
      );
  
      // 4) Collect chunks until the stream ends
      let buffer = '';
      streamRes.data.on('data', chunk => {
        buffer += chunk.toString();
      });
  
      streamRes.data.on('end', () => {
        // 5) Parse out all lines starting with "data: "
        const dataLines = buffer
          .split('\n')
          .filter(line => line.startsWith('data: '))
          .map(line => line.replace(/^data: /, ''));
  
        // 6) The last “data:” line is the final payload
        const last = dataLines.pop();
        const parsed = JSON.parse(last);
  
        // parsed.data is an array of your fn’s return values:
        // [ plateText, base64Image | null ]
        res.json({ data: parsed.data });
      });
  
      // Handle any stream errors
      streamRes.data.on('error', err => {
        console.error('Stream error:', err);
        res.status(500).json({ error: 'Failed to fetch results' });
      });
  
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