"use client";
import { db } from "@/utils/db";
import { MockInterview, UserAnswer } from "@/utils/schema";
import { eq } from "drizzle-orm";
import React, { useState } from "react";
import { useEffect } from "react";
import QuestionSection from "./_components/QuestionSection";
import RecordAnswerSection from "./_components/RecordAnswerSection";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { GoogleGenerativeAI } from "@google/generative-ai";

const StartInterview = ({ params }) => {
  const [interviewData, setInterviewData] = useState();
  const [mockInterviewQuestion, setMockInterviewQuestion] = useState();
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  
  useEffect(() => {
    GetInterviewDetails();
  }, []);

  useEffect(() => {
    // Fetch user answers and generate new questions when original questions are loaded
    if (mockInterviewQuestion && mockInterviewQuestion.length > 0) {
      fetchUserAnswersAndGenerateQuestions();
    }
  }, [mockInterviewQuestion]);

  const GetInterviewDetails = async () => {
    const result = await db
      .select()
      .from(MockInterview)
      .where(eq(MockInterview.mockId, params.interviewId));

    const jsonMockResp = JSON.parse(result[0].jsonMockResp);
    console.log(jsonMockResp);
    setMockInterviewQuestion(jsonMockResp);
    setInterviewData(result[0]);
  };

  const fetchUserAnswersAndGenerateQuestions = async () => {
    try {
      // Fetch user answers for this interview
      const userAnswers = await db
        .select()
        .from(UserAnswer)
        .where(eq(UserAnswer.mockIdRef, params.interviewId));

      if (userAnswers && userAnswers.length > 0) {
        // Generate new questions based on user answers
        generateQuestionsFromAnswers(userAnswers);
      }
    } catch (error) {
      console.error("Error fetching user answers:", error);
    }
  };

  const generateQuestionsFromAnswers = async (userAnswers) => {
    try {
      setIsGeneratingQuestion(true);
      
      // Initialize Gemini AI
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // Process each user answer to generate a follow-up question
      const newQuestions = [];
      
      for (const answer of userAnswers) {
        if (answer.userAns && answer.userAns.length > 10) {
          const prompt = `
            Based on the following interview question and the candidate's answer, 
            generate a follow-up question that digs deeper into the candidate's response.
            The follow-up question should be challenging but relevant to the original topic.
            
            Original Question: ${answer.question}
            Candidate's Answer: ${answer.userAns}
            
            Return only the follow-up question without any additional text or formatting.
          `;
          
          const result = await model.generateContent(prompt);
          const followUpQuestion = result.response.text().trim();
          
          if (followUpQuestion) {
            newQuestions.push({
              Question: followUpQuestion,
              Answer: "This is a dynamically generated follow-up question based on your previous answer.",
              isGenerated: true,
              originalQuestionIndex: mockInterviewQuestion.findIndex(q => q.Question === answer.question)
            });
          }
        }
      }
      
      // Limit to the same number of questions as the original set
      const limitedQuestions = newQuestions.slice(0, mockInterviewQuestion.length);
      setGeneratedQuestions(limitedQuestions);
      
      if (limitedQuestions.length > 0) {
        toast.success(`Generated ${limitedQuestions.length} follow-up questions based on your answers`);
      }
      
      setIsGeneratingQuestion(false);
    } catch (error) {
      console.error("Error generating questions:", error);
      setIsGeneratingQuestion(false);
      toast.error("Failed to generate follow-up questions");
    }
  };

  // Combine original and generated questions for display
  const allQuestions = mockInterviewQuestion 
    ? [...(mockInterviewQuestion || []), ...(generatedQuestions || [])]
    : [];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 my-10">
        {/* Question Section */}
        <QuestionSection
          mockInterviewQuestion={allQuestions}
          activeQuestionIndex={activeQuestionIndex}
          isGeneratingQuestion={isGeneratingQuestion}
        />

        {/* Video/audio Recording */}
        <RecordAnswerSection
          mockInterviewQuestion={allQuestions}
          activeQuestionIndex={activeQuestionIndex}
          interviewData={interviewData}
          onAnswerSubmitted={fetchUserAnswersAndGenerateQuestions}
        />
      </div>
      <div className="flex gap-3 my-5 md:my-0 md:justify-end md:gap-6">
        {activeQuestionIndex > 0 && (
          <Button
            onClick={() => setActiveQuestionIndex(activeQuestionIndex - 1)}
          >
            Previous Question
          </Button>
        )}
        {activeQuestionIndex != allQuestions?.length - 1 && (
          <Button
            onClick={() => setActiveQuestionIndex(activeQuestionIndex + 1)}
          >
            Next Question
          </Button>
        )}
        {activeQuestionIndex == allQuestions?.length - 1 && (
          <Link
            href={"/dashboard/interview/" + interviewData?.mockId + "/feedback"}
          >
            <Button>End Interview</Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default StartInterview;
