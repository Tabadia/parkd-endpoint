require('dotenv').config();
const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const { Client } = require('@gradio/client');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'API is running' });
});

// Process image endpoint
app.post('/api/process-permit', async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imageFile = req.files.image;
    
    // Initialize Gradio client
    const client = await Client.connect("thalenn/lpr-permit-detection");
    
    // Process the image
    const result = await client.predict("/detect_and_ocr", { 
      img_np: imageFile.data,
    });

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process image',
      details: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
