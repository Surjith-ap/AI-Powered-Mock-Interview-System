# AI Mock Interview Platform

A comprehensive AI-powered mock interview platform with dynamic question generation, facial expression analysis, and audio recording capabilities.

## Features

- **AI-Powered Interviews**: Generates interview questions based on job positions and descriptions
- **Dynamic Question Generation**: Creates follow-up questions based on previous answers
- **Facial Expression Analysis**: Real-time emotion tracking during interviews
- **Audio Recording & Transcription**: Records and transcribes interview answers
- **Performance Feedback**: Provides ratings and improvement suggestions for answers
- **User Authentication**: Secure user login and profile management
- **Resume Parsing**: Extracts and analyzes text from PDF and TXT resumes

## Setup and Installation

### Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- Python (required for DeepFace)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd ai-mock-interview
   ```

2. Install main application dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file with the following:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   DATABASE_URL=your_database_url
   NEXT_PUBLIC_EMOTION_SERVER_URL=http://localhost:3001
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

4. Install server dependencies:
   ```
   npm run setup:emotion-server
   ```

## Running the Application

### Start both the Next.js app and the server together:
```
npm run start:all
```

### Or start them separately:

1. Start the Next.js app:
   ```
   npm run dev
   ```

2. Start the analysis server (handles both emotion analysis and resume parsing):
   ```
   npm run start:emotion-server
   ```

## How It Works

### Interview Process

1. User uploads their resume for analysis (optional)
2. User selects a job position and provides a job description
3. System generates interview questions using Gemini AI
4. User records audio/video responses
5. System transcribes and analyzes answers
6. System generates follow-up questions based on user responses
7. Facial expressions are analyzed in real-time during the interview
8. Feedback and ratings are provided for each answer

### Resume Parsing

The application uses PDF parsing to analyze uploaded resumes:

- Accepts PDF and TXT formats (up to 10MB)
- Extracts text content from the documents
- Analyzes the text to identify skills, experience, and education
- Uses the extracted information to personalize interview questions
- Stores resume data for future reference

### Facial Expression Analysis

The application uses DeepFace to analyze facial expressions during interviews:

- Captures webcam frames at regular intervals
- Processes frames through a dedicated server
- Detects emotions like happiness, sadness, anger, surprise, etc.
- Calculates confidence scores based on detected emotions
- Displays real-time emotion stats in the interview UI
- Stores emotion data alongside user answers for later analysis

### Dynamic Question Generation

After a user answers a question:
1. Their response is analyzed by Gemini AI
2. A relevant follow-up question is generated based on their answer
3. The follow-up questions are added to the interview flow
4. Users can navigate between original and follow-up questions

## Technologies Used

- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Next.js API routes, Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **AI & ML**: Gemini AI, DeepFace
- **Authentication**: Clerk
- **Media Processing**: WebRTC, Web Audio API
- **Styling**: TailwindCSS, Radix UI

## Project Structure

- `/app` - Next.js application
- `/components` - Reusable UI components
- `/server` - Emotion analysis server
- `/utils` - Utility functions and database schema
- `/public` - Static assets

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Troubleshooting

### Emotion Server Issues

- **Python Dependencies**: Make sure Python is installed and that you've installed DeepFace with `pip install deepface`. The server calls Python to analyze emotions rather than using DeepFace directly from Node.js.

- **No Camera Access**: If the application cannot access your webcam, check your browser permissions and ensure you've granted camera access when prompted.

- **Emotion Server Connection Failures**: If the EmotionTracker falls back to simulation mode, ensure the emotion server is running properly with `npm run start:emotion-server`. Check the server console for error messages.

- **Python Not Found**: If you get a "Python not found" error, make sure Python is in your system PATH or update the server/index.js file to use the full path to your Python executable.

### Performance Issues

- **High CPU Usage**: The emotion analysis server can be CPU-intensive. Consider lowering the frame capture rate in `EmotionTracker.jsx` by increasing the interval value.

- **Slow Response Time**: If the application feels sluggish, try running the emotion server and Next.js app on separate terminals to distribute the load.

## License

This project is licensed under the MIT License.

