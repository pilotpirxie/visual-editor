import type { AppSettings, AssistantModel, ImageModel } from '../../app/appSettings';
import { isRecord } from '../../components/fields';

const API_URL = 'https://openrouter.ai/api/v1';
const APP_TITLE = 'Visual Editor';
const CALL_LIMIT_MS = 180_000;
const RETRY_DELAY_MS = 2_000;
const MAX_OUTPUT_TOKENS = 20_000;
const MIN_OUTPUT_TOKENS = 8_000;
const MIN_CONTEXT_TOKENS = 40_000;
const TOKENS_PER_MILLION = 1_000_000;
const DEFAULT_EFFORTS = ['low', 'medium', 'high'];
const JSON_FENCE = /^```(?:json)?\s*|\s*```$/g;
const IMAGE_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

const STATUS_KEY = 401;
const STATUS_CREDIT = 402;
const STATUS_TIMEOUT = 408;
const STATUS_RATE = 429;
const STATUS_SERVER = 500;

export type AssistantErrorKind =
  'key' | 'credit' | 'rate' | 'model' | 'network' | 'answer' | 'cancelled';

type ErrorDetails = { cause?: unknown; isTransient?: boolean };

export class AssistantError extends Error {
  readonly kind: AssistantErrorKind;
  readonly isTransient: boolean;

  constructor(kind: AssistantErrorKind, message: string, details: ErrorDetails = {}) {
    super(message, { cause: details.cause });
    this.name = 'AssistantError';
    this.kind = kind;
    this.isTransient = details.isTransient === true;
  }
}

export type Usage = { tokens: number; cost: number };

export type JsonSchema = { name: string; schema: Record<string, unknown> };

export type JsonRequest = {
  key: string;
  model: AssistantModel;
  effort: string | null;
  system: string;
  user: string;
  schema: JsonSchema | null;
};

export type JsonAnswer = { value: unknown; usage: Usage };

export type ImageRequest = { key: string; model: ImageModel; prompt: string; aspectRatio: string };

export type ImageAnswer = { dataUrl: string; usage: Usage };

type Reply = { status: number; body: unknown };

function strings(value: unknown): string[] {
  const found: string[] = [];
  if (!Array.isArray(value)) return found;
  for (const item of value) {
    if (typeof item === 'string') found.push(item);
  }
  return found;
}

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
}

function pricePerMillion(value: unknown): number | null {
  const perToken = finiteNumber(value);
  if (perToken === null || perToken < 0) return null;
  return perToken * TOKENS_PER_MILLION;
}

function effortsOf(model: Record<string, unknown>, parameters: readonly string[]): string[] {
  const reported = isRecord(model.reasoning) ? strings(model.reasoning.supported_efforts) : [];
  if (reported.length > 0) return reported;
  return parameters.includes('reasoning') ? DEFAULT_EFFORTS : [];
}

function modelFrom(value: unknown): AssistantModel | null {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id === '') return null;
  const parameters = strings(value.supported_parameters);
  const canUseSchema = parameters.includes('structured_outputs');
  if (!canUseSchema && !parameters.includes('response_format')) return null;
  const architecture = isRecord(value.architecture) ? value.architecture : {};
  if (!strings(architecture.output_modalities).includes('text')) return null;
  const pricing = isRecord(value.pricing) ? value.pricing : {};
  const provider = isRecord(value.top_provider) ? value.top_provider : {};
  const contextLength = finiteNumber(value.context_length);
  const maxOutputTokens = finiteNumber(provider.max_completion_tokens);
  if (contextLength !== null && contextLength < MIN_CONTEXT_TOKENS) return null;
  if (maxOutputTokens !== null && maxOutputTokens < MIN_OUTPUT_TOKENS) return null;
  return {
    id: value.id,
    name: typeof value.name === 'string' && value.name !== '' ? value.name : value.id,
    canUseSchema,
    efforts: effortsOf(value, parameters),
    contextLength,
    maxOutputTokens,
    promptPrice: pricePerMillion(pricing.prompt),
    completionPrice: pricePerMillion(pricing.completion),
  };
}

function serverMessage(body: unknown): string | null {
  if (!isRecord(body) || !isRecord(body.error)) return null;
  const { message } = body.error;
  return typeof message === 'string' && message !== '' ? message : null;
}

function errorForStatus(status: number, detail: string | null): AssistantError {
  if (status === STATUS_KEY) {
    return new AssistantError(
      'key',
      'OpenRouter did not accept the API key. Check it in App settings.',
    );
  } else if (status === STATUS_CREDIT) {
    return new AssistantError(
      'credit',
      'This OpenRouter key does not have enough credit for the request.',
    );
  } else if (status === STATUS_RATE) {
    return new AssistantError(
      'rate',
      'OpenRouter is limiting requests right now. Wait a moment and try again.',
      { isTransient: true },
    );
  } else if (status === STATUS_TIMEOUT) {
    return new AssistantError('network', 'OpenRouter took too long to answer. Try again.');
  } else {
    const reason = detail ?? `OpenRouter answered with status ${status}`;
    return new AssistantError('model', `The model could not answer: ${reason}`, {
      isTransient: status >= STATUS_SERVER,
    });
  }
}

async function send(path: string, init: RequestInit, signal: AbortSignal): Promise<Reply> {
  if (signal.aborted) throw new AssistantError('cancelled', 'Cancelled.');
  const limit = new AbortController();
  const timer = setTimeout(() => limit.abort(), CALL_LIMIT_MS);
  function cancel(): void {
    limit.abort();
  }
  signal.addEventListener('abort', cancel);
  let status: number;
  let text: string;
  try {
    const response = await fetch(`${API_URL}${path}`, { ...init, signal: limit.signal });
    status = response.status;
    text = await response.text();
  } catch (error) {
    if (signal.aborted) throw new AssistantError('cancelled', 'Cancelled.', { cause: error });
    if (limit.signal.aborted) {
      throw new AssistantError('network', 'OpenRouter took too long to answer. Try again.', {
        cause: error,
      });
    }
    throw new AssistantError(
      'network',
      'OpenRouter could not be reached. Check your connection and try again.',
      { cause: error },
    );
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
  }
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch (error) {
    console.warn(`OpenRouter ${path} answered with status ${status} and no JSON`, error);
  }
  return { status, body };
}

function headersFor(key: string): Record<string, string> {
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'X-Title': APP_TITLE,
  };
}

async function modelEntries(path: string, key: string, signal: AbortSignal): Promise<unknown[]> {
  const reply = await send(path, { headers: headersFor(key) }, signal);
  const isOk = reply.status >= 200 && reply.status < 300;
  if (!isOk) throw errorForStatus(reply.status, serverMessage(reply.body));
  if (!isRecord(reply.body) || !Array.isArray(reply.body.data)) {
    throw new AssistantError('answer', 'OpenRouter sent a model list that could not be read.');
  }
  return reply.body.data;
}

export async function listModels(key: string, signal: AbortSignal): Promise<AssistantModel[]> {
  const models: AssistantModel[] = [];
  for (const entry of await modelEntries('/models', key, signal)) {
    const model = modelFrom(entry);
    if (model !== null) models.push(model);
  }
  return models;
}

export async function listImageModels(key: string, signal: AbortSignal): Promise<ImageModel[]> {
  const models: ImageModel[] = [];
  for (const entry of await modelEntries('/models?output_modalities=image', key, signal)) {
    if (!isRecord(entry) || typeof entry.id !== 'string' || entry.id === '') continue;
    const architecture = isRecord(entry.architecture) ? entry.architecture : {};
    if (!strings(architecture.output_modalities).includes('image')) continue;
    const name = typeof entry.name === 'string' && entry.name !== '' ? entry.name : entry.id;
    models.push({ id: entry.id, name });
  }
  return models;
}

function requestBody(request: JsonRequest): Record<string, unknown> {
  const { model, effort, schema } = request;
  const body: Record<string, unknown> = {
    model: model.id,
    messages: [
      { role: 'system', content: request.system },
      { role: 'user', content: request.user },
    ],
  };
  if (schema !== null && model.canUseSchema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: { name: schema.name, strict: true, schema: schema.schema },
    };
    body.provider = { require_parameters: true };
  } else {
    body.response_format = { type: 'json_object' };
  }
  if (model.maxOutputTokens !== null) {
    body.max_tokens = Math.min(model.maxOutputTokens, MAX_OUTPUT_TOKENS);
  }
  if (effort !== null && model.efforts.includes(effort)) body.reasoning = { effort };
  return body;
}

function textOf(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  let text = '';
  for (const part of content) {
    if (isRecord(part) && typeof part.text === 'string') text += part.text;
  }
  return text;
}

const CLOSERS: Record<string, string> = { '{': '}', '[': ']' };

function withBalancedBrackets(json: string): string {
  const open: string[] = [];
  let balanced = '';
  let isInString = false;
  let isEscaped = false;
  for (const char of json) {
    if (isInString) {
      balanced += char;
      if (isEscaped) {
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === '"') {
        isInString = false;
      }
      continue;
    }
    const closer = CLOSERS[char];
    const isCloser = char === '}' || char === ']';
    if (isCloser && open.at(-1) !== char) continue;
    if (isCloser) open.pop();
    if (closer !== undefined) open.push(closer);
    if (char === '"') isInString = true;
    balanced += char;
  }
  return balanced + open.reverse().join('');
}

export function parseJsonAnswer(text: string): unknown {
  const unfenced = text.trim().replace(JSON_FENCE, '');
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new AssistantError(
      'answer',
      'The model did not answer in the expected format. Try again, or pick another model.',
      { isTransient: true },
    );
  }
  const json = unfenced.slice(start, end + 1);
  try {
    return JSON.parse(json);
  } catch (error) {
    console.warn('The model answer had a JSON mistake, so its brackets are balanced first', error);
  }
  try {
    return JSON.parse(withBalancedBrackets(json));
  } catch (error) {
    throw new AssistantError(
      'answer',
      'The model did not answer in the expected format. Try again, or pick another model.',
      { cause: error, isTransient: true },
    );
  }
}

function usageOf(body: Record<string, unknown>): Usage {
  const usage = isRecord(body.usage) ? body.usage : {};
  return {
    tokens: finiteNumber(usage.total_tokens) ?? 0,
    cost: finiteNumber(usage.cost) ?? 0,
  };
}

async function postForAnswer(
  path: string,
  key: string,
  payload: Record<string, unknown>,
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const reply = await send(
    path,
    { method: 'POST', headers: headersFor(key), body: JSON.stringify(payload) },
    signal,
  );
  const isOk = reply.status >= 200 && reply.status < 300;
  if (!isOk) throw errorForStatus(reply.status, serverMessage(reply.body));
  const { body } = reply;
  if (!isRecord(body)) {
    throw new AssistantError('answer', 'OpenRouter sent an answer that could not be read.');
  }
  if (isRecord(body.error)) {
    throw errorForStatus(finiteNumber(body.error.code) ?? 0, serverMessage(body));
  }
  return body;
}

async function askOnce(request: JsonRequest, signal: AbortSignal): Promise<JsonAnswer> {
  const payload = requestBody(request);
  const body = await postForAnswer('/chat/completions', request.key, payload, signal);
  const choice: unknown = Array.isArray(body.choices) ? body.choices[0] : undefined;
  if (!isRecord(choice)) {
    throw new AssistantError('answer', 'The model sent an empty answer. Try again.', {
      isTransient: true,
    });
  }
  if (isRecord(choice.error)) {
    throw errorForStatus(finiteNumber(choice.error.code) ?? 0, serverMessage(choice));
  }
  if (choice.finish_reason === 'length') {
    throw new AssistantError(
      'model',
      'The model ran out of room before it finished. Pick a lower effort or another model.',
    );
  }
  const content = isRecord(choice.message) ? textOf(choice.message.content) : '';
  return { value: parseJsonAnswer(content), usage: usageOf(body) };
}

function pause(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    function cancel(): void {
      clearTimeout(timer);
      reject(new AssistantError('cancelled', 'Cancelled.'));
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve();
    }, RETRY_DELAY_MS);
    signal.addEventListener('abort', cancel, { once: true });
  });
}

async function withOneRetry<Answer>(
  askOnce: () => Promise<Answer>,
  signal: AbortSignal,
): Promise<Answer> {
  try {
    return await askOnce();
  } catch (error) {
    if (!(error instanceof AssistantError) || !error.isTransient) throw error;
    console.warn(`The assistant call failed (${error.kind}) and is tried once more`, error);
  }
  await pause(signal);
  return askOnce();
}

export function askForJson(request: JsonRequest, signal: AbortSignal): Promise<JsonAnswer> {
  return withOneRetry(() => askOnce(request, signal), signal);
}

export function askWith(
  setup: AppSettings,
  request: Pick<JsonRequest, 'system' | 'user' | 'schema'>,
  signal: AbortSignal,
): Promise<JsonAnswer> {
  if (setup.assistantModel === null) {
    return Promise.reject(new AssistantError('model', 'Pick a model in App settings first.'));
  }
  return askForJson(
    {
      key: setup.openRouterKey.trim(),
      model: setup.assistantModel,
      effort: setup.assistantEffort,
      ...request,
    },
    signal,
  );
}

async function imageOnce(request: ImageRequest, signal: AbortSignal): Promise<ImageAnswer> {
  const { model, prompt, aspectRatio } = request;
  const payload = { model: model.id, prompt, aspect_ratio: aspectRatio, n: 1 };
  const body = await postForAnswer('/images', request.key, payload, signal);
  const image: unknown = Array.isArray(body.data) ? body.data[0] : undefined;
  const data = isRecord(image) ? image.b64_json : undefined;
  const mediaType = isRecord(image) ? image.media_type : undefined;
  if (typeof data !== 'string' || !BASE64.test(data)) {
    throw new AssistantError('answer', 'The image model sent no image. Try again.', {
      isTransient: true,
    });
  }
  if (typeof mediaType !== 'string' || !IMAGE_MEDIA_TYPES.includes(mediaType)) {
    throw new AssistantError('answer', 'The image model sent a file type that cannot be used.');
  }
  return { dataUrl: `data:${mediaType};base64,${data}`, usage: usageOf(body) };
}

export function askForImage(request: ImageRequest, signal: AbortSignal): Promise<ImageAnswer> {
  return withOneRetry(() => imageOnce(request, signal), signal);
}
