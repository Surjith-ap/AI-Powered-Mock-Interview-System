"use client";
import React, { useEffect, useState } from 'react';
import { db } from '@/utils/db';
import { Resume } from '@/utils/schema';
import { useUser } from '@clerk/nextjs';
import { eq } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { FileText, Trash2, Plus, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import ResumeUpload from '../_components/ResumeUpload';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { Question } from '@/utils/schema';

const ResumesPage = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchResumes();
    }
  }, [user]);

  const fetchResumes = async () => {
    try {
      setLoading(true);
      const result = await db
        .select()
        .from(Resume)
        .where(eq(Resume.userEmail, user.primaryEmailAddress?.emailAddress))
        .orderBy(Resume.createdAt);

      setResumes(result);
    } catch (error) {
      console.error('Error fetching resumes:', error);
      toast.error('Failed to load resumes');
    } finally {
      setLoading(false);
    }
  };

  const deleteResume = async (resumeId) => {
    try {
      await db
        .delete(Resume)
        .where(eq(Resume.resumeId, resumeId));
      
      toast.success('Resume deleted successfully');
      fetchResumes();
    } catch (error) {
      console.error('Error deleting resume:', error);
      toast.error('Failed to delete resume');
    }
  };

  const handleResumeProcessed = (data) => {
    toast.success('Resume uploaded successfully');
    setShowUpload(false);
    fetchResumes();
  };

  const createInterviewFromResume = (resume) => {
    router.push(`/dashboard?resumeId=${resume.resumeId}`);
  };

  const generateQuestionsFromResume = async (resume) => {
    try {
      // Initialize Gemini AI
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // Generate a prompt based on resume content
      const prompt = `
        Based on the following resume text, generate ${process.env.NEXT_PUBLIC_QUESTION_COUNT} technical interview questions 
        that would be relevant for this candidate. The questions should test both 
        technical knowledge and experience mentioned in the resume.
        
        Resume Text:
        ${resumeText}
        
        For each question, also provide a model answer that would be expected from a strong candidate.
        Format your response as a JSON array with "Question" and "Answer" fields.
        Example: [{"Question": "...", "Answer": "..."}]
      `;
      
      // Get response from AI
      const result = await model.generateContent(prompt);
      const questionsText = result.response.text().trim();
      
      // Parse the response into JSON
      let questionsJson;
      try {
        questionsJson = JSON.parse(questionsText.replace(/```json|```/g, '').trim());
      } catch (error) {
        console.error("Failed to parse AI response:", error);
        toast.error("Failed to parse AI-generated questions");
        return;
      }
      
      // Generate a mock interview ID
      const mockId = uuidv4();
      
      // Save questions to the database
      await db.insert(Question).values({
        mockId: mockId,
        MockQuestionJsonResp: JSON.stringify(questionsJson),
        jobPosition: "Based on Resume",
        jobDesc: `Generated from resume: ${resume.fileName}`,
        createdBy: user?.primaryEmailAddress?.emailAddress,
        createdAt: moment().format("YYYY-MM-DD"),
        resumeId: resume.resumeId
      });
      
      toast.success("Questions generated successfully!");
      
      // Navigate to the generated questions
      router.push(`/dashboard/pyq/${mockId}`);
    } catch (error) {
      console.error("Error generating questions:", error);
      toast.error("Failed to generate questions from resume");
    }
  };

  return (
    <div className="p-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-bold text-2xl">Your Resumes</h2>
          <p className="text-gray-500">Manage your uploaded resumes and create interviews from them</p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)}>
          {showUpload ? 'Cancel' : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Upload Resume
            </>
          )}
        </Button>
      </div>

      {showUpload && (
        <div className="mb-8 p-6 border rounded-lg bg-card">
          <h3 className="text-lg font-medium mb-4">Upload New Resume</h3>
          <ResumeUpload onResumeProcessed={handleResumeProcessed} />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <p>Loading resumes...</p>
        </div>
      ) : resumes.length === 0 ? (
        <div className="text-center py-10 border rounded-lg bg-muted">
          <FileText className="h-10 w-10 mx-auto text-gray-400 mb-2" />
          <h3 className="text-lg font-medium">No resumes found</h3>
          <p className="text-gray-500 mb-4">Upload a resume to get started</p>
          <Button onClick={() => setShowUpload(true)}>Upload Resume</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumes.map((resume) => (
            <div key={resume.resumeId} className="border rounded-lg p-4 bg-card">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-primary mr-2" />
                  <div>
                    <h3 className="font-medium">{resume.fileName}</h3>
                    <p className="text-sm text-gray-500">{resume.createdAt}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => deleteResume(resume.resumeId)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              
              <div className="mt-4">
                <Button 
                  className="w-full"
                  onClick={() => createInterviewFromResume(resume)}
                >
                  Create Interview
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResumesPage; 