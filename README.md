# AI Mock Interview Platform

A comprehensive AI-powered mock interview platform with dynamic question generation, facial expression analysis, and audio recording capabilities.

## Features

- **AI-Powered Interviews**: Generates interview questions based on job positions and descriptions
- **Dynamic Question Generation**: Creates follow-up questions based on previous answers
- **Facial Expression Analysis**: Real-time emotion tracking during interviews
- **Audio Recording & Transcription**: Records and transcribes interview answers
- **Performance Feedback**: Provides ratings and improvement suggestions for answers
- **User Authentication**: Secure user login and profile management with Clerk
- **Resume Parsing**: Extracts and analyzes text from PDF and TXT resumes
- **Docker Support**: Containerized deployment for easy setup and scaling

## Setup and Installation

### Prerequisites

- Node.js (v18 or higher)
- npm (v8 or higher)
- Python 3.8+ (required for DeepFace)
- PostgreSQL (or Neon DB for cloud deployment)
- Docker and Docker Compose (optional, for containerized deployment)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ai-mock-interview
   ```

2. Install main application dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file with the following (DO NOT commit this file to version control):
   ```
   # Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key

   # Database
   NEXT_PUBLIC_DRIZZLE_DB_URL=your_database_url

   # AI Services
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

   # Application Configuration
   NEXT_PUBLIC_QUESTION_COUNT=2
   NEXT_PUBLIC_API_URL=http://localhost:3001
   NEXT_PUBLIC_EMOTION_SERVER_URL=http://localhost:3001
   ```

   ⚠️ **Security Note**: 
   - Never commit `.env.local` or any file containing secrets to version control
   - Use strong, unique passwords for all services
   - Rotate API keys and credentials regularly
   - Keep all dependencies updated to their latest secure versions

4. Install server dependencies:
   ```bash
   npm run setup:emotion-server
   ```

5. Install Python dependencies for emotion analysis:
   ```bash
   pip install deepface opencv-python numpy
   ```

### Docker Setup (Optional)

1. Build and start the containers:
   ```bash
   docker compose up -d
   ```

2. The application will be available at `http://localhost:3000`

For more detailed Docker setup instructions, see [README.Docker.md](README.Docker.md).

## Running the Application

### Development Mode

1. Start both the Next.js app and the server together:
   ```bash
   npm run start:all
   ```

2. Or start them separately:
   - Start the Next.js app:
     ```bash
     npm run dev
     ```
   - Start the analysis server:
     ```bash
     npm run start:emotion-server
     ```

### Production Mode

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm run start
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

- **Frontend**: Next.js 14, React 18, TailwindCSS
- **Backend**: Next.js API routes, Express.js
- **Database**: PostgreSQL with Drizzle ORM, Neon DB
- **AI & ML**: Gemini AI, DeepFace, face-api.js
- **Authentication**: Clerk
- **Media Processing**: WebRTC, Web Audio API
- **Styling**: TailwindCSS, Radix UI, Material Tailwind
- **Document Processing**: pdf-parse, mammoth, docx
- **State Management**: React Hook Form, Zod
- **UI Components**: Radix UI, Material Tailwind, Lucide Icons
- **Charts & Visualization**: Chart.js, React Flow
- **Deployment**: Docker, Docker Compose

## Project Structure

- `/app` - Next.js application routes and pages
- `/components` - Reusable UI components
- `/server` - Emotion analysis server
- `/utils` - Utility functions and database schema
- `/public` - Static assets
- `/drizzle` - Database migrations and schema
- `/migrations` - Database migration files
- `/lib` - Shared libraries and configurations
- `/sampleresumes` - Sample resumes for testing

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Troubleshooting

### Emotion Server Issues

- **Python Dependencies**: Make sure Python is installed and that you've installed DeepFace with `pip install deepface`. The server calls Python to analyze emotions rather than using DeepFace directly from Node.js.

- **No Camera Access**: If the application cannot access your webcam, check your browser permissions and ensure you've granted camera access when prompted.

- **Emotion Server Connection Failures**: If the EmotionTracker falls back to simulation mode, ensure the emotion server is running properly with `npm run start:emotion-server`. Check the server console for error messages.

- **Python Not Found**: If you get a "Python not found" error, make sure Python is in your system PATH or update the server/index.js file to use the full path to your Python executable.

### Database Issues

- **Migration Errors**: If you encounter database migration issues, try running `npm run db:push` to update the database schema.

- **Connection Issues**: Ensure your `NEXT_PUBLIC_DRIZZLE_DB_URL` in `.env.local` is correct and the database is accessible.

### Performance Issues

- **High CPU Usage**: The emotion analysis server can be CPU-intensive. Consider lowering the frame capture rate in `EmotionTracker.jsx` by increasing the interval value.

- **Slow Response Time**: If the application feels sluggish, try running the emotion server and Next.js app on separate terminals to distribute the load.

### Docker Issues

- **Container Not Starting**: Check Docker logs with `docker compose logs` for specific error messages.

- **Port Conflicts**: Ensure ports 3000 and 3001 are not in use by other applications.

- **Volume Mounting**: If you're having issues with file permissions in Docker, check the volume mounts in `compose.yaml`.

## License

This project is licensed under the MIT License.

## Security Considerations

### Environment Variables
- Keep all sensitive credentials in `.env.local` file
- Add `.env.local` to `.gitignore` to prevent accidental commits
- Use different credentials for development and production environments
- Regularly rotate API keys and database credentials

### Database Security
- Use SSL/TLS for database connections
- Implement proper access controls and permissions
- Regularly backup database
- Monitor for suspicious activities
- Use connection pooling and implement rate limiting

### API Security
- Implement proper CORS policies
- Use HTTPS in production
- Implement rate limiting
- Validate and sanitize all user inputs
- Use proper authentication and authorization

### File Upload Security
- Validate file types and sizes
- Scan uploaded files for malware
- Store files in secure locations
- Implement proper access controls
- Use secure file naming conventions

### Best Practices
1. **Regular Updates**: Keep all dependencies updated to their latest secure versions
2. **Code Review**: Implement thorough code review process
3. **Security Testing**: Regular security audits and penetration testing
4. **Monitoring**: Implement proper logging and monitoring
5. **Backup**: Regular backups of both code and data
6. **Documentation**: Keep security documentation up to date
7. **Training**: Regular security training for team members


