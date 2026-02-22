export interface GeneratePlanRequest {
  content: string;
  daysAvailable: number;
  minutesPerDay?: number;
}

export interface PlanResponse {
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
}

const API_TIMEOUT = 120000; // 2 minutes for AI processing
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // ms

/**
 * Call serverless function to generate study plan from extracted text
 * Includes timeout protection and basic retry logic for transient errors
 * 
 * @param request - Content, days available, and minutes per day
 * @returns Study plan with topics, schedule, flashcards, and quiz questions
 * @throws Error if plan generation fails
 */
export async function generateStudyPlan(
  request: GeneratePlanRequest,
  onRetry?: (attempt: number) => void
): Promise<PlanResponse> {
  const endpoint = import.meta.env.VITE_API_ENDPOINT || '/api/generate-plan';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        if (!response.ok) {
          try {
            const error = await response.json();
            throw new Error(error.details || error.error || 'Failed to generate study plan');
          } catch {
            throw new Error(`HTTP ${response.status}: Failed to generate study plan`);
          }
        }

        return response.json();
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES;
      const isTimeoutError = error instanceof Error && error.name === 'AbortError';
      const isNetworkError =
        error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('network'));

      // Retry on timeout or network errors, but not on abort from user
      const shouldRetry = !isLastAttempt && (isTimeoutError || isNetworkError);

      if (shouldRetry) {
        if (onRetry) {
          onRetry(attempt + 1);
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        continue;
      }

      // Final attempt failed
      throw new Error(
        isTimeoutError
          ? 'Study plan generation timed out. Please try with less content.'
          : error instanceof Error
            ? error.message
            : 'Failed to generate study plan'
      );
    }
  }

  throw new Error('Failed to generate study plan after multiple attempts');
}
