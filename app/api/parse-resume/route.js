import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper function for consistent response formatting
const createResponse = (data, status = 200) => {
  return NextResponse.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }
  });
};

export async function POST(request) {
  try {
    let formData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error('Error parsing form data:', error);
      return createResponse({ 
        error: 'Invalid form data' 
      }, 400);
    }

    const file = formData.get('file');
    
    if (!file || !(file instanceof Blob)) {
      return createResponse({ 
        error: 'No valid file provided' 
      }, 400);
    }

    // Log file information
    console.log('Processing file:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validate file type
    const fileName = file.name?.toLowerCase() || '';
    const fileType = file.type?.toLowerCase() || '';
    const isPDF = fileName.endsWith('.pdf') || fileType === 'application/pdf';
    const isTXT = fileName.endsWith('.txt') || fileType === 'text/plain';

    if (!isPDF && !isTXT) {
      return createResponse({ 
        error: 'Invalid file type. Only PDF and TXT files are supported' 
      }, 400);
    }

    // Validate file size (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > MAX_SIZE) {
      return createResponse({ 
        error: 'File too large. Maximum size is 10MB' 
      }, 400);
    }

    try {
      let extractedText = '';
      
      if (isTXT) {
        extractedText = await file.text();
      } else {
        const buffer = await file.arrayBuffer();
        const data = await pdfParse(Buffer.from(buffer));
        extractedText = data.text;
      }

      // Validate and clean up extracted text
      if (!extractedText || extractedText.trim() === '') {
        return createResponse({ 
          error: 'No text could be extracted from the file' 
        }, 400);
      }

      extractedText = extractedText
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return createResponse({
        success: true,
        text: extractedText,
        fileInfo: {
          name: file.name,
          type: file.type,
          size: file.size
        }
      });

    } catch (extractError) {
      console.error('Text extraction error:', extractError);
      return createResponse({ 
        error: 'Failed to extract text from file. Please ensure the file is not corrupted or password protected.',
        details: extractError.message
      }, 400);
    }
  } catch (error) {
    console.error('Server error:', error);
    return createResponse({ 
      error: 'Internal server error' 
    }, 500);
  }
} 