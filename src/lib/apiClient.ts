/**
 * Robust API Client with bulletproof JSON Parse Protection and HTML error page interception.
 * Prevents "Unexpected token < in JSON at position 0" and handles 429/503 status codes with clean user messages.
 */

export interface ChatApiResponse {
  text?: string;
  response?: string;
  model?: string;
  error?: string;
  system_sync?: any[];
}

export interface StoredApiKeys {
  geminiKey?: string;
  openAiKey?: string;
}

const STORAGE_KEY = 'examix_custom_api_keys';

export function getStoredApiKeys(): StoredApiKeys {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveStoredApiKeys(keys: StoredApiKeys): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch (err) {
    console.error('Failed to save API keys to localStorage', err);
  }
}

export function getApiHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const keys = getStoredApiKeys();
  const headers: Record<string, string> = { ...customHeaders };

  if (keys.geminiKey && keys.geminiKey.trim()) {
    headers['x-gemini-api-key'] = keys.geminiKey.trim();
  }
  if (keys.openAiKey && keys.openAiKey.trim()) {
    headers['x-openai-api-key'] = keys.openAiKey.trim();
  }

  return headers;
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  let response: Response;
  const mergedHeaders = getApiHeaders((init?.headers as Record<string, string>) || {});
  const mergedInit: RequestInit = {
    ...init,
    headers: mergedHeaders
  };

  try {
    response = await fetch(input, mergedInit);
  } catch (networkErr: any) {
    throw new Error(
      networkErr?.message?.includes('Failed to fetch')
        ? 'Network error: Unable to reach the Examix AI server. Please check your internet connection.'
        : `Network error: ${networkErr?.message || 'Connection failed'}`
    );
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let rawBodyText = '';
  try {
    rawBodyText = await response.text();
  } catch (readErr: any) {
    throw new Error(`Failed to read response stream: ${readErr?.message || 'Unknown error'}`);
  }

  // If status is not 2xx (e.g., 429, 500, 502, 503)
  if (!response.ok) {
    let extractedMessage = '';

    if (isJson) {
      try {
        const jsonError = JSON.parse(rawBodyText);
        extractedMessage = jsonError.error || jsonError.message || '';
      } catch {
        // Fallback if parsing fails
      }
    }

    if (!extractedMessage) {
      if (response.status === 429) {
        extractedMessage = 'AI model quota cooling down. Please wait 5 seconds and retry.';
      } else if (response.status === 503) {
        extractedMessage = 'AI servers are experiencing high demand. Retrying in a moment.';
      } else if (response.status === 502 || response.status === 504) {
        extractedMessage = 'Gateway timeout: The server took too long to generate a response. Please try again.';
      } else if (rawBodyText.trim().startsWith('<')) {
        extractedMessage = `Server error (${response.status}): The request could not be completed. Please try again.`;
      } else if (rawBodyText.length > 0 && rawBodyText.length < 180) {
        extractedMessage = rawBodyText.trim();
      } else {
        extractedMessage = `Server error ${response.status}. Please retry.`;
      }
    }

    throw new Error(extractedMessage);
  }

  // If status is 200 OK, but content is HTML (e.g. redirected or proxy response)
  if (rawBodyText.trim().startsWith('<') || rawBodyText.trim().startsWith('<!DOCTYPE')) {
    throw new Error('Received unexpected HTML response instead of JSON. Please reload or check server status.');
  }

  // Parse JSON body safely
  try {
    return JSON.parse(rawBodyText) as T;
  } catch (parseErr) {
    console.error('JSON parse error on text:', rawBodyText.substring(0, 300));
    throw new Error('Failed to parse response data. Please retry your request.');
  }
}
