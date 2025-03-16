import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { db } from '@/utils/db';
import { Resume } from '@/utils/schema';
import { v4 as uuidv4 } from 'uuid';
import { useUser } from '@clerk/nextjs';
import moment from 'moment';
import { toast } from 'sonner';
import { FileText, Upload, Loader2, AlertCircle, Server } from 'lucide-react';
import { FiUpload } from 'react-icons/fi';
import { Input } from '@/components/ui/input';

// API URL from environment variable or default to localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const ResumeUpload = ({ onResumeProcessed }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [error, setError] = useState(null);
  const { user } = useUser();
  const [fileName, setFileName] = useState('');
  const [isProcessed, setIsProcessed] = useState(false);
  const [jobPosition, setJobPosition] = useState('');

  const processResumeWithServer = async (file) => {
    if (!file) return;
    
    setIsUploading(true);
    setError(null);
    setUploadedFile(file);
    
    try {
      // Validate file size (10MB)
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        throw new Error('File size exceeds 10MB limit');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/parse-resume`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `Server error: ${response.status} ${response.statusText}`
        }));
        throw new Error(errorData.error || 'Failed to process resume');
      }

      const data = await response.json();
      
      if (!data.success || !data.text) {
        throw new Error(data.error || 'Failed to extract text from resume');
      }

      setFileName(file.name);
      setExtractedText(data.text);
      setIsProcessed(true);
      
      // Call the callback with the extracted text (as a string)
      if (onResumeProcessed) {
        onResumeProcessed(data.text);
      }
      
      toast.success('Resume processed successfully');
      
    } catch (error) {
      console.error('Resume processing error:', error);
      setError(error.message);
      setIsProcessed(false);
      setUploadedFile(null);
      toast.error(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      await processResumeWithServer(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt']
    },
    maxFiles: 1,
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const saveResumeAndProceed = async () => {
    if (!extractedText || !uploadedFile || !user) {
      toast.error('Missing required information');
      return;
    }
    
    try {
      setIsUploading(true);
      
      // Generate a unique ID for the resume
      const resumeId = uuidv4();
      
      // Save the resume to the database
      await db.insert(Resume).values({
        resumeId,
        fileName: uploadedFile.name,
        fileType: uploadedFile.type,
        extractedText,
        userEmail: user.primaryEmailAddress?.emailAddress,
        createdAt: moment().format('YYYY-MM-DD')
      });
      
      toast.success('Resume saved successfully');
      
      // Call the callback with the resume data and job position
      // If job position is empty, use "Not specified"
      if (onResumeProcessed) {
        onResumeProcessed({
          resumeId,
          extractedText,
          jobPosition: jobPosition.trim() || "Not specified"
        });
      }
      
    } catch (error) {
      console.error('Error saving resume:', error);
      setError(error.message || 'Failed to save resume');
      toast.error('Failed to save resume');
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} disabled={isUploading} />
        <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive
            ? 'Drop the file here'
            : 'Drag and drop a resume file, or click to select'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Supported formats: PDF, TXT (max 10MB)
        </p>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {fileName && !error && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">
            {isProcessed ? '✓ ' : ''}
            {fileName} {isProcessed ? ' - Processed successfully' : ''}
          </p>
        </div>
      )}

      {isUploading && (
        <div className="mt-4 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">Processing resume...</p>
        </div>
      )}

      {uploadedFile && !isUploading && !error && (
        <div className="mt-4 p-4 border rounded-lg">
          <div className="flex items-center mb-4">
            <FileText className="h-5 w-5 text-primary mr-2" />
            <p className="text-sm font-medium">{uploadedFile.name}</p>
            <div className="ml-2 flex items-center text-xs text-gray-500">
              <Server className="h-3 w-3 mr-1" />
              <span>Processed server-side</span>
            </div>
          </div>
          
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Job Position</label>
              <Input 
                placeholder="Enter job position (optional)"
                value={jobPosition}
                onChange={(e) => setJobPosition(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Optional: Enter the position you're applying for</p>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={saveResumeAndProceed}
              disabled={isUploading || !extractedText}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Use This Resume"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;
