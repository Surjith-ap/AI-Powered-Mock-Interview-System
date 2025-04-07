"use client";
import React, { useMemo } from 'react';
import { 
  SmilePlus, 
  Frown, 
  Meh, 
  BarChart3, 
  TrendingUp, 
  AlertCircle 
} from 'lucide-react';

const EmotionFeedback = ({ emotionData, confidenceScore, showEmotionDistribution = false }) => {
  // Parse emotion data if it's a string
  const parsedEmotionData = useMemo(() => {
    if (!emotionData) return [];
    try {
      return typeof emotionData === 'string' ? JSON.parse(emotionData) : emotionData;
    } catch (error) {
      console.error('Error parsing emotion data:', error);
      return [];
    }
  }, [emotionData]);
  
  // Calculate emotion statistics
  const emotionStats = useMemo(() => {
    if (!parsedEmotionData.length) return null;
    
    // Count occurrences of each primary emotion
    const emotionCounts = {};
    parsedEmotionData.forEach(data => {
      const primaryEmotion = data.confidenceMetrics?.primaryEmotion;
      if (primaryEmotion) {
        emotionCounts[primaryEmotion] = (emotionCounts[primaryEmotion] || 0) + 1;
      }
    });
    
    // Calculate percentages
    const total = parsedEmotionData.length;
    const emotionPercentages = {};
    Object.keys(emotionCounts).forEach(emotion => {
      emotionPercentages[emotion] = Math.round((emotionCounts[emotion] / total) * 100);
    });
    
    // Group emotions into positive, neutral, and negative
    const positiveEmotions = ['happy', 'surprised'];
    const neutralEmotions = ['neutral'];
    const negativeEmotions = ['sad', 'angry', 'fearful', 'disgusted'];
    
    const positivePercentage = positiveEmotions.reduce((sum, emotion) => 
      sum + (emotionPercentages[emotion] || 0), 0);
    
    const neutralPercentage = neutralEmotions.reduce((sum, emotion) => 
      sum + (emotionPercentages[emotion] || 0), 0);
    
    const negativePercentage = negativeEmotions.reduce((sum, emotion) => 
      sum + (emotionPercentages[emotion] || 0), 0);
    
    return {
      emotionCounts,
      emotionPercentages,
      positivePercentage,
      neutralPercentage,
      negativePercentage,
      dominantEmotion: Object.keys(emotionCounts).reduce((a, b) => 
        emotionCounts[a] > emotionCounts[b] ? a : b, Object.keys(emotionCounts)[0])
    };
  }, [parsedEmotionData]);
  
  // Generate feedback based on confidence score and emotion stats
  const getFeedback = () => {
    if (!confidenceScore || !emotionStats) return [];
    
    const score = parseFloat(confidenceScore);
    const feedback = [];
    
    // Confidence score feedback
    if (score < 5) {
      feedback.push({
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
        text: "Your confidence level appears low. Try to maintain more positive expressions and better eye contact in future interviews."
      });
    } else if (score >= 5 && score < 7) {
      feedback.push({
        icon: <TrendingUp className="h-5 w-5 text-yellow-500" />,
        text: "You showed moderate confidence. Work on consistency in your expressions and maintaining a positive demeanor."
      });
    } else {
      feedback.push({
        icon: <SmilePlus className="h-5 w-5 text-green-500" />,
        text: "Excellent confidence displayed throughout the interview! Your positive expressions likely made a good impression."
      });
    }
    
    // Emotion-specific feedback
    if (emotionStats.positivePercentage < 30) {
      feedback.push({
        icon: <Frown className="h-5 w-5 text-red-500" />,
        text: "You displayed few positive emotions. Try to smile more and show enthusiasm for the position."
      });
    }
    
    if (emotionStats.negativePercentage > 30) {
      feedback.push({
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
        text: "Negative emotions were detected frequently. Practice maintaining a neutral or positive expression even when discussing challenges."
      });
    }
    
    if (emotionStats.neutralPercentage > 70) {
      feedback.push({
        icon: <Meh className="h-5 w-5 text-yellow-500" />,
        text: "Your expressions were mostly neutral. While professional, try to show more enthusiasm and engagement."
      });
    }
    
    return feedback;
  };
  
  // If no data, show placeholder
  if (!emotionData || !confidenceScore) {
    return (
      <div className="mt-4 p-4 border rounded-lg bg-gray-50">
        <h3 className="font-bold text-lg flex items-center">
          <BarChart3 className="mr-2 h-5 w-5 text-gray-500" />
          Confidence Analysis
        </h3>
        <p className="text-gray-500 mt-2">No emotion data available for this interview.</p>
      </div>
    );
  }
  
  const feedback = getFeedback();
  
  return (
    <div className="mt-6 p-5 border rounded-lg bg-blue-50">
      <h3 className="font-bold text-lg flex items-center text-blue-800">
        <BarChart3 className="mr-2 h-5 w-5" />
        Confidence Analysis
      </h3>
      
      {/* Confidence Score */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-blue-700">Confidence Score</span>
          <span className="text-sm font-medium text-blue-700">{confidenceScore}/10</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${
              parseFloat(confidenceScore) < 5 ? 'bg-red-500' : 
              parseFloat(confidenceScore) < 7 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${parseFloat(confidenceScore) * 10}%` }}
          ></div>
        </div>
      </div>
      
      {/* Emotion Distribution - Only displayed if showEmotionDistribution is true */}
      {showEmotionDistribution && emotionStats && (
        <div className="mt-4">
          <h4 className="font-medium text-blue-700 mb-2">Emotion Distribution</h4>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <SmilePlus className="h-5 w-5 mx-auto text-green-500" />
              <div className="mt-1 text-sm font-medium text-green-700">{emotionStats.positivePercentage}%</div>
              <div className="text-xs text-green-600">Positive</div>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <Meh className="h-5 w-5 mx-auto text-gray-500" />
              <div className="mt-1 text-sm font-medium text-gray-700">{emotionStats.neutralPercentage}%</div>
              <div className="text-xs text-gray-600">Neutral</div>
            </div>
            <div className="p-2 bg-red-100 rounded-lg">
              <Frown className="h-5 w-5 mx-auto text-red-500" />
              <div className="mt-1 text-sm font-medium text-red-700">{emotionStats.negativePercentage}%</div>
              <div className="text-xs text-red-600">Negative</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Feedback */}
      <div className="mt-4">
        <h4 className="font-medium text-blue-700 mb-2">Feedback on Body Language:</h4>
        <ul className="space-y-3">
          {feedback.map((item, index) => (
            <li key={index} className="flex items-start">
              <span className="mr-2 mt-0.5">{item.icon}</span>
              <span className="text-sm text-gray-700">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Tips */}
      <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-700 mb-1">Tips for Improvement:</h4>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          <li>Practice maintaining eye contact with the camera</li>
          <li>Smile naturally when introducing yourself and discussing achievements</li>
          <li>Maintain good posture throughout the interview</li>
          <li>Use hand gestures moderately to emphasize points</li>
          <li>Practice in front of a mirror to become aware of your expressions</li>
        </ul>
      </div>
    </div>
  );
};

export default EmotionFeedback; 