"use client";
import { db } from "@/utils/db";
import { UserAnswer } from "@/utils/schema";
import { eq } from "drizzle-orm";
import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import EmotionFeedback from "./_components/EmotionFeedback";

const Feedback = ({ params }) => {
  const router = useRouter();
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    GetFeedback();
  }, []);

  const GetFeedback = async () => {
    try {
      setLoading(true);
      const result = await db
        .select()
        .from(UserAnswer)
        .where(eq(UserAnswer.mockIdRef, params.interviewId))
        .orderBy(UserAnswer.id);

      console.log(result);
      setFeedbackList(result);
    } catch (error) {
      console.error("Error fetching feedback:", error);
    } finally {
      setLoading(false);
    }
  };

  const overallRating = useMemo(() => {
    if (feedbackList && feedbackList.length > 0) {
      const totalRating = feedbackList.reduce(
        (sum, item) => sum + Number(item.rating),
        0
      );
      // console.log("total",totalRating);
      // console.log("length",feedbackList.length);
      return (totalRating / feedbackList.length).toFixed(1);
    }
    return 0;
  }, [feedbackList]);
  
  // Calculate overall confidence score
  const overallConfidenceScore = useMemo(() => {
    if (feedbackList && feedbackList.length > 0) {
      const validScores = feedbackList.filter(item => item.confidenceScore);
      if (validScores.length === 0) return null;
      
      const totalScore = validScores.reduce(
        (sum, item) => sum + Number(item.confidenceScore),
        0
      );
      return (totalScore / validScores.length).toFixed(1);
    }
    return null;
  }, [feedbackList]);
  
  // Combine all emotion data for overall analysis
  const combinedEmotionData = useMemo(() => {
    if (feedbackList && feedbackList.length > 0) {
      const allEmotionData = [];
      feedbackList.forEach(item => {
        if (item.emotionData) {
          try {
            const parsedData = JSON.parse(item.emotionData);
            allEmotionData.push(...parsedData);
          } catch (error) {
            console.error("Error parsing emotion data:", error);
          }
        }
      });
      return allEmotionData.length > 0 ? allEmotionData : null;
    }
    return null;
  }, [feedbackList]);

  if (loading) {
    return <div className="p-10 text-center">Loading feedback...</div>;
  }

  return (
    <div className="p-10">
      {feedbackList?.length == 0 ? (
        <h2 className="font-bold text-xl text-gray-500 my-5">
          No Interview feedback Record Found
        </h2>
      ) : (
        <>
         <h2 className="text-3xl font-bold text-green-500">Congratulations</h2>
         <h2 className="font-bold text-2xl">Here is your interview feedback</h2>
          <h2 className="text-primary text-lg my-3">
            Your overall answer rating{" "}
            <strong
              className={`${
                overallRating >= 5 ? "text-green-500" : "text-red-600"
              }`}
            >
              {overallRating}
              <span className="text-black">/10</span>
            </strong>
          </h2>
          
          {/* Overall Emotion Feedback */}
          {overallConfidenceScore && (
            <EmotionFeedback 
              emotionData={combinedEmotionData} 
              confidenceScore={overallConfidenceScore} 
              showEmotionDistribution={false}
            />
          )}
          
          <h2 className="text-sm text-gray-500 mt-6">
            Find below each interview question with your answer and personalized feedback
          </h2>
          {feedbackList &&
            feedbackList.map((item, index) => (
              <Collapsible key={index} className="mt-7">
                <CollapsibleTrigger className="p-2 bg-secondary rounded-lg my-2 text-left flex justify-between gap-7 w-full">
                  {item.question} <ChevronDown className="h-5 w-5" />{" "}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      <h2 className="text-red-500 p-2 border rounded-lg">
                        <strong>Score: </strong>
                        {item.rating}/10
                      </h2>
                      {item.confidenceScore && (
                        <h2 className="text-blue-500 p-2 border rounded-lg">
                          <strong>Confidence: </strong>
                          {item.confidenceScore}/10
                        </h2>
                      )}
                    </div>
                    <h2 className="p-2 border rounded-lg bg-red-50 text-sm text-red-900">
                      <strong>Your Answer: </strong>
                      {item.userAns}
                    </h2>
                    <h2 className="p-2 border rounded-lg bg-blue-50 text-sm text-primary-900">
                      <strong>Feedback: </strong>
                      {item.feedback}
                    </h2>
                    
                    {/* Per-question emotion feedback */}
                    {item.emotionData && item.confidenceScore && (
                      <div className="mt-2">
                        <h3 className="font-medium text-gray-700 mb-1">Emotion Analysis:</h3>
                        <div className="p-2 border rounded-lg bg-gray-50">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Confidence Score: </span>
                            <div className="w-full bg-gray-200 rounded-full h-2 flex-1">
                              <div 
                                className={`h-2 rounded-full ${
                                  parseFloat(item.confidenceScore) < 5 ? 'bg-red-500' : 
                                  parseFloat(item.confidenceScore) < 7 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${parseFloat(item.confidenceScore) * 10}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{item.confidenceScore}/10</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
        </>
      )}

      <div className="mt-8">
        <Button onClick={() => router.replace("/dashboard")}>Go Home</Button>
      </div>
    </div>
  );
};

export default Feedback;
