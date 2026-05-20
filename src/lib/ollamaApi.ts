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
        response_format: { type: 'json_object' },
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
