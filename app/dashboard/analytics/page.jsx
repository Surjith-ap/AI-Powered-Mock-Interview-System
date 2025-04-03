"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const Analytics = () => {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to dashboard as analytics is disabled
    router.push("/dashboard");
  }, [router]);

  return null; // Return nothing as we're redirecting
};

export default Analytics; 