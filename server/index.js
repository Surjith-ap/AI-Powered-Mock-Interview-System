const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const dotenv = require('dotenv');
const { spawn } = require('child_process');

// Load environment variables
dotenv.config();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Configure multer for file uploads (emotion analysis)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Configure multer for resume parsing (memory storage)
const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF and TXT files
    if (file.mimetype === 'application/pdf' || file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and TXT files are allowed.'));
    }
  },
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 10MB limit.' });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
};

// Routes
app.get('/', (req, res) => {
  res.send('AI Mock Interview Server is running (Emotion Analysis + Resume Parser)');
});

// Function to detect emotions using Python DeepFace script
async function detectEmotionsWithPython(imagePath) {
  return new Promise((resolve, reject) => {
    // Spawn a Python process to run the emotion analysis
    const pythonProcess = spawn('python', [
      path.join(__dirname, 'emotion_analyzer.py'),
      '--image', imagePath
    ]);
    
    let result = '';
    let error = '';
    
    // Collect data from stdout
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });
    
    // Collect errors from stderr
    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
      console.error(`[AI Mock Interview Server ERROR] ${data}`);
    });
    
    // Handle process completion
    pythonProcess.on('close', (code) => {
      // Clean up the uploaded file
      fs.unlink(imagePath, (err) => {
        if (err) console.error('Error deleting file:', err);
      });

      if (code !== 0) {
        console.error(`[AI Mock Interview Server ERROR] Python process exited with code ${code}`);
        return res.status(500).json({
          error: 'Error analyzing emotion',
          details: error
        });
      }

      try {
        // Parse the JSON result from the Python script
        const analysisResult = JSON.parse(result);
        if (!analysisResult.success) {
          reject(new Error(analysisResult.error || 'Failed to analyze emotion'));
        } else {
          resolve(analysisResult);
        }
      } catch (parseError) {
        console.error('[AI Mock Interview Server ERROR] Error parsing Python output:', parseError);
        reject(new Error('Error parsing emotion analysis results'));
      }
    });
  });
}

// Endpoint to analyze emotions from base64 image
app.post('/analyze-emotion', async (req, res) => {
  let pythonProcess = null;
  let processTimeoutId = null;
  
  try {
    console.log("[AI Mock Interview Server] Received emotion analysis request");
    
    // Check if base64 data is provided
    if (!req.body.imageData) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    console.log("[AI Mock Interview Server] Processing base64 image data");
    
    // Create a unique ID for this request
    const requestId = `emotion-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // Use a promise to handle the Python process
    const analyzeWithPython = new Promise((resolve, reject) => {
      // Spawn Python process with timeout
      pythonProcess = spawn('python', [
        path.join(__dirname, 'emotion_analyzer.py'),
        '--base64', req.body.imageData
      ]);
      
      // Set a timeout to kill the process if it takes too long
      processTimeoutId = setTimeout(() => {
        if (pythonProcess) {
          console.error('[AI Mock Interview Server ERROR] Python process timeout - killing process');
          cleanupProcess(pythonProcess);
          reject(new Error('Emotion analysis timed out after 10 seconds'));
        }
      }, 20000); // 20 second timeout
      
      let result = '';
      let error = '';
      
      // Collect data from stdout
      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      // Collect errors from stderr
      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
        console.error(`[AI Mock Interview Server] [${requestId}] ${data}`);
      });
      
      // Handle process completion
      pythonProcess.on('close', (code) => {
        // Clear the timeout since the process has completed
        if (processTimeoutId) {
          clearTimeout(processTimeoutId);
          processTimeoutId = null;
        }
        
        if (code !== 0) {
          console.error(`[AI Mock Interview Server ERROR] [${requestId}] Python process exited with code ${code}`);
          reject(new Error(`Emotion analysis failed with exit code ${code}: ${error}`));
          return;
        }

        try {
          // Parse the JSON result from the Python script
          if (!result || result.trim() === '') {
            reject(new Error('Empty response from Python script'));
            return;
          }
          
          const analysisResult = JSON.parse(result);
          
          if (!analysisResult.success) {
            reject(new Error(analysisResult.error || 'Unknown error'));
            return;
          }
          
          resolve(analysisResult);
        } catch (parseError) {
          console.error(`[AI Mock Interview Server ERROR] [${requestId}] Error parsing Python output:`, parseError);
          console.error(`[AI Mock Interview Server ERROR] [${requestId}] Raw output: ${result}`);
          reject(parseError);
        }
      });
      
      // Handle process errors
      pythonProcess.on('error', (err) => {
        if (processTimeoutId) {
          clearTimeout(processTimeoutId);
          processTimeoutId = null;
        }
        console.error(`[AI Mock Interview Server ERROR] [${requestId}] Failed to start Python process:`, err);
        reject(err);
      });
    });
    
    // Function to properly clean up a process
    const cleanupProcess = (process) => {
      if (!process) return;
      
      try {
        // Try both SIGTERM and SIGKILL for thorough cleanup
        process.kill('SIGTERM');
        
        // Give it a moment to terminate gracefully before forcing
        setTimeout(() => {
          try {
            if (process.exitCode === null) {
              process.kill('SIGKILL');
            }
          } catch (e) {
            // Process may already be gone, which is fine
          }
        }, 500);
      } catch (killError) {
        console.error('[AI Mock Interview Server ERROR] Error killing Python process:', killError);
      }
    };
    
    // Wait for the Python process to complete and handle the result or error
    const analysisResult = await analyzeWithPython;
    
    // Process is done, clear the reference
    pythonProcess = null;
    
    // Send successful response
    res.json({
      timestamp: Date.now(),
      expressions: analysisResult.expressions,
      confidenceMetrics: analysisResult.confidenceMetrics
    });
    
  } catch (error) {
    console.error('[AI Mock Interview Server ERROR] Error analyzing emotion:', error);
    
    // Clear timeout if it exists
    if (processTimeoutId) {
      clearTimeout(processTimeoutId);
      processTimeoutId = null;
    }
    
    // Kill the Python process if it's still running
    if (pythonProcess) {
      try {
        // Move cleanup to a separate function for consistency
        cleanupProcess(pythonProcess);
        pythonProcess = null;
      } catch (killError) {
        console.error('[AI Mock Interview Server ERROR] Error killing Python process:', killError);
      }
    }
    
    // Don't try to send response if headers already sent
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Error analyzing emotion',
        message: error.message
      });
    }
  }
});

// Original resume parsing endpoint (from server.js)
app.post('/api/parse-resume', resumeUpload.single('file'), handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    console.log('Processing file:', {
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size
    });

    let extractedText = '';

    if (req.file.mimetype === 'application/pdf') {
      try {
        // Ensure we have a valid buffer
        if (!req.file.buffer || req.file.buffer.length === 0) {
          throw new Error('Invalid PDF buffer');
        }

        // Parse PDF directly from buffer
        const pdfData = await pdfParse(req.file.buffer);
        
        if (!pdfData || !pdfData.text) {
          throw new Error('Failed to extract text from PDF');
        }

        extractedText = pdfData.text;
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        return res.status(400).json({
          error: 'Failed to parse PDF file. Please ensure the file is not corrupted or password protected.',
          details: pdfError.message
        });
      }
    } else {
      // For text files
      extractedText = req.file.buffer.toString('utf-8');
    }

    // Clean up extracted text
    extractedText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!extractedText || extractedText.trim() === '') {
      return res.status(400).json({ error: 'No text could be extracted from the file' });
    }

    res.json({
      success: true,
      text: extractedText,
      fileInfo: {
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size
      }
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Regular resume parsing endpoint (to match frontend)
app.post('/parse-resume', resumeUpload.single('resume'), handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    console.log('Processing file:', {
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size
    });

    let extractedText = '';

    if (req.file.mimetype === 'application/pdf') {
      try {
        // Ensure we have a valid buffer
        if (!req.file.buffer || req.file.buffer.length === 0) {
          throw new Error('Invalid PDF buffer');
        }

        // Parse PDF directly from buffer
        const pdfData = await pdfParse(req.file.buffer);
        
        if (!pdfData || !pdfData.text) {
          throw new Error('Failed to extract text from PDF');
        }

        extractedText = pdfData.text;
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        return res.status(400).json({
          error: 'Failed to parse PDF file. Please ensure the file is not corrupted or password protected.',
          details: pdfError.message
        });
      }
    } else {
      // For text files
      extractedText = req.file.buffer.toString('utf-8');
    }

    // Clean up extracted text
    extractedText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!extractedText || extractedText.trim() === '') {
      return res.status(400).json({ error: 'No text could be extracted from the file' });
    }

    res.json({
      success: true,
      text: extractedText,
      fileInfo: {
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size
      }
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message 
  });
});

// Start server
app.listen(port, () => {
  console.log(`AI Mock Interview Server running on port ${port}`);
  console.log(`- Emotion analysis endpoint: http://localhost:${port}/analyze-emotion`);
  console.log(`- Resume parsing endpoints:`);
  console.log(`  - http://localhost:${port}/api/parse-resume`);
  console.log(`  - http://localhost:${port}/parse-resume`);
}); 