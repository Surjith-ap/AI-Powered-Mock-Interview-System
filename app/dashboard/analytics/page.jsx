"use client";
import { db } from "@/utils/db";
import { UserAnswer } from "@/utils/schema";
import { eq } from "drizzle-orm";
import React, { useEffect, useState } from "react";
import { Line, Bar, Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ScatterController
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ScatterController
);

const Analytics = () => {
  const [interviewData, setInterviewData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [interviews, setInterviews] = useState([]);

  useEffect(() => {
    // Fetch all unique interview IDs
    const fetchInterviews = async () => {
      try {
        const result = await db.select({ mockIdRef: UserAnswer.mockIdRef })
          .from(UserAnswer)
          .groupBy(UserAnswer.mockIdRef);
        
        setInterviews(result);
        if (result.length > 0) {
          setSelectedInterview(result[0].mockIdRef);
        }
      } catch (error) {
        console.error("Error fetching interviews:", error);
      }
    };
    
    fetchInterviews();
  }, []);

  useEffect(() => {
    if (selectedInterview) {
      fetchInterviewData();
    }
  }, [selectedInterview]);

  const fetchInterviewData = async () => {
    try {
      setLoading(true);
      const result = await db.select()
        .from(UserAnswer)
        .where(eq(UserAnswer.mockIdRef, selectedInterview))
        .orderBy(UserAnswer.id);
      
      setInterviewData(result);
    } catch (error) {
      console.error("Error fetching interview data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for answer similarity chart
  const answerSimilarityData = {
    labels: interviewData.map((_, index) => `Q${index + 1}`),
    datasets: [
      {
        label: 'Answer Similarity (out of 10)',
        data: interviewData.map(item => parseFloat(item.rating)),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.1
      }
    ]
  };

  // Prepare data for emotion confidence chart
  const emotionConfidenceData = {
    labels: interviewData.map((_, index) => `Q${index + 1}`),
    datasets: [
      {
        label: 'Emotion Confidence (out of 10)',
        data: interviewData.map(item => parseFloat(item.confidenceScore || 0)),
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
        tension: 0.1
      }
    ]
  };

  // Prepare data for correlation scatter plot
  const correlationData = {
    datasets: [
      {
        label: 'Answer Similarity vs Emotion Confidence',
        data: interviewData.map(item => ({
          x: parseFloat(item.rating),
          y: parseFloat(item.confidenceScore || 0)
        })),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      }
    ]
  };

  // Calculate average scores
  const averageSimilarity = interviewData.length > 0 
    ? (interviewData.reduce((sum, item) => sum + parseFloat(item.rating), 0) / interviewData.length).toFixed(1)
    : 0;
  
  const averageConfidence = interviewData.length > 0
    ? (interviewData.reduce((sum, item) => sum + parseFloat(item.confidenceScore || 0), 0) / interviewData.length).toFixed(1)
    : 0;

  // Calculate correlation coefficient
  const calculateCorrelation = () => {
    if (interviewData.length < 2) return 0;
    
    const xValues = interviewData.map(item => parseFloat(item.rating));
    const yValues = interviewData.map(item => parseFloat(item.confidenceScore || 0));
    
    const xMean = xValues.reduce((sum, val) => sum + val, 0) / xValues.length;
    const yMean = yValues.reduce((sum, val) => sum + val, 0) / yValues.length;
    
    const xDiff = xValues.map(val => val - xMean);
    const yDiff = yValues.map(val => val - yMean);
    
    const xDiffSquared = xDiff.map(val => val * val);
    const yDiffSquared = yDiff.map(val => val * val);
    
    const xyDiff = xDiff.map((val, i) => val * yDiff[i]);
    
    const xDiffSquaredSum = xDiffSquared.reduce((sum, val) => sum + val, 0);
    const yDiffSquaredSum = yDiffSquared.reduce((sum, val) => sum + val, 0);
    const xyDiffSum = xyDiff.reduce((sum, val) => sum + val, 0);
    
    const correlation = xyDiffSum / Math.sqrt(xDiffSquaredSum * yDiffSquaredSum);
    
    return isNaN(correlation) ? 0 : correlation.toFixed(2);
  };

  const correlation = calculateCorrelation();

  if (loading) {
    return <div className="p-10 text-center">Loading analytics...</div>;
  }

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-6">Interview Performance Analytics</h1>
      
      {/* Interview selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Interview
        </label>
        <select 
          className="w-full md:w-64 p-2 border rounded-md"
          value={selectedInterview || ''}
          onChange={(e) => setSelectedInterview(e.target.value)}
        >
          {interviews.map((interview) => (
            <option key={interview.mockIdRef} value={interview.mockIdRef}>
              Interview {interview.mockIdRef}
            </option>
          ))}
        </select>
      </div>
      
      {interviewData.length === 0 ? (
        <div className="text-center p-10 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No data available for this interview.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Answer Similarity Over Questions</h2>
              <Line data={answerSimilarityData} options={{
                scales: {
                  y: {
                    min: 0,
                    max: 10
                  }
                }
              }} />
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Emotion Confidence Over Questions</h2>
              <Line data={emotionConfidenceData} options={{
                scales: {
                  y: {
                    min: 0,
                    max: 10
                  }
                }
              }} />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow mb-8">
            <h2 className="text-lg font-semibold mb-4">Correlation: Answer Similarity vs Emotion Confidence</h2>
            <div className="h-80">
              <Scatter data={correlationData} options={{
                scales: {
                  x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                      display: true,
                      text: 'Answer Similarity'
                    },
                    min: 0,
                    max: 10
                  },
                  y: {
                    title: {
                      display: true,
                      text: 'Emotion Confidence'
                    },
                    min: 0,
                    max: 10
                  }
                }
              }} />
            </div>
            <div className="mt-4 text-center">
              <p className="text-lg">
                Correlation Coefficient: <span className="font-bold">{correlation}</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {correlation > 0.7 ? 'Strong positive correlation' : 
                 correlation > 0.3 ? 'Moderate positive correlation' : 
                 correlation > -0.3 ? 'Weak or no correlation' : 
                 correlation > -0.7 ? 'Moderate negative correlation' : 
                 'Strong negative correlation'}
              </p>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Average Scores</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-700">Average Answer Similarity</h3>
                <p className="text-3xl font-bold text-blue-600">{averageSimilarity}</p>
                <p className="text-sm text-blue-500 mt-1">out of 10</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <h3 className="font-medium text-purple-700">Average Emotion Confidence</h3>
                <p className="text-3xl font-bold text-purple-600">{averageConfidence}</p>
                <p className="text-sm text-purple-500 mt-1">out of 10</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-700">Overall Performance</h3>
                <p className="text-3xl font-bold text-green-600">
                  {((parseFloat(averageSimilarity) + parseFloat(averageConfidence)) / 2).toFixed(1)}
                </p>
                <p className="text-sm text-green-500 mt-1">combined score</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics; 