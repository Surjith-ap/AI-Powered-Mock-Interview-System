"use client";
import React from "react";

const AnalyticsLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6">
        {children}
      </div>
    </div>
  );
};

export default AnalyticsLayout; 