import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getProvider } from './_providers/index';
import { buildStudyPlanPrompt } from '../src/lib/studyPlanPrompt';
import { MIN_MINUTES_PER_DAY, MAX_MINUTES_PER_DAY } from '../src/lib/studyPlanConstants';

// Constants
const DAYS_MIN = 1;
const DAYS_MAX = 365;

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

/**
 * Enforce schedule constraints on the AI-generated plan:
 * - Remove any days beyond daysAvailable (test day and after)
 * - Make the last study day a full review with no new topics
 */
export function enforceScheduleConstraints(plan: PlanResponse, daysAvailable: number): PlanResponse {
  const filtered = plan.schedule.filter(day => day.dayNumber <= daysAvailable);

  const maxDayNumber = filtered.reduce((max, day) => Math.max(max, day.dayNumber), -Infinity);

  if (maxDayNumber === -Infinity) {
    return { ...plan, schedule: [] };
  }

  const allTopicIds = plan.topics.map(t => t.id);
  const schedule = filtered.map(day =>
    day.dayNumber === maxDayNumber
      ? { ...day, newTopicIds: [], reviewTopicIds: allTopicIds }
      : { ...day }
  );

  return { ...plan, schedule };
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

    const provider = getProvider();

    const prompt = buildStudyPlanPrompt({ content, daysAvailable, minutesPerDay });

    const text = await provider(prompt);

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

    // Enforce: no schedule entries beyond daysAvailable; last day is a full review
    planData = enforceScheduleConstraints(planData, daysAvailable);

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
