"use client";
import { UserButton } from "@clerk/nextjs";
import React, { useEffect, useState } from "react";
import AddNewInterview from "./_components/AddNewInterview";
import InterviewList from "./_components/InterviewList";
import { useSearchParams, useRouter } from "next/navigation";
import { db } from "@/utils/db";
import { Resume } from "@/utils/schema";
import { eq } from "drizzle-orm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight } from "lucide-react";
import Link from "next/link";

const Dashboard = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resumeId = searchParams.get("resumeId");
  const [resumeData, setResumeData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resumeId) {
      fetchResumeData(resumeId);
    }
  }, [resumeId]);

  const fetchResumeData = async (id) => {
    try {
      setLoading(true);
      const result = await db
        .select()
        .from(Resume)
        .where(eq(Resume.resumeId, id));

      if (result.length > 0) {
        setResumeData(result[0]);
      } else {
        toast.error("Resume not found");
        router.replace("/dashboard");
      }
    } catch (error) {
      console.error("Error fetching resume:", error);
      toast.error("Failed to load resume data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10">
      <h2 className="font-bold text-2xl">Dashboard</h2>
      <h2 className="text-gray-500">Create and start your AI Mockup Interview</h2>

      {resumeData ? (
        <div className="my-5 p-6 border rounded-lg bg-card">
          <div className="flex items-center mb-4">
            <FileText className="h-6 w-6 text-primary mr-2" />
            <h3 className="text-lg font-medium">Using Resume: {resumeData.fileName}</h3>
          </div>
          <p className="mb-4 text-sm text-gray-500">
            You're creating an interview based on your uploaded resume. The AI will analyze your resume
            to generate relevant interview questions.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => router.replace("/dashboard")}>
              Cancel
            </Button>
            <AddNewInterview initialResumeData={resumeData} />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-5">
            <AddNewInterview />
            <Link href="/dashboard/resumes" className="block">
              <div className="p-10 rounded-lg border bg-secondary hover:scale-105 hover:shadow-sm transition-all cursor-pointer">
                <div className="flex flex-col items-center justify-center">
                  <FileText className="h-8 w-8 mb-2" />
                  <h2 className="text-lg text-center">Manage Resumes</h2>
                </div>
              </div>
            </Link>
          </div>

          <InterviewList />
        </>
      )}
    </div>
  );
};

export default Dashboard;
