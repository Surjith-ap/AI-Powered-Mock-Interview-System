"use client";
import React, { useRef, useEffect, useState } from 'react';
import { toast } from 'sonner';

const EmotionTracker = ({ videoRef, onEmotionUpdate }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const intervalRef = useRef(null);
  const capturingCanvasRef = useRef(null);
  
  // Server URL for emotion analysis
  const EMOTION_SERVER_URL = process.env.NEXT_PUBLIC_EMOTION_SERVER_URL || 'http://localhost:3001';

  useEffect(() => {
    // Create a canvas for capturing images
    capturingCanvasRef.current = document.createElement('canvas');
    
    // Try to ping the server first to check if it's available
    checkServerAvailability()
      .then(available => {
        if (!available) {
          setIsFallbackMode(true);
          toast.error("Emotion server unavailable. Using simulation mode.");
        }
        // Start analyzing emotions
        startEmotionTracking();
      });
    
    // Show toast notification
    toast.success("Emotion tracking enabled");
    
    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const checkServerAvailability = async () => {
    try {
      const response = await fetch(`${EMOTION_SERVER_URL}`, { 
        method: 'GET',
        // Set a timeout to avoid long waiting times
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      console.error("Emotion server check failed:", error);
      return false;
    }
  };

  const startEmotionTracking = () => {
    // Start capturing frames and analyzing emotions every 2 seconds
    intervalRef.current = setInterval(() => {
      captureAndAnalyzeFrame();
    }, 5000);
  };

  const captureAndAnalyzeFrame = async () => {
    if (isProcessing || !videoRef.current || !videoRef.current.video) {
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Capture frame from webcam
      const video = videoRef.current.video;
      const canvas = capturingCanvasRef.current;
      const context = canvas.getContext('2d');
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to base64 image data
      const imageData = canvas.toDataURL('image/jpeg');
      
      if (!isFallbackMode) {
        try {
          // Send to server for analysis
          const response = await fetch(`${EMOTION_SERVER_URL}/analyze-emotion`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageData }),
            // Set a timeout to avoid long waiting times
            signal: AbortSignal.timeout(5000)
          });
          
          if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
          }
          
          const emotionData = await response.json();
          
          // Normalize emotion data if needed (server might return values as 0-100 percentages)
          if (emotionData.expressions) {
            Object.keys(emotionData.expressions).forEach(emotion => {
              const value = emotionData.expressions[emotion];
              // If values are percentages (0-100), normalize to 0-1
              if (value > 1) {
                emotionData.expressions[emotion] = value / 100;
              }
            });
          }
          
          // Reset consecutive errors counter on success
          setConsecutiveErrors(0);
          
          // Send the emotion data to parent component
          onEmotionUpdate(emotionData);
        } catch (error) {
          console.error("Error analyzing emotions with server:", error);
          
          // Increment consecutive errors counter
          const newErrorCount = consecutiveErrors + 1;
          setConsecutiveErrors(newErrorCount);
          
          // If we've had 3 consecutive errors, switch to fallback mode
          if (newErrorCount >= 3) {
            setIsFallbackMode(true);
            toast.error("Repeated errors from emotion server. Switched to simulation mode.");
          }
          
          generateFallbackEmotionData();
        }
      } else {
        // Use fallback mode (simulated data)
        generateFallbackEmotionData();
      }
    } catch (error) {
      console.error("Error capturing or analyzing frame:", error);
      
      // Use fallback if any error occurs
      if (!isFallbackMode) {
        setIsFallbackMode(true);
        toast.error("Falling back to simulated emotion tracking");
        generateFallbackEmotionData();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Fallback function that generates simulated emotion data
  const generateFallbackEmotionData = () => {
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
  };
  
  // This is a non-visual component, so return null
  return null;
};

export default EmotionTracker; 