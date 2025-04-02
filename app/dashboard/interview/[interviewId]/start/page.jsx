"use client";
import { db } from "@/utils/db";
import { MockInterview, UserAnswer } from "@/utils/schema";
import { eq } from "drizzle-orm";
import React, { useState, useEffect } from "react";
import QuestionSection from "./_components/QuestionSection";
import RecordAnswerSection from "./_components/RecordAnswerSection";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { GoogleGenerativeAI } from "@google/generative-ai";

const StartInterview = ({ params }) => {
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [mockInterviewQuestion, setMockInterviewQuestion] = useState(null);
  const [userAnswers, setUserAnswers] = useState([]);
  const [interviewData, setInterviewData] = useState(null);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [allQuestions, setAllQuestions] = useState([]);
  
  useEffect(() => {
    GetInterviewDetails();
  }, []);

  useEffect(() => {
    // Fetch user answers and generate new questions when original questions are loaded
    if (mockInterviewQuestion && mockInterviewQuestion.length > 0) {
      fetchUserAnswersAndGenerateQuestions();
    }
  }, [mockInterviewQuestion]);

  useEffect(() => {
    const combineQuestions = () => {
      // Check if mockInterviewQuestion is available and is an array
      if (!mockInterviewQuestion || !Array.isArray(mockInterviewQuestion)) {
        setAllQuestions(generatedQuestions.length > 0 ? [...generatedQuestions] : []);
        return;
      }
      
      const combinedQuestions = [...mockInterviewQuestion];
      
      // Add generated questions if there are any
      if (generatedQuestions.length > 0) {
        // Append generated questions to the end of the original questions
        generatedQuestions.forEach(q => {
          combinedQuestions.push(q);
        });
      }
      
      setAllQuestions(combinedQuestions);
    };
    
    combineQuestions();
  }, [mockInterviewQuestion, generatedQuestions]);

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
        generateQuestionsFromAnswers(userAnswers[0].answer);
      }
    } catch (error) {
      console.error("Error fetching user answers:", error);
    }
  };

  const generateQuestionsFromAnswers = async (answer) => {
    try {
      setIsGeneratingQuestion(true);
      
      // Initialize Gemini AI
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `Based on this interview answer: "${answer}", generate 1 relevant follow-up questions that would help assess the candidate's knowledge and experience. 

For each question, also provide a model answer that would be considered a good response. 

IMPORTANT: Format your response as a valid JSON array with objects containing 'question' and 'answer' fields. DO NOT include any markdown formatting (no \`\`\` or \`\`\`json). Just return the raw JSON.

Example format: [{"question": "What specific challenges did you face when implementing X?", "answer": "The main challenges were..."}, {"question": "How would you improve Y in your previous project?", "answer": "I would improve Y by..."}]`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      // Clean the response text by removing markdown formatting
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      console.log("Cleaned JSON response:", text);
      
      try {
        const questions = JSON.parse(text);
        
        if (Array.isArray(questions) && questions.length > 0) {
          const formattedQuestions = questions.map(q => ({
            Question: q.question || "",
            Answer: q.answer || "",
            isGenerated: true
          }));
          
          setGeneratedQuestions(prev => [...prev, ...formattedQuestions]);
          toast.success(`Generated ${formattedQuestions.length} follow-up questions`);
        } else {
          throw new Error('Invalid question format returned');
        }
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError, text);
        
        // Fallback to regex extraction if JSON parsing fails
        try {
          // Try to extract questions and answers using regex as a fallback
          const questionMatches = text.match(/"question"\s*:\s*"([^"]*)"/g);
          const answerMatches = text.match(/"answer"\s*:\s*"([^"]*)"/g);
          
          if (questionMatches && answerMatches && questionMatches.length === answerMatches.length) {
            const formattedQuestions = questionMatches.map((q, index) => {
              const question = q.match(/"question"\s*:\s*"([^"]*)"/)[1];
              const answer = answerMatches[index].match(/"answer"\s*:\s*"([^"]*)"/)[1];
              
              return {
                Question: question,
                Answer: answer,
                isGenerated: true
              };
            });
            
            setGeneratedQuestions(prev => [...prev, ...formattedQuestions]);
            toast.success(`Generated ${formattedQuestions.length} follow-up questions`);
          } else {
            throw new Error('Failed to extract questions and answers');
          }
        } catch (regexError) {
          console.error('Fallback extraction failed:', regexError);
          toast.error('Failed to generate follow-up questions');
        }
      }
      
      setIsGeneratingQuestion(false);
    } catch (error) {
      console.error('Error generating follow-up questions:', error);
      setIsGeneratingQuestion(false);
      toast.error('Failed to generate follow-up questions');
    }
  };

  // Function to handle user answer submission and generate follow-up questions
  const onAnswerSubmitted = async (answer) => {
    if (answer && answer.length > 10) {
      // Generate follow-up questions based on the answer
      await generateQuestionsFromAnswers(answer);
    }
  };

  const prevQuestion = () => {
    if (activeQuestionIndex > 0) {
      setActiveQuestionIndex(activeQuestionIndex - 1);
    }
  };

  const nextQuestion = () => {
    if (activeQuestionIndex < allQuestions.length - 1) {
      setActiveQuestionIndex(activeQuestionIndex + 1);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-5">
        <div className="md:w-1/2">
          {allQuestions && allQuestions.length > 0 && (
            <QuestionSection
              mockInterviewQuestion={allQuestions}
              activeQuestionIndex={activeQuestionIndex}
              isGeneratingQuestion={isGeneratingQuestion}
            />
          )}
        </div>
        <div className="md:w-1/2">
          {allQuestions && allQuestions.length > 0 && (
            <RecordAnswerSection
              mockInterviewQuestion={allQuestions}
              activeQuestionIndex={activeQuestionIndex}
              interviewData={interviewData}
              onAnswerSubmitted={onAnswerSubmitted}
            />
          )}
        </div>
      </div>
      <div className="flex justify-center mt-6">
        <Button
          onClick={prevQuestion}
          disabled={activeQuestionIndex === 0 || !allQuestions || allQuestions.length === 0}
          className="mr-3"
        >
          Previous
        </Button>
        <Button
          onClick={nextQuestion}
          disabled={!allQuestions || activeQuestionIndex >= allQuestions.length - 1}
          className="ml-3"
        >
          Next
        </Button>
        {allQuestions && activeQuestionIndex === allQuestions.length - 1 && (
          <Link
            href={`/dashboard/interview/${params.interviewId}/feedback`}
            className="px-4 py-1 rounded-md bg-blue-500 text-white flex items-center"
          >
            <Button>Submit</Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default StartInterview;
