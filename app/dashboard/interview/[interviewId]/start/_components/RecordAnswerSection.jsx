"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import React, { useContext, useEffect, useState, useRef } from "react";
import Webcam from "react-webcam";
import { Mic, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { chatSession } from "@/utils/GeminiAIModal";
import { db } from "@/utils/db";
import { UserAnswer } from "@/utils/schema";
import { useUser } from "@clerk/nextjs";
import moment from "moment";
import { WebCamContext } from "@/app/dashboard/layout";
import { GoogleGenerativeAI } from "@google/generative-ai";
import EmotionTracker from "./EmotionTracker";

const RecordAnswerSection = ({
  mockInterviewQuestion,
  activeQuestionIndex,
  interviewData,
  onAnswerSubmitted,
}) => {
  const [userAnswer, setUserAnswer] = useState("");
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const { webCamEnabled, setWebCamEnabled } = useContext(WebCamContext);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const webcamRef = useRef(null);
  
  // Emotion tracking state
  const [emotionData, setEmotionData] = useState([]);
  const [confidenceScore, setConfidenceScore] = useState("7.0"); // Default score
  const [showEmotionStats, setShowEmotionStats] = useState(false);

  const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

  useEffect(() => {
    if (!isRecording && userAnswer.length > 10) {
      updateUserAnswer();
    }
  }, [userAnswer]);
  
  // Reset emotion data when question changes
  useEffect(() => {
    setEmotionData([]);
    setConfidenceScore("7.0");
  }, [activeQuestionIndex]);

  const handleEmotionUpdate = (data) => {
    setEmotionData(prev => [...prev, data]);
    setConfidenceScore(data.confidenceMetrics.confidenceScore);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast("Error starting recording. Please check your microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob) => {
    try {
      setLoading(true);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // Convert audio blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1];
        
        const result = await model.generateContent([
          "Transcribe the following audio:",
          { inlineData: { data: base64Audio, mimeType: "audio/webm" } },
        ]);

        const transcription = result.response.text();
        setUserAnswer((prevAnswer) => prevAnswer + " " + transcription);
        setLoading(false);
      };
    } catch (error) {
      console.error("Error transcribing audio:", error);
      toast("Error transcribing audio. Please try again.");
      setLoading(false);
    }
  };

  const updateUserAnswer = async () => {
    try {
      setLoading(true);
      
      // Check if the current question is a generated one
      const isGeneratedQuestion = mockInterviewQuestion[activeQuestionIndex]?.isGenerated;
      
      const feedbackPrompt =
        "Question:" +
        mockInterviewQuestion[activeQuestionIndex]?.Question +
        ", User Answer:" +
        userAnswer +
        " , Depends on question and user answer for given interview question" +
        " please give us rating for answer and feedback as area of improvement if any " +
        "in just 3 to 5 lines to improve it in JSON format with rating field and feedback field";

      const result = await chatSession.sendMessage(feedbackPrompt);

      let MockJsonResp = result.response.text();
      console.log(MockJsonResp);

      // Removing possible extra text around JSON
      MockJsonResp = MockJsonResp.replace("```json", "").replace("```", "");

      // Attempt to parse JSON
      let jsonFeedbackResp;
      try {
        jsonFeedbackResp = JSON.parse(MockJsonResp);
      } catch (e) {
        throw new Error("Invalid JSON response: " + MockJsonResp);
      }
      
      // Calculate average confidence score
      const avgConfidenceScore = calculateAverageConfidence();

      // For generated questions, we don't need to store the "correct" answer
      const correctAnswer = isGeneratedQuestion 
        ? null 
        : mockInterviewQuestion[activeQuestionIndex]?.Answer;

      const resp = await db.insert(UserAnswer).values({
        mockIdRef: interviewData?.mockId,
        question: mockInterviewQuestion[activeQuestionIndex]?.Question,
        correctAns: correctAnswer,
        userAns: userAnswer,
        feedback: jsonFeedbackResp?.feedback,
        rating: jsonFeedbackResp?.rating,
        userEmail: user?.primaryEmailAddress?.emailAddress,
        createdAt: moment().format("YYYY-MM-DD"),
        emotionData: JSON.stringify(emotionData),
        confidenceScore: avgConfidenceScore
      });

      if (resp) {
        toast("User Answer recorded successfully");
        
        // If this is not a generated question, trigger generation of follow-up questions
        if (!isGeneratedQuestion && typeof onAnswerSubmitted === 'function') {
          // Wait a moment before triggering question generation
          setTimeout(() => {
            onAnswerSubmitted();
          }, 1000);
        }
      }
      
      setUserAnswer("");
      setLoading(false);
    } catch (error) {
      console.error(error);
      toast("An error occurred while recording the user answer");
      setLoading(false);
    }
  };
  
  const calculateAverageConfidence = () => {
    if (!emotionData.length) return confidenceScore;
    
    const sum = emotionData.reduce((acc, item) => {
      return acc + parseFloat(item.confidenceMetrics.confidenceScore);
    }, 0);
    
    return (sum / emotionData.length).toFixed(1);
  };

  // Check if the current question is a generated follow-up
  const isGeneratedQuestion = mockInterviewQuestion && 
    mockInterviewQuestion[activeQuestionIndex]?.isGenerated;

  return (
    <div className="flex flex-col items-center justify-center overflow-hidden">
      <div className="flex flex-col justify-center items-center rounded-lg p-5 bg-black mt-4 w-[30rem] relative">
        {webCamEnabled ? (
          <Webcam
            ref={webcamRef}
            mirrored={true}
            style={{ height: 250, width: "100%", zIndex: 10 }}
          />
        ) : (
          <Image src={"/camera.jpg"} width={200} height={200} alt="Camera placeholder" />
        )}
        
        {webCamEnabled && emotionData.length > 0 && (
          <div 
            className="absolute top-8 right-8 bg-white/80 rounded-full p-2 cursor-pointer"
            onClick={() => setShowEmotionStats(!showEmotionStats)}
            title="Confidence Score"
          >
            <div className="flex items-center gap-1">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-600">{confidenceScore}</span>
            </div>
          </div>
        )}
        
        {showEmotionStats && emotionData.length > 0 && (
          <div className="absolute top-8 left-8 bg-white/90 rounded-lg p-2 text-xs">
            <div className="font-medium mb-1">Current Emotions:</div>
            {emotionData.length > 0 && (
              <div>
                {Object.entries(emotionData[emotionData.length - 1].expressions || {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([emotion, value]) => (
                    <div key={emotion} className="flex justify-between">
                      <span className="capitalize">{emotion}:</span>
                      <span>{Math.round(value * 100)}%</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="md:flex mt-4 md:mt-8 md:gap-5">
        <div className="my-4 md:my-0">
          <Button onClick={() => setWebCamEnabled((prev) => !prev)}>
            {webCamEnabled ? "Close WebCam" : "Enable WebCam"}
          </Button>
        </div>
        <Button
          variant="outline"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={loading}
          className={isGeneratedQuestion ? "border-blue-500 text-blue-600" : ""}
        >
          {isRecording ? (
            <h2 className="text-red-400 flex gap-2 ">
              <Mic /> Stop Recording...
            </h2>
          ) : (
            " Record Answer"
          )}
        </Button>
      </div>
      
      {/* Emotion Tracker (invisible component) */}
      {webCamEnabled && webcamRef.current && (
        <EmotionTracker 
          videoRef={webcamRef} 
          onEmotionUpdate={handleEmotionUpdate} 
        />
      )}
    </div>
  );
};

export default RecordAnswerSection;


















// "use client";
// import { Button } from "@/components/ui/button";
// import Image from "next/image";
// import React, { useContext, useEffect, useState } from "react";
// import Webcam from "react-webcam";
// import useSpeechToText from "react-hook-speech-to-text";
// import { Mic } from "lucide-react";
// import { toast } from "sonner";
// import { chatSession } from "@/utils/GeminiAIModal";
// import { db } from "@/utils/db";
// import { UserAnswer } from "@/utils/schema";
// import { useUser } from "@clerk/nextjs";
// import moment from "moment";
// import { WebCamContext } from "@/app/dashboard/layout";

// const RecordAnswerSection = ({
//   mockInterviewQuestion,
//   activeQuestionIndex,
//   interviewData,
// }) => {
//   const [userAnswer, setUserAnswer] = useState("");
//   const { user } = useUser();
//   const [loading, setLoading] = useState(false);
//   const {
//     error,
//     interimResult,
//     isRecording,
//     results,
//     startSpeechToText,
//     stopSpeechToText,
//     setResults,
//   } = useSpeechToText({
//     continuous: true,
//     useLegacyResults: false,
//   });
//   const { webCamEnabled, setWebCamEnabled } = useContext(WebCamContext);

//   useEffect(() => {
//     results.map((result) =>
//       setUserAnswer((prevAns) => prevAns + result?.transcript)
//     );
//   }, [results]);

//   useEffect(() => {
//     if (!isRecording && userAnswer.length > 10) {
//       updateUserAnswer();
//     }
//     // if (userAnswer?.length < 10) {
//     //   setLoading(false);
//     //   toast("Error while saving your answer, Please record again");
//     //   return;
//     // }
//   }, [userAnswer]);

//   const StartStopRecording = async () => {
//     if (isRecording) {
//       stopSpeechToText();
//     } else {
//       startSpeechToText();
//     }
//   };

//   const updateUserAnswer = async () => {
//     try {
//       console.log(userAnswer);
//       setLoading(true);
//       const feedbackPrompt =
//         "Question:" +
//         mockInterviewQuestion[activeQuestionIndex]?.Question +
//         ", User Answer:" +
//         userAnswer +
//         " , Depends on question and user answer for given interview question" +
//         " please give us rating for answer and feedback as area of improvement if any " +
//         "in just 3 to 5 lines to improve it in JSON format with rating field and feedback field";

//       const result = await chatSession.sendMessage(feedbackPrompt);

//       let MockJsonResp = result.response.text();
//       console.log(MockJsonResp);

//       // Removing possible extra text around JSON
//       MockJsonResp = MockJsonResp.replace("```json", "").replace("```", "");

//       // Attempt to parse JSON
//       let jsonFeedbackResp;
//       try {
//         jsonFeedbackResp = JSON.parse(MockJsonResp);
//       } catch (e) {
//         throw new Error("Invalid JSON response: " + MockJsonResp);
//       }

//       const resp = await db.insert(UserAnswer).values({
//         mockIdRef: interviewData?.mockId,
//         question: mockInterviewQuestion[activeQuestionIndex]?.Question,
//         correctAns: mockInterviewQuestion[activeQuestionIndex]?.Answer,
//         userAns: userAnswer,
//         feedback: jsonFeedbackResp?.feedback,
//         rating: jsonFeedbackResp?.rating,
//         userEmail: user?.primaryEmailAddress?.emailAddress,
//         createdAt: moment().format("YYYY-MM-DD"),
//       });

//       if (resp) {
//         toast("User Answer recorded successfully");
//       }
//       setUserAnswer("");
//       setResults([]);
//       setLoading(false);
//     } catch (error) {
//       console.error(error);
//       toast("An error occurred while recording the user answer");
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="flex flex-col items-center justify-center overflow-hidden">
//       <div className="flex flex-col justify-center items-center rounded-lg p-5 bg-black mt-4 w-[30rem] ">
//         {webCamEnabled ? (
//           <Webcam
//             mirrored={true}
//             style={{ height: 250, width: "100%", zIndex: 10 }}
//           />
//         ) : (
//           <Image src={"/camera.jpg"} width={200} height={200} />
//         )}
//       </div>
//       <div className="md:flex  mt-4 md:mt-8 md:gap-5">
//         <div className="my-4 md:my-0">
//           <Button
//             // className={`${webCamEnabled ? "w-full" : "w-full"}`}
//             onClick={() => setWebCamEnabled((prev) => !prev)}
//           >
//             {webCamEnabled ? "Close WebCam" : "Enable WebCam"}
//           </Button>
//         </div>
//         <Button
//           varient="outline"
//           // className="my-10"
//           onClick={StartStopRecording}
//           disabled={loading}
//         >
//           {isRecording ? (
//             <h2 className="text-red-400 flex gap-2 ">
//               <Mic /> Stop Recording...
//             </h2>
//           ) : (
//             " Record Answer"
//           )}
//         </Button>
//       </div>
//     </div>
//   );
// };

// export default RecordAnswerSection;
