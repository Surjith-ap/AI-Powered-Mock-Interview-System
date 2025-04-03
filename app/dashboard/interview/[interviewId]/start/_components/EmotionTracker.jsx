"use client";
import React, { useRef, useEffect, useState } from 'react';
import { toast } from 'sonner';

const EmotionTracker = ({ videoRef, onEmotionUpdate }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const intervalRef = useRef(null);
  const capturingCanvasRef = useRef(null);
  const abortControllerRef = useRef(null);
  
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
      // Clear the interval to stop tracking
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Abort any in-progress fetch requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Remove canvas reference
      if (capturingCanvasRef.current) {
        // Clear the canvas context to release memory
        const ctx = capturingCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, capturingCanvasRef.current.width, capturingCanvasRef.current.height);
        }
        capturingCanvasRef.current = null;
      }
    };
  }, []);

  const checkServerAvailability = async () => {
    try {
      const controller = new AbortController();
      const signal = controller.signal;
      abortControllerRef.current = controller;
      
      const response = await fetch(`${EMOTION_SERVER_URL}`, { 
        method: 'GET',
        signal: AbortSignal.timeout(30000) // Timeout after 30 seconds
      });
      return response.ok;
    } catch (error) {
      console.error("Emotion server check failed:", error);
      return false;
    } finally {
      abortControllerRef.current = null;
    }
  };

  const startEmotionTracking = () => {
    // Stop any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Start capturing frames and analyzing emotions every 5 seconds
    intervalRef.current = setInterval(() => {
      captureAndAnalyzeFrame();
    }, 5000);
  };

  const captureAndAnalyzeFrame = async () => {
    // Abort any previous in-progress requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (isProcessing || !videoRef.current || !videoRef.current.video) {
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Create a new AbortController for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      // Capture frame from webcam
      const video = videoRef.current.video;
      const canvas = capturingCanvasRef.current;
      
      if (!canvas) {
        throw new Error("Canvas not available");
      }
      
      const context = canvas.getContext('2d');
      
      // Set canvas dimensions to a smaller size to reduce memory usage
      // Smaller images are faster to process and use less memory
      const maxWidth = 320; // Significantly reduced size
      const maxHeight = 240;
      
      // Calculate aspect ratio to maintain proportions
      const aspectRatio = video.videoWidth / video.videoHeight;
      let width = maxWidth;
      let height = width / aspectRatio;
      
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw video frame to canvas with reduced dimensions
      context.drawImage(video, 0, 0, width, height);
      
      // Convert canvas to base64 image data with low quality to reduce size
      const imageData = canvas.toDataURL('image/jpeg', 0.7); // Lower quality for smaller size
      
      if (!isFallbackMode) {
        try {
          // Send to server for analysis
          const response = await fetch(`${EMOTION_SERVER_URL}/analyze-emotion`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageData }),
            signal: AbortSignal.timeout(30000)
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Server error ${response.status}: ${errorText}`);
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
          // Ignore aborted request errors
          if (error.name === 'AbortError') {
            console.log('Emotion analysis request was aborted');
            return;
          }
          
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
      
      // Clean up canvas memory after processing
      if (capturingCanvasRef.current) {
        const ctx = capturingCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, capturingCanvasRef.current.width, capturingCanvasRef.current.height);
        }
      }
      
      // Clear abort controller reference when done
      abortControllerRef.current = null;
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