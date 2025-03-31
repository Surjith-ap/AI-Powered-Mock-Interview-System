import { GoogleGenerativeAI } from "@google/generative-ai";

export async function evaluateAnswerSimilarity(question, userAnswer, correctAnswer) {
  const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `
    Compare the following interview answer with the correct answer and provide:
    1. A similarity score (0-10) based on how well the user's answer covers the key points, technical accuracy, and overall correctness
    2. Detailed feedback explaining the score
    
    Question: ${question}
    Correct Answer: ${correctAnswer}
    User's Answer: ${userAnswer}
    
    Return the response in JSON format with fields:
    {
      "rating": number,
      "feedback": string
    }
  `;
  
  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Error evaluating answer similarity:", error);
    throw error;
  }
} 