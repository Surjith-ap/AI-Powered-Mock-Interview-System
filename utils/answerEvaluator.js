import { GoogleGenerativeAI } from "@google/generative-ai";

export async function evaluateAnswerSimilarity(question, userAnswer, correctAnswer = '', resumeContent = '') {
  const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `
    You are an expert technical interviewer evaluating a candidate's response to an interview question.
    
    Question: ${question}
    Candidate's Answer: ${userAnswer}
    
    ${resumeContent ? `Candidate's Resume:\n${resumeContent}\n` : ''}
    
    Please evaluate the answer thoroughly based on:
    
    1. Technical Accuracy: Is the information factually correct? Are concepts, terms, and technologies used properly?
    
    2. Completeness: Does the answer address all key aspects of the question ?
    
    3. Relevance to Experience: If resume is provided, how well does the answer reflect the candidate's stated skills and experience?
    
    4. Communication Quality: Is the answer structured and clear?
    
    Provide a detailed evaluation with specific examples from the answer.
    
    Return a JSON object with exactly these fields:
    {
      "rating": number (0-10 score),
      "feedback": string (detailed feedback with strengths and areas for improvement)
    }
  `;
  
  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Error evaluating answer similarity:", error);
    // Return a fallback response in case of parsing errors
    return {
      rating: 5,
      feedback: "Unable to properly evaluate the answer due to a technical issue. Please try again."
    };
  }
} 