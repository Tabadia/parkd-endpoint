const express = require('express');
const app = express();
const axios = require('axios');

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
  
      // 1) Send your base64 JSON to HF-space → get event_id
      const postRes = await axios.post(
        'https://thalenn-lpr-permit-detection.hf.space/gradio_api/call/detect_and_ocr',
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );
      const eventId = postRes.data.event_id;
      if (!eventId) {
        throw new Error('No event_id returned from Gradio');
      }
  
      // 2) Fetch the SSE stream for that event
      const streamRes = await axios.get(
        `https://thalenn-lpr-permit-detection.hf.space/gradio_api/call/detect_and_ocr/${eventId}`,
        { responseType: 'stream' }
      );
  
      let buffer = '';
      streamRes.data.on('data', chunk => {
        buffer += chunk.toString();
      });
  
      streamRes.data.on('end', () => {
        // Extract all lines that start with "data: "
        const dataLines = buffer
          .split('\n')
          .filter(line => line.startsWith('data: '))
          .map(line => line.replace(/^data: /, ''));
  
        if (dataLines.length === 0) {
          return res.status(500).json({ error: 'No data in SSE stream' });
        }
  
        // The last data line is your final payload
        const finalPayload = JSON.parse(dataLines.pop());
        // finalPayload.data is an array: [ plateText, base64Image|null ]
        return res.json({ data: finalPayload.data });
      });
  
      streamRes.data.on('error', err => {
        console.error('SSE stream error:', err);
        return res.status(500).json({ error: 'Failed to fetch results' });
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