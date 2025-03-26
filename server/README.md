# Emotion Analysis Server

This server uses DeepFace to analyze facial expressions from webcam frames captured during the AI Mock Interview process.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   npm run dev
   ```

## API Endpoints

### Analyze Emotion

**Endpoint:** `POST /analyze-emotion`

**Request Body:**
```json
{
  "imageData": "base64_encoded_image"
}
```

**Response:**
```json
{
  "timestamp": 1621234567890,
  "expressions": {
    "happy": 0.8,
    "neutral": 0.1,
    "sad": 0.02,
    "angry": 0.01,
    "surprised": 0.05,
    "fearful": 0.01,
    "disgusted": 0.01
  },
  "confidenceMetrics": {
    "confidenceScore": "8.5",
    "primaryEmotion": "happy"
  }
}
```

## Integration with Main Application

The main Next.js application communicates with this server to get real-time emotion analysis during interviews. The server processes webcam frames and returns emotion data that is displayed in the UI and stored with user answers.

## Fallback Mechanism

If the server is unavailable or returns an error, the client will fall back to a simulated mode that generates random emotion data to ensure the interview process can continue.

## Starting Both Servers

From the root directory of the project, you can:

1. Install server dependencies:
   ```
   npm run setup:emotion-server
   ```

2. Start both the Next.js app and emotion server together:
   ```
   npm run start:all
   ```

Or start just the emotion server:
```
npm run start:emotion-server
``` 