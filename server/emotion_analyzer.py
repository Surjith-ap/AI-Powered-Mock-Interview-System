#!/usr/bin/env python
import sys
import json
import os
import base64
from deepface import DeepFace
import argparse
import traceback
import cv2
import numpy as np
import gc

def analyze_emotion(image_path):
    """
    Analyze emotions in an image using DeepFace
    """
    try:
        # Clear memory before processing
        gc.collect()
        
        # Read image with OpenCV first
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError("Failed to read image")
            
        # Convert to RGB for DeepFace
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Analyze with DeepFace
        result = DeepFace.analyze(
            img_path=img_rgb,
            actions=['emotion'],
            enforce_detection=False,  # More lenient face detection
            detector_backend='opencv',
            silent=True
        )
        
        # Clear memory after processing
        gc.collect()
        
        # Handle both list and dict results
        if isinstance(result, list):
            result = result[0]
            
        # Extract emotion data
        emotion_data = result.get('emotion', {})
        dominant_emotion = result.get('dominant_emotion', 'neutral')
        
        # Define emotion weights (confidence scores)
        emotion_weights = {
            'happy': 1.0,
            'neutral': 0.8,
            'surprise': 0.7,
            'sad': 0.4,
            'angry': 0.3,
            'fear': 0.3
        }
        
        # Calculate confidence score
        confidence = emotion_weights.get(dominant_emotion, 0.5)
        
        return {
            'emotions': emotion_data,
            'dominant_emotion': dominant_emotion,
            'confidence': confidence
        }
        
    except Exception as e:
        print(f"Error in analyze_emotion: {str(e)}")
        return {
            'emotions': {'neutral': 1.0},
            'dominant_emotion': 'neutral',
            'confidence': 0.5
        }
    finally:
        # Ensure memory is cleared
        gc.collect()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Analyze emotions in an image')
    parser.add_argument('--image', type=str, required=True, help='Path to the image file')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.image):
        print(json.dumps({"success": False, "error": f"Image file not found: {args.image}"}))
        sys.exit(1)
    
    result = analyze_emotion(args.image)
    print(json.dumps(result)) 