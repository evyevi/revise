import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Constants
const MODEL_NAME = 'gemini-2.5-flash';
const MAX_CONTENT_LENGTH = 15000;
const DAYS_MIN = 1;
const DAYS_MAX = 365;
const MIN_MINUTES_PER_DAY = 5;
const MAX_MINUTES_PER_DAY = 480; // 8 hours

interface GeneratePlanRequest {
  content: string;
  daysAvailable: number;
  minutesPerDay?: number;
}

interface PlanResponse {
  topics: Array<{
    id: string;
    name: string;
    importance: 'high' | 'medium' | 'low';
    keyPoints: string[];
    estimatedMinutes: number;
  }>;
  schedule: Array<{
    dayNumber: number;
    newTopicIds: string[];
    reviewTopicIds: string[];
    estimatedMinutes: number;
  }>;
  flashcards: Array<{
    topicId: string;
    front: string;
    back: string;
  }>;
  quizQuestions: Array<{
    topicId: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>;
  recommendedMinutesPerDay: number;
}

const isPlanResponse = (value: unknown): value is PlanResponse => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    Array.isArray(record.topics) &&
    Array.isArray(record.schedule) &&
    Array.isArray(record.flashcards) &&
    Array.isArray(record.quizQuestions) &&
    typeof record.recommendedMinutesPerDay === 'number'
  );
};

const parsePlanResponse = (text: string): PlanResponse => {
  const parsed = JSON.parse(text) as unknown;
  if (!isPlanResponse(parsed)) {
    throw new Error('AI response did not contain required fields');
  }
  return parsed;
};

/**
 * Generate study plan using Gemini AI
 * POST /api/generate-plan
 * 
 * Request:
 * {
 *   "content": "Study material text",
 *   "daysAvailable": 7,
 *   "minutesPerDay": 30
 * }
 * 
 * Response: { topics, schedule, flashcards, quizQuestions }
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // TODO: SECURITY REVIEW - Restrict CORS to production domain(s) before deployment
  // Currently allows all origins which is acceptable for development but not production
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  // TODO: SECURITY REVIEW - Implement rate limiting to prevent API abuse
  // Consider using Vercel Edge Middleware or @upstash/ratelimit

  // Validate API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Missing GEMINI_API_KEY environment variable');
    res.status(500).json({
      error: 'Server configuration error',
      details: 'API key not configured',
    });
    return;
  }

  try {
    const { content, daysAvailable, minutesPerDay } = req.body as GeneratePlanRequest;

    // Input validation
    if (!content || typeof content !== 'string' || content.trim() === '') {
      res.status(400).json({ error: 'Missing required field: content (non-empty string)' });
      return;
    }

    if (!Number.isInteger(daysAvailable) || daysAvailable < DAYS_MIN || daysAvailable > DAYS_MAX) {
      res.status(400).json({
        error: `Invalid daysAvailable. Must be integer between ${DAYS_MIN} and ${DAYS_MAX}`,
      });
      return;
    }

    if (
      minutesPerDay !== undefined &&
      (typeof minutesPerDay !== 'number' || minutesPerDay < MIN_MINUTES_PER_DAY || minutesPerDay > MAX_MINUTES_PER_DAY)
    ) {
      res.status(400).json({
        error: `Invalid minutesPerDay. Must be number between ${MIN_MINUTES_PER_DAY} and ${MAX_MINUTES_PER_DAY}`,
      });
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    const prompt = `You are an expert educational content analyst. Analyze the following study material and create a comprehensive study plan.

Days available: ${daysAvailable}
Minutes per day (user suggested): ${minutesPerDay || 30}

Material:
${content.substring(0, MAX_CONTENT_LENGTH)}

Create a JSON response with this exact structure:
{
  "topics": [
    {
      "id": "topic-1",
      "name": "Topic name",
      "importance": "high",
      "keyPoints": ["key point 1", "key point 2"],
      "estimatedMinutes": 25
    }
  ],
  "schedule": [
    {
      "dayNumber": 1,
      "newTopicIds": ["topic-1"],
      "reviewTopicIds": [],
      "estimatedMinutes": 25
    }
  ],
  "flashcards": [
    {
      "topicId": "topic-1",
      "front": "Question?",
      "back": "Answer"
    }
  ],
  "quizQuestions": [
    {
      "topicId": "topic-1",
      "question": "What is X?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Because Y"
    }
  ],
  "recommendedMinutesPerDay": 35
}

Requirements:
- Create at least 5 topics from the material
- Use spaced repetition: review topics on days 1, 2, 5, 7
- Include 3-5 flashcards per topic
- Include 2-3 quiz questions per topic
- Importance: high (most critical), medium (important), low (supplementary)
- Estimated minutes should fit within daily limit
- recommendedMinutesPerDay: AI-suggested optimal daily study time (${MIN_MINUTES_PER_DAY}-${MAX_MINUTES_PER_DAY} range), computed from content complexity and ${daysAvailable} days available. Independent of user input.

IMPORTANT: Respond ONLY with valid JSON, no markdown, no explanations.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse JSON - improved error handling
    let planData: PlanResponse;

    try {
      // Try direct parse first
      planData = parsePlanResponse(text);
    } catch {
      // Fallback: extract JSON from potential markdown blocks
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI response did not contain valid JSON');
      }

      try {
        planData = parsePlanResponse(jsonMatch[0]);
      } catch (parseError) {
        throw new Error(`Invalid JSON structure: ${parseError instanceof Error ? parseError.message : 'parse error'}`);
      }
    }

    // Validate response has required fields
    if (
      !Array.isArray(planData.topics) ||
      !Array.isArray(planData.schedule) ||
      !Array.isArray(planData.flashcards) ||
      !Array.isArray(planData.quizQuestions) ||
      typeof planData.recommendedMinutesPerDay !== 'number'
    ) {
      throw new Error('Invalid response structure: missing required arrays or recommendedMinutesPerDay');
    }

    // Validate recommendedMinutesPerDay is within bounds
    if (planData.recommendedMinutesPerDay < MIN_MINUTES_PER_DAY || planData.recommendedMinutesPerDay > MAX_MINUTES_PER_DAY) {
      throw new Error(`recommendedMinutesPerDay out of range: must be ${MIN_MINUTES_PER_DAY}-${MAX_MINUTES_PER_DAY}`);
    }

    // TODO: SECURITY REVIEW - Consider sanitizing AI-generated text content
    // (flashcard front/back, quiz questions/options) to prevent content injection

    res.status(200).json(planData);
  } catch (error) {
    console.error('Error generating plan:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const details =
      process.env.NODE_ENV === 'development'
        ? message
        : 'Failed to generate study plan. Please try again.';

    res.status(500).json({
      error: 'Failed to generate study plan',
      details,
    });
  }
}
