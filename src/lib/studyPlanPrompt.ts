import type { GeneratePlanRequest } from './api.js';
import { MIN_MINUTES_PER_DAY, MAX_MINUTES_PER_DAY } from './studyPlanConstants.js';

const MAX_CONTENT_LENGTH = 15000;

export function buildStudyPlanPrompt(request: GeneratePlanRequest): string {
  const { content, daysAvailable, minutesPerDay } = request;
  return `You are an expert educational content analyst. Analyze the following study material and create a comprehensive study plan.

Days available to study: ${daysAvailable} (Day 1 is today. Day ${daysAvailable} is the last day before the test. The test itself is on day ${daysAvailable + 1} — do NOT schedule any lessons on or after day ${daysAvailable + 1}.)
Minutes per day (user suggested): ${minutesPerDay ?? 30}

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
- The schedule must only contain days 1 through ${daysAvailable} — never beyond day ${daysAvailable}
- Day ${daysAvailable} is the final study day (the day before the test): it must have NO new topics (newTopicIds must be empty) and must review ALL topic IDs in reviewTopicIds as a comprehensive final revision
- recommendedMinutesPerDay: AI-suggested optimal daily study time (${MIN_MINUTES_PER_DAY}-${MAX_MINUTES_PER_DAY} range), computed from content complexity and ${daysAvailable} days available. Independent of user input.

IMPORTANT: Respond ONLY with valid JSON, no markdown, no explanations.`;
}
