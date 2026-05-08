# LLM Provider Abstraction & Local LLM Support Implementation Plan

> **For Agent:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the hardcoded Gemini backend with a selectable provider system and add support for locally running LLMs via Ollama.

**Architecture:** Server-side providers (`gemini`, `openai`, `groq`, `anthropic`) are selected by the `LLM_PROVIDER` env var in `api/generate-plan.ts` via a provider factory. Each provider is a plain function `(prompt: string) => Promise<string>`. For local LLMs, `VITE_LLM_PROVIDER=ollama` makes the browser call Ollama's OpenAI-compatible API directly, bypassing the Vercel function entirely. A shared `buildStudyPlanPrompt` utility eliminates the prompt duplication between server and client paths.

**Tech Stack:** TypeScript, Vitest, native `fetch` (no new SDK dependencies for new providers), existing `@google/generative-ai` for Gemini, Ollama v1 API (OpenAI-compatible on port 11434), Vercel serverless functions.

---

### Task 1: Extract Gemini Provider Function

**Files:**
- Create: `api/providers/gemini.ts`
- Test: `api/__tests__/providers/gemini.test.ts`

The Gemini API call currently lives inline in the handler. Extract it to a named factory function so the handler becomes provider-agnostic. Also define the `LLMProvider` type here.

**Step 1: Write the failing test**

```typescript
// api/__tests__/providers/gemini.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleGenerativeAI } from '@google/generative-ai';

vi.mock('@google/generative-ai');

describe('createGeminiProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls Gemini with the prompt and returns the text response', async () => {
    const mockText = vi.fn().mockReturnValue('{"result":"ok"}');
    const mockGenerateContent = vi.fn().mockResolvedValue({ response: { text: mockText } });
    vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({ generateContent: mockGenerateContent }),
    }) as unknown as GoogleGenerativeAI);

    const { createGeminiProvider } = await import('../../providers/gemini');
    const provider = createGeminiProvider('fake-api-key');
    const result = await provider('Hello prompt');

    expect(mockGenerateContent).toHaveBeenCalledWith('Hello prompt');
    expect(result).toBe('{"result":"ok"}');
  });

  it('throws when Gemini returns an empty response', async () => {
    const mockText = vi.fn().mockReturnValue('');
    const mockGenerateContent = vi.fn().mockResolvedValue({ response: { text: mockText } });
    vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({ generateContent: mockGenerateContent }),
    }) as unknown as GoogleGenerativeAI);

    const { createGeminiProvider } = await import('../../providers/gemini');
    const provider = createGeminiProvider('fake-api-key');

    await expect(provider('prompt')).rejects.toThrow('Gemini returned empty response');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run api/__tests__/providers/gemini.test.ts
```
Expected: FAIL with "Cannot find module '../../providers/gemini'"

**Step 3: Write the Gemini provider**

```typescript
// api/providers/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL_NAME = 'gemini-2.5-flash';

export type LLMProvider = (prompt: string) => Promise<string>;

export function createGeminiProvider(apiKey: string): LLMProvider {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  return async (prompt: string): Promise<string> => {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    if (!text) {
      throw new Error('Gemini returned empty response');
    }
    return text;
  };
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run api/__tests__/providers/gemini.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add api/providers/gemini.ts api/__tests__/providers/gemini.test.ts
git commit -m "feat: extract Gemini provider function with LLMProvider interface"
```

---

### Task 2: Create Provider Factory and Wire into Handler

**Files:**
- Create: `api/providers/index.ts`
- Modify: `api/generate-plan.ts`
- Test: `api/__tests__/providers/index.test.ts`

The factory `getProvider()` reads `LLM_PROVIDER` from env and returns the appropriate `LLMProvider` function. The handler no longer imports `@google/generative-ai` directly.

**Step 1: Write the failing test**

```typescript
// api/__tests__/providers/index.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../providers/gemini', () => ({
  createGeminiProvider: vi.fn().mockReturnValue(async () => 'gemini response'),
}));

describe('getProvider', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.LLM_PROVIDER;
    delete process.env.GEMINI_API_KEY;
  });

  it('returns a function when LLM_PROVIDER=gemini and key is set', async () => {
    process.env.LLM_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'test-key';
    const { getProvider } = await import('../../providers/index');
    expect(typeof getProvider()).toBe('function');
  });

  it('defaults to gemini when LLM_PROVIDER is not set', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const { getProvider } = await import('../../providers/index');
    expect(typeof getProvider()).toBe('function');
  });

  it('throws when gemini is selected but GEMINI_API_KEY is missing', async () => {
    process.env.LLM_PROVIDER = 'gemini';
    const { getProvider } = await import('../../providers/index');
    expect(() => getProvider()).toThrow('GEMINI_API_KEY');
  });

  it('throws for an unknown provider name', async () => {
    process.env.LLM_PROVIDER = 'mystery-llm';
    const { getProvider } = await import('../../providers/index');
    expect(() => getProvider()).toThrow('Unknown LLM_PROVIDER');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run api/__tests__/providers/index.test.ts
```
Expected: FAIL with "Cannot find module '../../providers/index'"

**Step 3: Write the provider factory**

```typescript
// api/providers/index.ts
import { createGeminiProvider, type LLMProvider } from './gemini';

export type { LLMProvider };

export function getProvider(): LLMProvider {
  const name = process.env.LLM_PROVIDER ?? 'gemini';

  switch (name) {
    case 'gemini': {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is required');
      return createGeminiProvider(apiKey);
    }
    default:
      throw new Error(`Unknown LLM_PROVIDER: "${name}". Supported: gemini`);
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run api/__tests__/providers/index.test.ts
```
Expected: PASS

**Step 5: Update the handler to use getProvider**

In `api/generate-plan.ts`, make these changes:

- Remove: `import { GoogleGenerativeAI } from '@google/generative-ai';`
- Remove: `const MODEL_NAME = 'gemini-2.5-flash';`
- Add: `import { getProvider } from './providers/index';`
- Remove the block:
  ```typescript
  // Validate API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    ...
  }
  ```
- Remove the block inside the try:
  ```typescript
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  ...
  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  ```
- Replace it with:
  ```typescript
  const provider = getProvider();
  const text = await provider(prompt);
  ```

The `prompt` variable (the big template literal string) stays unchanged for now — Task 6 will move it.

**Step 6: Run all API tests**

```bash
npx vitest run api/
```
Expected: PASS (existing `enforceScheduleConstraints` tests pass, new provider tests pass)

**Step 7: Commit**

```bash
git add api/providers/index.ts api/generate-plan.ts api/__tests__/providers/index.test.ts
git commit -m "feat: wire provider factory into generate-plan handler"
```

---

### Task 3: Add OpenAI-Compatible Provider

Covers OpenAI GPT models, Groq, and any API that speaks OpenAI's chat completions format. Uses native `fetch` — no new npm dependency.

**Files:**
- Create: `api/providers/openai-compatible.ts`
- Modify: `api/providers/index.ts` (add `openai` and `groq` cases)
- Test: `api/__tests__/providers/openai-compatible.test.ts`

**Step 1: Write the failing tests**

```typescript
// api/__tests__/providers/openai-compatible.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('createOpenAICompatibleProvider', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('posts to the chat/completions endpoint with correct auth header', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"ok":true}' } }],
      }),
    });

    const { createOpenAICompatibleProvider } = await import('../../providers/openai-compatible');
    const provider = createOpenAICompatibleProvider({
      apiKey: 'sk-test',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    });

    const result = await provider('My prompt');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test',
          'Content-Type': 'application/json',
        }),
        body: expect.stringContaining('"My prompt"'),
      })
    );
    expect(result).toBe('{"ok":true}');
  });

  it('throws when the API returns a non-ok status', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Rate limited',
    });

    const { createOpenAICompatibleProvider } = await import('../../providers/openai-compatible');
    const provider = createOpenAICompatibleProvider({
      apiKey: 'sk-test',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    });

    await expect(provider('prompt')).rejects.toThrow('OpenAI API error 429');
  });

  it('throws when the response has no choices', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
    });

    const { createOpenAICompatibleProvider } = await import('../../providers/openai-compatible');
    const provider = createOpenAICompatibleProvider({
      apiKey: 'sk-test',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    });

    await expect(provider('prompt')).rejects.toThrow('No content in OpenAI response');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run api/__tests__/providers/openai-compatible.test.ts
```
Expected: FAIL with "Cannot find module '../../providers/openai-compatible'"

**Step 3: Write the OpenAI-compatible provider**

```typescript
// api/providers/openai-compatible.ts
import type { LLMProvider } from './index';

interface OpenAIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: { content: string | null };
  }>;
}

export function createOpenAICompatibleProvider(config: OpenAIConfig): LLMProvider {
  return async (prompt: string): Promise<string> => {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }
    return content;
  };
}
```

**Step 4: Register `openai` and `groq` in the provider factory**

In `api/providers/index.ts`:
- Add import: `import { createOpenAICompatibleProvider } from './openai-compatible';`
- Add to the switch (before `default`):

```typescript
case 'openai': {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY environment variable is required');
  return createOpenAICompatibleProvider({
    apiKey,
    baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  });
}
case 'groq': {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY environment variable is required');
  return createOpenAICompatibleProvider({
    apiKey,
    baseUrl: 'https://api.groq.com/openai/v1',
    model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
  });
}
```

- Update the default error message: `Supported: gemini, openai, groq, anthropic`

**Step 5: Run all provider tests**

```bash
npx vitest run api/__tests__/providers/
```
Expected: PASS

**Step 6: Commit**

```bash
git add api/providers/openai-compatible.ts api/providers/index.ts \
        api/__tests__/providers/openai-compatible.test.ts
git commit -m "feat: add OpenAI-compatible provider (openai, groq)"
```

---

### Task 4: Add Anthropic Provider

Uses the Anthropic Messages API via native `fetch`. Different auth header convention from OpenAI (`x-api-key` instead of `Authorization: Bearer`).

**Files:**
- Create: `api/providers/anthropic.ts`
- Modify: `api/providers/index.ts` (add `anthropic` case)
- Test: `api/__tests__/providers/anthropic.test.ts`

**Step 1: Write the failing tests**

```typescript
// api/__tests__/providers/anthropic.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('createAnthropicProvider', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('calls the Anthropic messages endpoint with correct headers', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: '{"answer":42}' }],
      }),
    });

    const { createAnthropicProvider } = await import('../../providers/anthropic');
    const provider = createAnthropicProvider({ apiKey: 'sk-ant-test', model: 'claude-3-5-haiku-20241022' });
    const result = await provider('My prompt');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'sk-ant-test',
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        }),
      })
    );
    expect(result).toBe('{"answer":42}');
  });

  it('throws when the API returns a non-ok status', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    const { createAnthropicProvider } = await import('../../providers/anthropic');
    const provider = createAnthropicProvider({ apiKey: 'bad', model: 'claude-3-5-haiku-20241022' });

    await expect(provider('prompt')).rejects.toThrow('Anthropic API error 401');
  });

  it('throws when the response has no text content block', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ content: [] }),
    });

    const { createAnthropicProvider } = await import('../../providers/anthropic');
    const provider = createAnthropicProvider({ apiKey: 'sk-ant-test', model: 'claude-3-5-haiku-20241022' });

    await expect(provider('prompt')).rejects.toThrow('No text content in Anthropic response');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run api/__tests__/providers/anthropic.test.ts
```
Expected: FAIL with "Cannot find module '../../providers/anthropic'"

**Step 3: Write the Anthropic provider**

```typescript
// api/providers/anthropic.ts
import type { LLMProvider } from './index';

interface AnthropicConfig {
  apiKey: string;
  model: string;
}

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
}

const ANTHROPIC_VERSION = '2023-06-01';
const MAX_TOKENS = 8192;

export function createAnthropicProvider(config: AnthropicConfig): LLMProvider {
  return async (prompt: string): Promise<string> => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as AnthropicResponse;
    const textBlock = data.content.find(block => block.type === 'text');
    if (!textBlock?.text) {
      throw new Error('No text content in Anthropic response');
    }
    return textBlock.text;
  };
}
```

**Step 4: Register `anthropic` in the provider factory**

In `api/providers/index.ts`:
- Add import: `import { createAnthropicProvider } from './anthropic';`
- Add to the switch (before `default`):

```typescript
case 'anthropic': {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is required');
  return createAnthropicProvider({
    apiKey,
    model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-haiku-20241022',
  });
}
```

**Step 5: Run all provider tests**

```bash
npx vitest run api/__tests__/providers/
```
Expected: PASS

**Step 6: Commit**

```bash
git add api/providers/anthropic.ts api/providers/index.ts \
        api/__tests__/providers/anthropic.test.ts
git commit -m "feat: add Anthropic provider"
```

---

### Task 5: Extract Shared Prompt Builder

The prompt string is currently hardcoded inline in `api/generate-plan.ts`. Moving it to `src/lib/studyPlanPrompt.ts` lets the Ollama client (browser-side) reuse it without duplication. Both `api/` and `src/` are TypeScript, and `api/` can import from `src/` using a relative path.

**Files:**
- Create: `src/lib/studyPlanPrompt.ts`
- Test: `src/lib/__tests__/studyPlanPrompt.test.ts`
- Modify: `api/generate-plan.ts` (replace inline prompt with import)

**Step 1: Write the failing test**

```typescript
// src/lib/__tests__/studyPlanPrompt.test.ts
import { describe, it, expect } from 'vitest';
import { buildStudyPlanPrompt } from '../studyPlanPrompt';

describe('buildStudyPlanPrompt', () => {
  it('includes daysAvailable and content in the prompt', () => {
    const prompt = buildStudyPlanPrompt({ content: 'Study material', daysAvailable: 7 });
    expect(prompt).toContain('7');
    expect(prompt).toContain('Study material');
  });

  it('truncates content to 15000 characters', () => {
    const longContent = 'x'.repeat(20000);
    const prompt = buildStudyPlanPrompt({ content: longContent, daysAvailable: 3 });
    // 15000 x's should appear, but 15001st should not
    expect(prompt).toContain('x'.repeat(15000));
    expect(prompt).not.toContain('x'.repeat(15001));
  });

  it('defaults minutesPerDay to 30 when not provided', () => {
    const prompt = buildStudyPlanPrompt({ content: 'material', daysAvailable: 5 });
    expect(prompt).toContain('30');
  });

  it('uses provided minutesPerDay', () => {
    const prompt = buildStudyPlanPrompt({ content: 'material', daysAvailable: 5, minutesPerDay: 45 });
    expect(prompt).toContain('45');
  });

  it('instructs the model to only schedule up to daysAvailable', () => {
    const prompt = buildStudyPlanPrompt({ content: 'x', daysAvailable: 10 });
    expect(prompt).toContain('days 1 through 10');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/studyPlanPrompt.test.ts
```
Expected: FAIL with "Cannot find module '../studyPlanPrompt'"

**Step 3: Write the shared prompt builder**

Extract the prompt from `api/generate-plan.ts` into this new file. Copy the exact prompt template — do not simplify it.

```typescript
// src/lib/studyPlanPrompt.ts
import type { GeneratePlanRequest } from './api';

const MAX_CONTENT_LENGTH = 15000;
const MIN_MINUTES_PER_DAY = 5;
const MAX_MINUTES_PER_DAY = 480;

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
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/__tests__/studyPlanPrompt.test.ts
```
Expected: PASS

**Step 5: Update api/generate-plan.ts to use the shared builder**

At the top of `api/generate-plan.ts`, add:
```typescript
import { buildStudyPlanPrompt } from '../src/lib/studyPlanPrompt';
```

Inside the handler, replace the large `const prompt = \`...\`` template literal with:
```typescript
const prompt = buildStudyPlanPrompt({ content, daysAvailable, minutesPerDay });
```

Also remove the now-unused constants `MAX_CONTENT_LENGTH`, `MIN_MINUTES_PER_DAY`, `MAX_MINUTES_PER_DAY` from `api/generate-plan.ts` if they're only used in prompt building (keep them if still used elsewhere for validation).

**Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

**Step 7: Run the full test suite**

```bash
npx vitest run
```
Expected: all tests PASS

**Step 8: Commit**

```bash
git add src/lib/studyPlanPrompt.ts src/lib/__tests__/studyPlanPrompt.test.ts api/generate-plan.ts
git commit -m "refactor: extract shared buildStudyPlanPrompt, remove prompt duplication"
```

---

### Task 6: Add Ollama Local LLM Support (Client-Side)

Ollama exposes an OpenAI-compatible API at `http://localhost:11434/v1`. When `VITE_LLM_PROVIDER=ollama`, `generateStudyPlan` in `src/lib/api.ts` calls Ollama directly from the browser — the Vercel function is not involved.

**Files:**
- Create: `src/lib/ollamaApi.ts`
- Modify: `src/lib/api.ts`
- Test: `src/lib/__tests__/ollamaApi.test.ts`

**Step 1: Write the failing tests for the Ollama client**

```typescript
// src/lib/__tests__/ollamaApi.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('callOllama', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('posts to /v1/chat/completions on the given baseUrl', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"topics":[]}' } }],
      }),
    });

    const { callOllama } = await import('../ollamaApi');
    const result = await callOllama({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.2',
      prompt: 'Generate a plan',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: expect.stringContaining('"llama3.2"'),
      })
    );
    expect(result).toBe('{"topics":[]}');
  });

  it('throws a helpful error when Ollama is not running', async () => {
    mockFetch.mockRejectedValue(new TypeError('fetch failed'));

    const { callOllama } = await import('../ollamaApi');

    await expect(
      callOllama({ baseUrl: 'http://localhost:11434', model: 'llama3.2', prompt: 'x' })
    ).rejects.toThrow('Cannot reach Ollama at http://localhost:11434');
  });

  it('throws when the response is non-ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'model not found',
    });

    const { callOllama } = await import('../ollamaApi');

    await expect(
      callOllama({ baseUrl: 'http://localhost:11434', model: 'llama3.2', prompt: 'x' })
    ).rejects.toThrow('Ollama error 404');
  });

  it('throws when the response content is empty', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: null } }] }),
    });

    const { callOllama } = await import('../ollamaApi');

    await expect(
      callOllama({ baseUrl: 'http://localhost:11434', model: 'llama3.2', prompt: 'x' })
    ).rejects.toThrow('Ollama returned empty response');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/ollamaApi.test.ts
```
Expected: FAIL with "Cannot find module '../ollamaApi'"

**Step 3: Write the Ollama client**

```typescript
// src/lib/ollamaApi.ts

interface OllamaOptions {
  baseUrl: string;
  model: string;
  prompt: string;
}

interface OllamaChatResponse {
  choices: Array<{
    message: { content: string | null };
  }>;
}

export async function callOllama({ baseUrl, model, prompt }: OllamaOptions): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch {
    throw new Error(
      `Cannot reach Ollama at ${baseUrl}. Is Ollama running? Try: ollama serve`
    );
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as OllamaChatResponse;
  const content = data.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Ollama returned empty response');
  }
  return content;
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/__tests__/ollamaApi.test.ts
```
Expected: PASS

**Step 5: Add the Ollama branch to generateStudyPlan**

In `src/lib/api.ts`, add these imports at the top:

```typescript
import { callOllama } from './ollamaApi';
import { buildStudyPlanPrompt } from './studyPlanPrompt';
```

Then, inside `generateStudyPlan`, add this block as the very first thing in the function body (before the `endpoint` declaration):

```typescript
// Local Ollama path — bypasses Vercel function, runs entirely in-browser
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
```

Note: `parsePlanResponse` is already defined in `api/generate-plan.ts` on the server side. You need to also define or re-export it in `src/lib/api.ts`. Check if it already exists there — if not, copy the implementation from `api/generate-plan.ts`:

```typescript
const parsePlanResponse = (text: string): PlanResponse => {
  // Strip markdown fences if the model wrapped the JSON
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
```

**Step 6: Run all tests**

```bash
npx vitest run
```
Expected: all tests PASS

**Step 7: Commit**

```bash
git add src/lib/ollamaApi.ts src/lib/api.ts src/lib/__tests__/ollamaApi.test.ts
git commit -m "feat: add Ollama local LLM support in browser client"
```

---

### Task 7: Update Environment Variable Documentation

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

**Step 1: Replace .env.example**

Replace the entire file content with:

```bash
# === Server-side LLM Provider (used by Vercel / vercel dev) ===
# Which AI provider to use. Options: gemini (default), openai, groq, anthropic
LLM_PROVIDER=gemini

# Gemini (default)
GEMINI_API_KEY=your_gemini_api_key_here

# OpenAI / any OpenAI-compatible API
# OPENAI_API_KEY=sk-...
# OPENAI_BASE_URL=https://api.openai.com/v1  # default; change for compatible APIs
# OPENAI_MODEL=gpt-4o-mini                   # default

# Groq (fast inference, free tier — https://console.groq.com)
# GROQ_API_KEY=gsk_...
# GROQ_MODEL=llama-3.3-70b-versatile         # default

# Anthropic
# ANTHROPIC_API_KEY=sk-ant-...
# ANTHROPIC_MODEL=claude-3-5-haiku-20241022  # default

# === Client-side Local LLM (Ollama, browser calls it directly) ===
# When set, the Vercel function is NOT used — Ollama is called from the browser.
# Install: https://ollama.com/download  |  Start: ollama serve && ollama pull llama3.2
# VITE_LLM_PROVIDER=ollama
# VITE_OLLAMA_BASE_URL=http://localhost:11434  # default
# VITE_OLLAMA_MODEL=llama3.2                   # default; any model you have pulled
```

**Step 2: Add a Provider Selection section to README.md**

Find the existing env var section (it contains `GEMINI_API_KEY`). Add the following block immediately after it:

```markdown
### LLM Provider Options

| Provider | Set in `.env.local` | Where to get a key |
|----------|--------------------|--------------------|
| **Gemini** (default) | `LLM_PROVIDER=gemini` + `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) |
| **OpenAI** | `LLM_PROVIDER=openai` + `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) |
| **Groq** (fast, free tier) | `LLM_PROVIDER=groq` + `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) |
| **Anthropic** | `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| **Ollama** (local, no key) | `VITE_LLM_PROVIDER=ollama` | [ollama.com](https://ollama.com) |

#### Using Ollama (fully offline, no API key)

1. Install Ollama: `brew install ollama` or [download](https://ollama.com/download)
2. Start it and pull a model:
   ```bash
   ollama serve
   ollama pull llama3.2
   ```
3. Add to `.env.local`:
   ```
   VITE_LLM_PROVIDER=ollama
   VITE_OLLAMA_MODEL=llama3.2
   ```
4. Run the dev server as normal: `npm run dev`

Ollama is called directly by the browser — no data leaves your machine and the Vercel function is not used.

> **Model quality note:** Local models (llama3.2, mistral, etc.) produce valid JSON less reliably than cloud APIs. If plan generation fails, try a larger model (`ollama pull llama3.1:70b`) or switch to a cloud provider.
```

**Step 3: Commit**

```bash
git add .env.example README.md
git commit -m "docs: document all LLM provider options and Ollama local setup"
```

---

### Final Verification

**Step 1: Run the full test suite one last time**

```bash
npx vitest run
```
Expected: all tests PASS, zero failures

**Step 2: Type-check the whole project**

```bash
npx tsc --noEmit
```
Expected: no errors

**Step 3: Lint**

```bash
npm run lint
```
Expected: no errors

**Step 4: Final commit if needed**

```bash
git add -A
git commit -m "chore: final cleanup after LLM provider abstraction"
```

---

## Summary of New Files

| File | Purpose |
|------|---------|
| `api/providers/gemini.ts` | Extracted Gemini provider function |
| `api/providers/openai-compatible.ts` | OpenAI / Groq / compatible APIs |
| `api/providers/anthropic.ts` | Anthropic Messages API |
| `api/providers/index.ts` | Factory: selects provider from `LLM_PROVIDER` env var |
| `src/lib/studyPlanPrompt.ts` | Shared prompt builder (no duplication) |
| `src/lib/ollamaApi.ts` | Browser-side Ollama client |

## Environment Variables Reference

| Variable | Where | Default | Description |
|----------|-------|---------|-------------|
| `LLM_PROVIDER` | server (`.env.local`) | `gemini` | Server-side provider |
| `GEMINI_API_KEY` | server | — | Required when `LLM_PROVIDER=gemini` |
| `OPENAI_API_KEY` | server | — | Required when `LLM_PROVIDER=openai` |
| `OPENAI_BASE_URL` | server | `https://api.openai.com/v1` | Override for compatible APIs |
| `OPENAI_MODEL` | server | `gpt-4o-mini` | Model name |
| `GROQ_API_KEY` | server | — | Required when `LLM_PROVIDER=groq` |
| `GROQ_MODEL` | server | `llama-3.3-70b-versatile` | Model name |
| `ANTHROPIC_API_KEY` | server | — | Required when `LLM_PROVIDER=anthropic` |
| `ANTHROPIC_MODEL` | server | `claude-3-5-haiku-20241022` | Model name |
| `VITE_LLM_PROVIDER` | client (`.env.local`) | _(unset)_ | Set to `ollama` for local LLMs |
| `VITE_OLLAMA_BASE_URL` | client | `http://localhost:11434` | Ollama server URL |
| `VITE_OLLAMA_MODEL` | client | `llama3.2` | Model that must be pulled locally |
