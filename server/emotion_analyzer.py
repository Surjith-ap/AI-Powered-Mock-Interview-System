#!/usr/bin/env python
import sys
import json
import os
import base64
import traceback
import argparse
import gc
import tempfile
import re
import signal
import time

# Set up signal handler for graceful termination
def signal_handler(sig, frame):
    print("Received termination signal. Cleaning up...", file=sys.stderr)
    gc.collect()
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

try:
    import cv2
    import numpy as np
except ImportError as e:
    print(f"Error importing OpenCV: {e}", file=sys.stderr)
    sys.exit(1)

try:
    from deepface import DeepFace
except ImportError as e:
    print(f"Error importing DeepFace: {e}", file=sys.stderr)
    sys.exit(1)

# Set OpenCV to use less memory
cv2.setUseOptimized(True)
cv2.setNumThreads(1)  # Use fewer threads to reduce memory usage

def cleanup_temp_file(file_path):
    """Safely cleanup a temporary file"""
    if file_path and os.path.exists(file_path):
        try:
            os.unlink(file_path)
            print(f"Removed temporary file: {file_path}", file=sys.stderr)
        except Exception as e:
            print(f"Failed to delete temp file: {e}", file=sys.stderr)

def analyze_emotion(image_path=None, base64_image=None):
    """
    Analyze emotions in an image using DeepFace
    """
    temp_file = None
    img = None
    img_rgb = None
    
    try:
        # Force garbage collection before processing
        gc.collect()
        
        # If base64 image is provided, save to a temporary file
        if base64_image:
            try:
                # Remove data URL prefix if present
                if isinstance(base64_image, str) and base64_image.startswith('data:image'):
                    base64_image = base64_image.split(',')[1]
                
                # Decode base64
                image_bytes = base64.b64decode(base64_image)
                
                # Create a temporary file
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
                temp_file.write(image_bytes)
                temp_file.close()
                image_path = temp_file.name
                print(f"Saved base64 image to temporary file: {image_path}", file=sys.stderr)
            except Exception as e:
                print(f"Error processing base64 image: {e}", file=sys.stderr)
                traceback.print_exc(file=sys.stderr)
                raise ValueError(f"Invalid base64 image data: {str(e)}")
        
        # Try reading the image with OpenCV
        print(f"Reading image from path: {image_path}", file=sys.stderr)
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Failed to read image from {image_path}")
            
        # Print image dimensions for debugging
        height, width = img.shape[:2]
        print(f"Image dimensions: {width}x{height}", file=sys.stderr)
        
        # Convert to RGB for DeepFace
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Explicitly release memory for img to save memory during DeepFace processing
        img = None
        gc.collect()
        
        # Analyze with DeepFace using lighter settings
        print("Analyzing image with DeepFace", file=sys.stderr)
        start_time = time.time()
        result = DeepFace.analyze(
            img_path=img_rgb,
            actions=['emotion'],
            enforce_detection=False,  # More lenient face detection
            detector_backend='opencv',  # Faster detector
            silent=True
        )
        process_time = time.time() - start_time
        print(f"DeepFace analysis completed in {process_time:.2f} seconds", file=sys.stderr)
        
        # Clear memory after processing
        img_rgb = None
        gc.collect()
        
        # Handle both list and dict results
        if isinstance(result, list):
            print(f"DeepFace returned a list of {len(result)} results", file=sys.stderr)
            if len(result) == 0:
                raise ValueError("DeepFace returned empty results")
            result = result[0]
        else:
            print("DeepFace returned a single result", file=sys.stderr)
            
        # Extract emotion data
        emotion_data = result.get('emotion', {})
        print(f"Extracted emotions: {emotion_data}", file=sys.stderr)
        
        dominant_emotion = result.get('dominant_emotion', 'neutral')
        print(f"Dominant emotion: {dominant_emotion}", file=sys.stderr)
        
        # Define emotion weights (confidence scores)
        emotion_weights = {
            'happy': 1.0,
            'neutral': 0.8,
            'surprise': 0.7,
            'sad': 0.4,
            'angry': 0.3,
            'fear': 0.3,
            'disgust': 0.3
        }
        
        # Calculate confidence score
        confidence = emotion_weights.get(dominant_emotion, 0.5)*10
        print(f"Calculated confidence score: {confidence}", file=sys.stderr)

        # Prepare result before cleanup
        result = {
            'success': True,
            'expressions': emotion_data,
            'confidenceMetrics': {
                'confidenceScore': confidence,
                'primaryEmotion': dominant_emotion
            }
        }
        
        # Force garbage collection before returning
        gc.collect()
        
        return result
        
    except Exception as e:
        print(f"Error in analyze_emotion: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return {
            'success': False,
            'error': str(e),
            'expressions': {'neutral': 1.0},
            'confidenceMetrics': {
                'confidenceScore': 0.5,
                'primaryEmotion': 'neutral'
            }
        }
    finally:
        # Release image objects
        if img is not None:
            img = None
            
        if img_rgb is not None:
            img_rgb = None
            
        # Ensure memory is cleared
        gc.collect()
        
        # Clean up temporary file if created
        if temp_file is not None:
            cleanup_temp_file(temp_file.name)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Analyze emotions in an image')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--image', type=str, help='Path to the image file')
    group.add_argument('--base64', type=str, help='Base64 encoded image data')
    
    args = parser.parse_args()
    
    # Force garbage collection at start
    gc.collect()
    
    temp_file_path = None
    try:
        if args.image:
            if not os.path.exists(args.image):
                print(f"Image file not found: {args.image}", file=sys.stderr)
                print(json.dumps({"success": False, "error": f"Image file not found: {args.image}"}))
                sys.exit(1)
            result = analyze_emotion(image_path=args.image)
        else:
            result = analyze_emotion(base64_image=args.base64)
        
        # Output the result
        print(json.dumps(result))
    except Exception as e:
        print(f"Fatal error: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({
            'success': False,
            'error': str(e),
            'expressions': {'neutral': 1.0},
            'confidenceMetrics': {
                'confidenceScore': 0.5,
                'primaryEmotion': 'neutral'
            }
        }))
    finally:
        # Final garbage collection
        gc.collect()