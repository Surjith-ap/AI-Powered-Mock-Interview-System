"use client";
import React, { useEffect, useState } from 'react';
import { db } from '@/utils/db';
import { Resume, MockInterview } from '@/utils/schema';
import { useUser } from '@clerk/nextjs';
import { eq } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { FileText, Trash2, Plus, ArrowRight, RefreshCw, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import ResumeUpload from '../_components/ResumeUpload';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { Question } from '@/utils/schema';
import { chatSession } from "@/utils/GeminiAIModal";

const ResumesPage = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingResumeId, setProcessingResumeId] = useState(null);
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      console.log("User loaded, fetching resumes");
      fetchResumes();
    }
  }, [user]);

  const fetchResumes = async () => {
    if (!user) {
      console.log("Cannot fetch resumes: User not loaded yet");
      return;
    }

    try {
      setLoading(true);
      
      const userEmail = user.primaryEmailAddress?.emailAddress;
      console.log("Fetching resumes for:", userEmail);
      
      const result = await db
        .select()
        .from(Resume)
        .where(eq(Resume.userEmail, userEmail))
        .orderBy(Resume.createdAt);

      console.log("Resumes fetched:", result.length);
      console.log("Resume data sample:", result.slice(0, 2));
      
      setResumes(result);
    } catch (error) {
      console.error('Error fetching resumes:', error);
      toast.error('Failed to load resumes');
    } finally {
      setLoading(false);
    }
  };

  const refreshResumes = () => {
    setIsRefreshing(true);
    fetchResumes().finally(() => {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    });
  };

  const deleteResume = async (resumeId) => {
    try {
      console.log("Deleting resume:", resumeId);
      
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

  const handleResumeProcessed = (resumeData) => {
    console.log("Resume processed callback received:", resumeData);
    
    // The resumeData object should contain at least the resumeId property
    if (!resumeData || !resumeData.resumeId) {
      console.error("Invalid resume data received:", resumeData);
      toast.error('Resume upload failed: Missing data');
      return;
    }
    
    toast.success('Resume uploaded successfully');
    setShowUpload(false);
    
    // Adding a delay before fetching to ensure DB has updated
    setTimeout(() => {
      fetchResumes();
    }, 1000);
  };

  const createInterviewFromResume = async (resume) => {
    // Set which resume is being processed
    setProcessingResumeId(resume.resumeId);
    
    try {
      // Get the resume text content
      const resumeText = resume.content || resume.extractedText;
      
      if (!resumeText) {
        toast.error("Resume text content is missing. Please re-upload the resume.");
        setProcessingResumeId(null);
        return;
      }

      // Set default values for job details (similar to AddNewInterview)
      const jobPosition = resume.jobPosition || "Not specified";
      const jobDesc = resume.jobDesc || "Not specified";
      const jobExperience = resume.jobExperience || "0";
      
      // Construct the prompt with resume text
      const InputPrompt = `
Resume Text:
${resume.extractedText}

Based on the resume text, please provide "${process.env.NEXT_PUBLIC_QUESTION_COUNT}" interview questions with answers in JSON format, ensuring "Question" and "Answer" are fields in the JSON.
`;

      // Send message to chatSession (using the same method as AddNewInterview)
      const result = await chatSession.sendMessage(InputPrompt);
      const MockJsonResp = result.response
        .text()
        .replace("```json", "")
        .replace("```", "")
        .trim();
      
      console.log(JSON.parse(MockJsonResp));

      if (MockJsonResp) {
        const mockId = uuidv4();
        
        // Insert into MockInterview table
        const resp = await db
          .insert(MockInterview)
          .values({
            mockId,
            jsonMockResp: MockJsonResp,
            jobPosition: jobPosition,
            jobDesc: jobDesc,
            jobExperience: jobExperience,
            createdBy: user?.primaryEmailAddress?.emailAddress,
            createdAt: moment().format("YYYY-MM-DD"),
            resumeId: resume.resumeId,
          })
          .returning({ mockId: MockInterview.mockId });
          
        console.log("Inserted ID:", resp);

        if (resp) {
          // Navigate to the interview page with the mockId
          router.push("/dashboard/interview/" + resp[0]?.mockId);
        }
      } else {
        console.log("ERROR");
        throw new Error("Failed to generate interview questions");
      }
    } catch (error) {
      console.error("Error creating interview:", error);
      toast.error("Failed to generate interview questions");
    } finally {
      setProcessingResumeId(null);
    }
  };

  // const generateQuestionsFromResume = async (resume) => {
  //   // Set which resume is being processed
  //   setProcessingResumeId(resume.resumeId);
    
  //   try {
  //     // Use content OR extractedText depending on which one exists
  //     const resumeContent = resume.content || resume.extractedText;
      
  //     // Ensure we have resume content to work with
  //     if (!resumeContent) {
  //       toast.error("Resume content is missing. Please re-upload the resume.");
  //       setProcessingResumeId(null);
  //       return;
  //     }

  //     toast.info("Generating questions from resume...");

  //     // Initialize Gemini AI
  //     const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
  //     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
  //     // Generate a prompt based on resume content
  //     const prompt = `
  //       Based on the following resume text, generate ${process.env.NEXT_PUBLIC_QUESTION_COUNT || 5} technical interview questions 
  //       that would be relevant for this candidate. The questions should test both 
  //       technical knowledge and experience mentioned in the resume.
        
  //       Resume Text:
  //       ${resumeContent}
        
  //       For each question, also provide a model answer that would be expected from a strong candidate.
  //       Format your response as a JSON array with "Question" and "Answer" fields.
  //       Example: [{"Question": "...", "Answer": "..."}]
  //     `;
      
  //     // Get response from AI
  //     const result = await model.generateContent(prompt);
  //     const questionsText = result.response.text().trim();
      
  //     // Parse the response into JSON
  //     let questionsJson;
  //     try {
  //       questionsJson = JSON.parse(questionsText.replace(/```json|```/g, '').trim());
  //     } catch (error) {
  //       console.error("Failed to parse AI response:", error);
  //       toast.error("Failed to parse AI-generated questions");
  //       setProcessingResumeId(null);
  //       return;
  //     }
      
  //     // Generate a mock interview ID
  //     const mockId = uuidv4();
      
  //     // Save questions to the database
  //     await db.insert(Question).values({
  //       mockId: mockId,
  //       MockQuestionJsonResp: JSON.stringify(questionsJson),
  //       jobPosition: "Based on Resume",
  //       jobDesc: `Generated from resume: ${resume.fileName}`,
  //       createdBy: user?.primaryEmailAddress?.emailAddress,
  //       createdAt: moment().format("YYYY-MM-DD"),
  //       resumeId: resume.resumeId
  //     });
      
  //     toast.success("Questions generated successfully!");
      
  //     // Navigate to the generated questions
  //     router.push(`/dashboard/pyq/${mockId}`);
  //   } catch (error) {
  //     console.error("Error generating questions:", error);
  //     toast.error("Failed to generate questions from resume");
  //   } finally {
  //     setProcessingResumeId(null);
  //   }
  // };

  return (
    <div className="p-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-bold text-2xl">Your Resumes</h2>
          <p className="text-gray-500">Manage your uploaded resumes and create interviews from them</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={refreshResumes} 
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowUpload(!showUpload)}>
            {showUpload ? 'Cancel' : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Upload Resume
              </>
            )}
          </Button>
        </div>
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
                  disabled={processingResumeId === resume.resumeId}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              
              <div className="mt-4 grid grid-cols-1 gap-2">
                <Button 
                  className="w-full"
                  onClick={() => createInterviewFromResume(resume)}
                  disabled={processingResumeId !== null}
                >
                  {processingResumeId === resume.resumeId ? (
                    <>
                      <LoaderCircle className="animate-spin mr-2" />
                      Generating Questions
                    </>
                  ) : (
                    <>
                      Create Interview
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
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