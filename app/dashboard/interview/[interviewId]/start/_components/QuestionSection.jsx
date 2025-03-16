import { Lightbulb, Volume2, Loader2 } from "lucide-react";
import React from "react";

const QuestionSection = ({ mockInterviewQuestion, activeQuestionIndex, isGeneratingQuestion }) => {
  const textToSpeech = (text) => {
    if ("speechSynthesis" in window) {
      const speech = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(speech);
    } else {
      alert("Sorry, your browser does not support text to speech.");
    }
  };

  // Check if the current question is a generated follow-up question
  const isGeneratedQuestion = mockInterviewQuestion && 
    mockInterviewQuestion[activeQuestionIndex]?.isGenerated;

  return (
    mockInterviewQuestion && (
      <div className="flex flex-col justify-between p-5 border rounded-lg my-1 bg-secondary">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {mockInterviewQuestion &&
            mockInterviewQuestion.map((question, index) => (
              <h2
                key={index}
                className={`p-2 rounded-full text-center text-xs md:text-sm cursor-pointer md:block hidden 
                  ${activeQuestionIndex == index
                    ? "bg-black text-white"
                    : "bg-secondary"
                  } 
                  ${question.isGenerated ? "border-2 border-blue-500" : ""}`}
              >
                {question.isGenerated ? "Follow-up #" : "Question #"}{index + 1}
              </h2>
            ))}
        </div>

        {isGeneratingQuestion && (
          <div className="flex items-center justify-center my-4 text-blue-600">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>Generating follow-up questions...</span>
          </div>
        )}

        <div className={`my-5 text-md md:text-lg ${isGeneratedQuestion ? "border-l-4 border-blue-500 pl-4" : ""}`}>
          {isGeneratedQuestion && (
            <div className="text-blue-600 text-sm mb-2 font-medium">
              Follow-up Question:
            </div>
          )}
          {mockInterviewQuestion[activeQuestionIndex]?.Question}
        </div>

        <Volume2
          className="cursor-pointer"
          onClick={() =>
            textToSpeech(mockInterviewQuestion[activeQuestionIndex]?.Question)
          }
        />

        <div className="border rounded-lg p-5 bg-blue-100 mt-18 md:block hidden">
          <h2 className="flex gap-2 items-center text-blue-800">
            <Lightbulb />
            <strong>Note:</strong>
          </h2>
          <h2 className="text-sm text-blue-600 my-2">
            {isGeneratedQuestion 
              ? "This is a follow-up question generated based on your previous answer."
              : process.env.NEXT_PUBLIC_QUESTION_NOTE}
          </h2>
        </div>
      </div>
    )
  );
};

export default QuestionSection;
