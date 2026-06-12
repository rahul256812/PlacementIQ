export interface ScreeningResult {
  score: number;
  feedback: {
    matchedKeywords: string[];
    missingKeywords: string[];
    summary: string;
  };
}

export function screenCandidate(
  studentProfile: {
    skills?: string | null;
    college?: string | null;
    branch?: string | null;
    projects?: string | null;
    experience?: string | null;
  },
  coverLetter: string,
  rawKeywords: string
): ScreeningResult {
  if (!rawKeywords || !rawKeywords.trim()) {
    return {
      score: 0,
      feedback: {
        matchedKeywords: [],
        missingKeywords: [],
        summary: "No screening keywords specified by the recruiter."
      }
    };
  }

  // Tokenize and clean keywords
  const cleanKeywords = rawKeywords
    .split(",")
    .map(kw => kw.trim().toLowerCase())
    .filter(kw => kw.length > 0);

  if (cleanKeywords.length === 0) {
    return {
      score: 0,
      feedback: {
        matchedKeywords: [],
        missingKeywords: [],
        summary: "No valid screening keywords found."
      }
    };
  }

  const skillsText = (studentProfile.skills || "").toLowerCase();
  const projectsText = (studentProfile.projects || "").toLowerCase();
  const experienceText = (studentProfile.experience || "").toLowerCase();
  const educationText = `${studentProfile.college || ""} ${studentProfile.branch || ""}`.toLowerCase();
  const coverText = (coverLetter || "").toLowerCase();

  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  // Weights for different sections
  const SKILL_WEIGHT = 0.45;
  const PROJECT_WEIGHT = 0.30;
  const EXP_WEIGHT = 0.15;
  const OTHER_WEIGHT = 0.10;

  let weightedScore = 0;

  for (const keyword of cleanKeywords) {
    let matchedInSection = false;
    let keywordScore = 0;

    // Check skills (highest value for exact matches)
    if (skillsText.includes(keyword)) {
      matchedInSection = true;
      keywordScore += SKILL_WEIGHT * 100;
    }

    // Check projects
    if (projectsText.includes(keyword)) {
      matchedInSection = true;
      keywordScore += PROJECT_WEIGHT * 100;
    }

    // Check work/internship experience
    if (experienceText.includes(keyword)) {
      matchedInSection = true;
      keywordScore += EXP_WEIGHT * 100;
    }

    // Check education and cover letter
    if (educationText.includes(keyword) || coverText.includes(keyword)) {
      matchedInSection = true;
      keywordScore += OTHER_WEIGHT * 100;
    }

    if (matchedInSection) {
      matchedKeywords.push(keyword);
      // Cap the score contribution for this keyword to 100%
      weightedScore += Math.min(100, keywordScore);
    } else {
      missingKeywords.push(keyword);
    }
  }

  // Calculate overall match score relative to all requested keywords
  const finalScore = cleanKeywords.length > 0 
    ? Math.round(weightedScore / cleanKeywords.length) 
    : 0;

  // Generate summary
  let summary = "";
  if (finalScore >= 80) {
    summary = `Excellent Match (${finalScore}%). Strong overlap in skills (${matchedKeywords.slice(0, 3).join(", ")}).`;
  } else if (finalScore >= 50) {
    summary = `Good Match (${finalScore}%). Matches some requirements but lacks: ${missingKeywords.slice(0, 2).join(", ")}.`;
  } else if (finalScore > 0) {
    summary = `Weak Match (${finalScore}%). Missing key requirements: ${missingKeywords.slice(0, 3).join(", ")}.`;
  } else {
    summary = "No Match (0%). Candidate profile does not match any specified screening keywords.";
  }

  return {
    score: finalScore,
    feedback: {
      matchedKeywords,
      missingKeywords,
      summary
    }
  };
}
