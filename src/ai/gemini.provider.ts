import { LLMProvider } from './provider';
import { AgentRequest, AgentResponse, ToolCall } from './types';

let cachedWorkingModel: string | null = 'gemini-3.6-flash';

async function getBestModel(apiKey: string): Promise<string> {
  const customModel = localStorage.getItem('gemini_model')?.trim();
  if (customModel) return customModel;

  if (cachedWorkingModel) return cachedWorkingModel;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const availableModels: string[] = (data.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => m.name.replace(/^models\//, ''));

      // Filter out known discontinued/unavailable models (e.g. gemini-2.5-flash)
      const validModels = availableModels.filter(m => !m.includes('2.5'));

      // Priority list recommended by Google API
      const priority = [
        'gemini-3.6-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-1.5-flash-8b',
        'gemini-pro'
      ];

      for (const p of priority) {
        if (validModels.includes(p)) {
          cachedWorkingModel = p;
          return p;
        }
      }

      if (validModels.length > 0) {
        cachedWorkingModel = validModels[0];
        return validModels[0];
      }
    }
  } catch (err) {
    console.warn('Could not list models, fallback to default candidate:', err);
  }

  // Default fallback
  cachedWorkingModel = 'gemini-3.6-flash';
  return cachedWorkingModel;
}

export class GeminiProvider implements LLMProvider {
  name = 'GeminiProvider';

  async generate(request: AgentRequest): Promise<AgentResponse> {
    const apiKey = request.apiKey || localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      throw new Error('Chưa cấu hình Gemini API Key. Vui lòng nhập API Key trong phần Cài đặt.');
    }

    const modelName = await getBestModel(apiKey);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const contents = request.contents || (request.messages || []).map((m) => {
      const role = m.role === 'assistant' ? 'model' : 'user';
      const parts: any[] = [];
      if (m.content) {
        parts.push({ text: m.content });
      }
      return { role, parts };
    });

    const body: any = {
      contents,
      systemInstruction: request.systemInstruction ? {
        parts: [{ text: request.systemInstruction }],
      } : undefined,
    };

    if (request.tools && request.tools.length > 0) {
      body.tools = [
        {
          functionDeclarations: request.tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ];
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      cachedWorkingModel = null;
      throw new Error(errorJson.error?.message || `Lỗi từ Gemini API (${response.status})`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let textContent = '';
    const toolCalls: ToolCall[] = [];

    for (const part of parts) {
      if (part.text) {
        textContent += part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          name: part.functionCall.name,
          args: part.functionCall.args || {},
        });
      }
    }

    return {
      content: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      rawParts: parts,
    };
  }
}
