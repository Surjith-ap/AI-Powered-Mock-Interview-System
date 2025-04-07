CREATE TABLE IF NOT EXISTS "mockInterview" (
	"id" serial PRIMARY KEY NOT NULL,
	"jsonMockResp" text NOT NULL,
	"jobPosition" varchar NOT NULL,
	"jobDesc" varchar NOT NULL,
	"jobExperience" varchar NOT NULL,
	"createdBy" varchar NOT NULL,
	"createdAt" varchar,
	"mockId" varchar NOT NULL,
	"resumeId" varchar
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "newsletter" (
	"id" serial PRIMARY KEY NOT NULL,
	"newName" varchar,
	"newEmail" varchar,
	"newMessage" text,
	"createdAt" varchar
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "question" (
	"id" serial PRIMARY KEY NOT NULL,
	"MockQuestionJsonResp" text NOT NULL,
	"jobPosition" varchar NOT NULL,
	"jobDesc" varchar NOT NULL,
	"jobExperience" varchar NOT NULL,
	"typeQuestion" varchar NOT NULL,
	"company" varchar NOT NULL,
	"createdBy" varchar NOT NULL,
	"createdAt" varchar,
	"mockId" varchar NOT NULL,
	"resumeId" varchar
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "resume" (
	"id" serial PRIMARY KEY NOT NULL,
	"resumeId" varchar NOT NULL,
	"fileName" varchar NOT NULL,
	"fileType" varchar NOT NULL,
	"extractedText" text NOT NULL,
	"userEmail" varchar NOT NULL,
	"createdAt" varchar
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userAnswer" (
	"id" serial PRIMARY KEY NOT NULL,
	"mockId" varchar NOT NULL,
	"question" varchar NOT NULL,
	"correctAns" text,
	"userAns" text,
	"feedback" text,
	"rating" varchar,
	"userEmail" varchar,
	"createdAt" varchar,
	"emotionData" text,
	"confidenceScore" varchar,
	"criteriaScores" text
);
