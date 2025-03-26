import { UserButton } from "@clerk/nextjs";
import React from "react";
import QuestionList from "../_components/QuestionList";

const Questions = () => {
  return (
    <div className="p-10" >
      <h2 className="font-bold text-2xl" >Master Your Interviews</h2>
      <h2 className="text-gray-500" >Comprehensive Question Preparation with AI</h2>

      <QuestionList/>
    </div>
  );
};

export default Questions;