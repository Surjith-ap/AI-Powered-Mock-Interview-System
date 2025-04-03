"use client";
import React, { useState, useEffect } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { chatSession } from "@/utils/GeminiAIModal";
import { LoaderCircle, FileText } from "lucide-react";
import { db } from "@/utils/db";
import { MockInterview, Resume } from "@/utils/schema";
import { v4 as uuidv4 } from "uuid";
import { useUser } from "@clerk/nextjs";
import moment from "moment";
import { useRouter } from "next/navigation";
import ResumeUpload from "./ResumeUpload";
import { analyzeResumeText } from "@/utils/resumeParser";
import { eq } from "drizzle-orm";
import { toast } from "sonner";

const AddNewInterview = ({ initialResumeData }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [jobPosition, setJobPosition] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [jobExperience, setJobExperience] = useState("");
  const [loading, setLoading] = useState(false);
  const [jsonResponse, setJsonResponse] = useState([]);
  const [resumeData, setResumeData] = useState(null);
  const { user } = useUser();
  const router = useRouter();

  // Handle initial resume data if provided
  useEffect(() => {
    if (initialResumeData) {
      setResumeData(initialResumeData);
      processResumeText(initialResumeData.extractedText);
    }
  }, [initialResumeData]);

  const processResumeText = (text) => {
    try {
      if (!text || typeof text !== 'string') {
        console.error('Invalid text format for resume analysis:', text);
        return;
      }
      
      const info = analyzeResumeText(text);
      setJobPosition(info.jobPosition);
      setJobDesc(info.jobDesc);
      setJobExperience(info.jobExperience);
    } catch (error) {
      console.error('Error processing resume text:', error);
      toast.error('Error analyzing resume. Using default values.');
      // Set default values
      setJobPosition('Not specified');
      setJobDesc('Not specified');
      setJobExperience('0');
    }
  };

  const handleResumeProcessed = (data) => {
    setResumeData(data);
    
    // Check if data is a string (direct text) or an object with job information
    if (typeof data === 'string') {
      // For backward compatibility, still try to extract info from text
      processResumeText(data);
    } else if (data && data.extractedText) {
      // If we have job position directly from the upload component, use it
      if (data.jobPosition) {
        setJobPosition(data.jobPosition);
      }
      
      // For other fields, we'll use default values or leave them blank
      setJobDesc('');
      setJobExperience('0');
    } else {
      console.log('Invalid resume data format:', data);
    }
  };

  const onSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    
    try {
      // If job position is empty, use a default value
      const finalJobPosition = jobPosition.trim() || "Not specified";
      
      // If job description is empty, use a default value
      const finalJobDesc = jobDesc.trim() || "Not specified";
      
      // If job experience is empty, use a default value
      const finalJobExperience = jobExperience.trim() || "0";
      
      console.log(finalJobPosition, finalJobDesc, finalJobExperience);

      // If we have a resume, use the extracted text for the prompt
      let resumeText = "";
      if (resumeData) {
        if (resumeData.extractedText) {
          resumeText = resumeData.extractedText;
        } else if (resumeData.resumeId) {
          // Fetch the resume text if not already available
          const result = await db
            .select()
            .from(Resume)
            .where(eq(Resume.resumeId, resumeData.resumeId));
          
          if (result.length > 0) {
            resumeText = result[0].extractedText;
          }
        }
      }

      if (!resumeText) {
        toast.error("Please upload a resume first");
        setLoading(false);
        return;
      }

      // Construct the prompt with resume text
      const InputPrompt = `
Resume Text:
${resumeText}

Based on the resume text, please provide "${process.env.NEXT_PUBLIC_QUESTION_COUNT}" interview questions these questions should cover the skills and technologies listed in the resume 
, asking for specific examples and experiences. Additionally,include general interview questions such as salary expectations, strengths and weaknesses, career goals, and how the candidate handles challenges and teamwork with answers in JSON format, ensuring "Question" and "Answer" are fields in the JSON.
`;

      const result = await chatSession.sendMessage(InputPrompt);
      const MockJsonResp = result.response
        .text()
        .replace("```json", "")
        .replace("```", "")
        .trim();
      
      console.log(JSON.parse(MockJsonResp));
      setJsonResponse(MockJsonResp);

      if (MockJsonResp) {
        const mockId = uuidv4();
        
        const resp = await db
          .insert(MockInterview)
          .values({
            mockId,
            jsonMockResp: MockJsonResp,
            jobPosition: finalJobPosition,
            jobDesc: finalJobDesc,
            jobExperience: finalJobExperience,
            createdBy: user?.primaryEmailAddress?.emailAddress,
            createdAt: moment().format("YYYY-MM-DD"),
            resumeId: resumeData?.resumeId || null,
          })
          .returning({ mockId: MockInterview.mockId });
          
        console.log("Inserted ID:", resp);

        if (resp) {
          setOpenDialog(false);
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
      setLoading(false);
    }
  };

  // If initialResumeData is provided, render a button that starts the interview directly
  if (initialResumeData) {
    return (
      <Button 
        onClick={onSubmit}
        disabled={loading}
        className="flex-1"
      >
        {loading ? (
          <>
            <LoaderCircle className="animate-spin mr-2" />
            Generating Questions
          </>
        ) : (
          "Start Interview with Resume"
        )}
      </Button>
    );
  }

  return (
    <div>
      <div
        className="p-10 rounded-lg border bg-secondary hover:scale-105 hover:shadow-sm transition-all cursor-pointer"
        onClick={() => setOpenDialog(true)}
      >
        <h2 className="text-lg text-center">+ Add New</h2>
      </div>
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Upload Your Resume for Interview Questions
            </DialogTitle>
            <DialogDescription>
              <div className="mt-4">
                <div className="my-3">
                  <h2 className="mb-4">Upload your resume to automatically generate interview questions</h2>
                  <ResumeUpload onResumeProcessed={handleResumeProcessed} />
                  
                  {resumeData && (
                    <div className="mt-6">
                      <Button 
                        type="button" 
                        onClick={onSubmit}
                        disabled={loading}
                        className="w-full"
                      >
                        {loading ? (
                          <>
                            <LoaderCircle className="animate-spin mr-2" />
                            Generating From AI
                          </>
                        ) : (
                          "Start Interview"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddNewInterview;
