import { callOllama } from './ollamaApi';
import { buildStudyPlanPrompt } from './studyPlanPrompt';

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
  recommendedMinutesPerDay: number;
}

const API_TIMEOUT = 120000; // 2 minutes for AI processing
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // ms

const parsePlanResponse = (text: string): PlanResponse => {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const toParse = jsonMatch ? jsonMatch[0] : text;
  const parsed = JSON.parse(toParse) as unknown;
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray((parsed as Record<string, unknown>).topics) ||
    !Array.isArray((parsed as Record<string, unknown>).schedule) ||
    !Array.isArray((parsed as Record<string, unknown>).flashcards) ||
    !Array.isArray((parsed as Record<string, unknown>).quizQuestions) ||
    typeof (parsed as Record<string, unknown>).recommendedMinutesPerDay !== 'number'
  ) {
    throw new Error('AI response did not contain required fields');
  }
  return parsed as PlanResponse;
};

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
  const llmProvider = import.meta.env.VITE_LLM_PROVIDER as string | undefined;
  if (llmProvider === 'ollama') {
    const baseUrl =
      (import.meta.env.VITE_OLLAMA_BASE_URL as string | undefined) ?? 'http://localhost:11434';
    const model =
      (import.meta.env.VITE_OLLAMA_MODEL as string | undefined) ?? 'llama3.2';
    const prompt = buildStudyPlanPrompt(request);
    const text = await callOllama({ baseUrl, model, prompt });
    return parsePlanResponse(text);
  }

  const endpoint =
    (import.meta.env.VITE_API_ENDPOINT as string | undefined) ?? '/api/generate-plan';

  const parseErrorMessage = (data: unknown): string | null => {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const record = data as Record<string, unknown>;
    const details = record.details;
    const error = record.error;

    if (typeof details === 'string') {
      return details;
    }

    if (typeof error === 'string') {
      return error;
    }

    return null;
  };

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
            const errorData = (await response.json()) as unknown;
            const errorMessage = parseErrorMessage(errorData);
            if (errorMessage) {
              throw new Error(errorMessage);
            }
            throw new Error(`HTTP ${response.status}: Failed to generate study plan`);
          } catch {
            throw new Error(`HTTP ${response.status}: Failed to generate study plan`);
          }
        }

        const data = (await response.json()) as unknown;
        return data as PlanResponse;
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
