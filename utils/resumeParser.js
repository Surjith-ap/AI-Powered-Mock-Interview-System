/**
 * Utility functions for analyzing resume text
 */

// Common skill keywords to look for
const TECHNICAL_SKILLS = [
  'javascript', 'python', 'java', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin',
  'react', 'angular', 'vue', 'node', 'express', 'django', 'flask', 'spring',
  'html', 'css', 'sass', 'less', 'tailwind', 'bootstrap',
  'sql', 'mysql', 'postgresql', 'mongodb', 'firebase', 'dynamodb', 'oracle',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'github',
  'machine learning', 'ai', 'artificial intelligence', 'data science', 'nlp',
  'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy',
  'mobile', 'android', 'ios', 'flutter', 'react native',
  'agile', 'scrum', 'kanban', 'jira', 'confluence'
];

// Common job titles
const JOB_TITLES = [
  'software engineer', 'developer', 'programmer', 'web developer', 'frontend', 'backend',
  'full stack', 'data scientist', 'data analyst', 'data engineer', 'machine learning',
  'devops', 'sre', 'site reliability', 'cloud', 'architect', 'lead', 'senior', 'junior',
  'manager', 'director', 'vp', 'head', 'chief', 'cto', 'cio', 'ceo',
  'product manager', 'project manager', 'program manager', 'scrum master',
  'ux', 'ui', 'user experience', 'user interface', 'designer', 'graphic'
];

// Education related keywords
const EDUCATION_KEYWORDS = [
  'bachelor', 'master', 'phd', 'doctorate', 'bs', 'ms', 'ba', 'ma', 'mba',
  'degree', 'university', 'college', 'institute', 'school', 'academy',
  'computer science', 'engineering', 'information technology', 'it', 'mathematics',
  'physics', 'business', 'management', 'administration', 'finance', 'economics'
];

/**
 * Extracts skills from resume text using keyword matching
 * @param {string} text - Resume text
 * @returns {Array} - Array of skills
 */
const extractSkills = (text) => {
  const skills = new Set();
  const lowerText = text.toLowerCase();
  
  // Simple keyword matching
  TECHNICAL_SKILLS.forEach(skill => {
    if (lowerText.includes(skill.toLowerCase())) {
      skills.add(skill);
    }
  });
  
  // Look for skills in a skills section
  const lines = text.split('\n');
  let inSkillsSection = false;
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Check if this line is a skills section header
    if (lowerLine.includes('skills') || lowerLine.includes('technologies') || 
        lowerLine.includes('technical') || lowerLine.includes('proficiencies')) {
      inSkillsSection = true;
      continue;
    }
    
    // If we're in the skills section, add potential skills
    if (inSkillsSection) {
      // Check if we've moved to a new section
      if (lowerLine.includes('experience') || lowerLine.includes('education') || 
          lowerLine.includes('projects') || lowerLine.includes('publications')) {
        inSkillsSection = false;
        continue;
      }
      
      // Split the line by common separators and check each part
      const parts = line.split(/[,•|\/\\•·⋅◦‣⁃-]/);
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed && trimmed.length > 2) {
          // Check if this part contains any skill keywords
          if (TECHNICAL_SKILLS.some(skill => 
              trimmed.toLowerCase().includes(skill.toLowerCase()))) {
            skills.add(trimmed);
          }
        }
      }
    }
  }
  
  return Array.from(skills);
};

/**
 * Extracts job titles from resume text
 * @param {string} text - Resume text
 * @returns {Array} - Array of job titles
 */
const extractJobTitles = (text) => {
  const titles = new Set();
  const lowerText = text.toLowerCase();
  
  // Simple keyword matching
  JOB_TITLES.forEach(title => {
    if (lowerText.includes(title.toLowerCase())) {
      titles.add(title);
    }
  });
  
  // Look for job titles in the first few lines (often contains current position)
  const lines = text.split('\n').filter(line => line.trim() !== '');
  const firstFewLines = lines.slice(0, 5).join(' ').toLowerCase();
  
  for (const title of JOB_TITLES) {
    if (firstFewLines.includes(title.toLowerCase())) {
      // Try to get the full title with context
      const index = firstFewLines.indexOf(title.toLowerCase());
      const start = Math.max(0, index - 10);
      const end = Math.min(firstFewLines.length, index + title.length + 10);
      const context = firstFewLines.substring(start, end);
      
      // Extract a reasonable job title from context
      const words = context.split(' ');
      const titleIndex = words.findIndex(word => word.includes(title.split(' ')[0].toLowerCase()));
      if (titleIndex >= 0) {
        // Take up to 4 words as the job title
        const fullTitle = words.slice(titleIndex, titleIndex + 4).join(' ');
        titles.add(fullTitle);
      }
    }
  }
  
  return Array.from(titles);
};

/**
 * Extracts education information from resume text
 * @param {string} text - Resume text
 * @returns {Array} - Array of education items
 */
const extractEducation = (text) => {
  const education = new Set();
  
  // Find education section
  const lines = text.split('\n');
  let inEducationSection = false;
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Check if this line is an education section header
    if (lowerLine.includes('education') || lowerLine.includes('academic')) {
      inEducationSection = true;
      continue;
    }
    
    // If we're in the education section, look for education keywords
    if (inEducationSection) {
      // Check if we've moved to a new section
      if (lowerLine.includes('experience') || lowerLine.includes('skills') || 
          lowerLine.includes('projects') || lowerLine.includes('publications')) {
        inEducationSection = false;
        continue;
      }
      
      // Check for education keywords
      if (EDUCATION_KEYWORDS.some(keyword => lowerLine.includes(keyword.toLowerCase()))) {
        education.add(line.trim());
      }
    }
  }
  
  return Array.from(education);
};

/**
 * Extracts years of experience from resume text
 * @param {string} text - Resume text
 * @returns {string} - Years of experience
 */
const extractExperience = (text) => {
  // Look for experience section
  const lines = text.split('\n');
  let experienceDates = [];
  
  // Find all date ranges in the text
  const dateRangeRegex = /(\b(19|20)\d{2}\b)\s*[-–—to]*\s*(\b(19|20)\d{2}\b|present|current|now)/gi;
  const matches = text.match(dateRangeRegex) || [];
  
  for (const match of matches) {
    const years = match.match(/\b(19|20)\d{2}\b/g) || [];
    if (years.length > 0) {
      experienceDates.push(...years.map(y => parseInt(y)));
    }
    
    // Handle "present" or "current"
    if (/present|current|now/i.test(match)) {
      experienceDates.push(new Date().getFullYear());
    }
  }
  
  // If we found dates, calculate experience
  if (experienceDates.length >= 2) {
    const sortedYears = experienceDates.sort();
    const earliestYear = sortedYears[0];
    const latestYear = sortedYears[sortedYears.length - 1];
    
    // Calculate experience based on the earliest and latest years
    return String(latestYear - earliestYear);
  }
  
  // Fallback to the original method
  const yearRegex = /(20\d{2}|19\d{2})/g;
  const years = text.match(yearRegex);
  
  if (years && years.length >= 2) {
    const sortedYears = years.map(Number).sort();
    const earliestYear = sortedYears[0];
    const latestYear = sortedYears[sortedYears.length - 1];
    const currentYear = new Date().getFullYear();
    
    return String(Math.min(latestYear, currentYear) - earliestYear);
  }
  
  return '1'; // Default to 1 year if we can't determine
};

/**
 * Extracts contact information from resume text
 * @param {string} text - Resume text
 * @returns {Object} - Contact information
 */
const extractContactInfo = (text) => {
  const contactInfo = {};
  
  // Extract email addresses
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  const emails = text.match(emailRegex) || [];
  if (emails.length > 0) {
    contactInfo.email = emails[0];
  }
  
  // Extract phone numbers
  const phoneRegex = /(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
  const phones = text.match(phoneRegex) || [];
  if (phones.length > 0) {
    contactInfo.phone = phones[0];
  }
  
  // Extract LinkedIn profiles
  const linkedinRegex = /linkedin\.com\/in\/[\w-]+/gi;
  const linkedin = text.match(linkedinRegex) || [];
  if (linkedin.length > 0) {
    contactInfo.linkedin = linkedin[0];
  }
  
  return contactInfo;
};

/**
 * Analyzes the extracted resume text to identify key information
 * @param {string} text - The extracted text from the resume
 * @returns {Object} - Extracted information including job position, skills, and experience
 */
export const analyzeResumeText = (text) => {
  if (!text || typeof text !== 'string') {
    console.error('Invalid text format for resume analysis:', text);
    return {
      jobPosition: 'Not specified',
      jobDesc: 'Not specified',
      jobExperience: '1'
    };
  }
  
  try {
    // Extract job titles
    const jobTitles = extractJobTitles(text);
    let jobPosition = jobTitles.length > 0 ? 
      jobTitles[0] : 
      text.split('\n').filter(line => line.trim() !== '').slice(0, 3).join(' ').substring(0, 100);
    
    // Extract skills
    const skills = extractSkills(text);
    
    // Extract education
    const education = extractEducation(text);
    
    // Extract years of experience
    const experience = extractExperience(text);
    
    // Extract contact information
    const contactInfo = extractContactInfo(text);
    
    return {
      jobPosition: jobPosition || 'Not specified',
      jobDesc: skills.join(', ') || 'Not specified',
      jobExperience: experience,
      skills: skills,
      education: education,
      contactInfo: contactInfo,
      allJobTitles: jobTitles
    };
  } catch (error) {
    console.error('Error analyzing resume text:', error);
    
    // Fallback to basic extraction
    try {
      const lines = text.split('\n').filter(line => line.trim() !== '');
      let jobPosition = lines.slice(0, 3).join(' ').substring(0, 100);
      
      // Extract skills (look for common skill section headers)
      const skillsRegex = /skills|technologies|technical skills|programming languages/i;
      const skillsIndex = lines.findIndex(line => skillsRegex.test(line));
      let skills = '';
      
      if (skillsIndex !== -1) {
        // Take up to 10 lines after the skills header
        skills = lines.slice(skillsIndex + 1, skillsIndex + 11).join(', ');
      }
      
      // Estimate years of experience (look for dates)
      const yearRegex = /(20\d{2}|19\d{2})/g;
      const years = text.match(yearRegex);
      let experience = '1'; // Default to 1 year
      
      if (years && years.length >= 2) {
        const sortedYears = years.map(Number).sort();
        const earliestYear = sortedYears[0];
        const latestYear = sortedYears[sortedYears.length - 1];
        const currentYear = new Date().getFullYear();
        
        // Calculate experience based on the earliest and latest years
        experience = String(Math.min(latestYear, currentYear) - earliestYear);
      }
      
      return {
        jobPosition: jobPosition || 'Not specified',
        jobDesc: skills || 'Not specified',
        jobExperience: experience
      };
    } catch (fallbackError) {
      console.error('Fallback extraction also failed:', fallbackError);
      return {
        jobPosition: 'Not specified',
        jobDesc: 'Not specified',
        jobExperience: '1'
      };
    }
  }
}; 