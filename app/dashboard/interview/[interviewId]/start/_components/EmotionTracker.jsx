"use client";
import React, { useRef, useEffect, useState } from 'react';
import { toast } from 'sonner';

const EmotionTracker = ({ videoRef, onEmotionUpdate }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Generate placeholder emotion data
  useEffect(() => {
    const generatePlaceholderData = () => {
      const interval = setInterval(() => {
        const emotions = ['happy', 'neutral', 'sad', 'angry', 'surprised', 'fearful', 'disgusted'];
        
        // Bias towards positive emotions (happy, neutral, surprised)
        const positiveEmotions = ['happy', 'neutral', 'surprised'];
        const randomEmotion = Math.random() < 0.7 ? 
          positiveEmotions[Math.floor(Math.random() * positiveEmotions.length)] :
          emotions[Math.floor(Math.random() * emotions.length)];
        
        // Create random expressions with the selected emotion having highest value
        const expressions = {};
        emotions.forEach(emotion => {
          expressions[emotion] = emotion === randomEmotion ? 
            Math.random() * 0.5 + 0.5 : // 0.5-1.0 for primary emotion
            Math.random() * 0.3; // 0-0.3 for other emotions
        });
        
        // Generate confidence score (biased towards higher scores 6-10)
        const confidenceScore = (Math.random() * 4 + 6).toFixed(1); // 6.0-10.0
        
        const newEmotionData = {
          timestamp: Date.now(),
          expressions,
          confidenceMetrics: {
            confidenceScore,
            primaryEmotion: randomEmotion
          }
        };
        
        onEmotionUpdate(newEmotionData);
      }, 2000); // Update every 2 seconds
      
      return () => clearInterval(interval);
    };
    
    // Start generating placeholder data
    const cleanup = generatePlaceholderData();
    
    // Show toast notification
    toast.success("Emotion tracking enabled (simulation mode)");
    
    // Cleanup on unmount
    return cleanup;
  }, [onEmotionUpdate]);
  
  // This is a non-visual component, so return null
  return null;
};

export default EmotionTracker; 