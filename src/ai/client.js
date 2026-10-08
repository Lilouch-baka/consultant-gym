import Anthropic from '@anthropic-ai/sdk';

export const MODEL_OPTIONS = [
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (default, fast)' },
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (deepest, slower)' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (cheapest)' },
];
export const DEFAULT_MODEL = 'claude-sonnet-5-5';

// Models that accept server-side refusal fallbacks ("default" routing).
const FALLBACK_MODELS = new Set(['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1']);

export class MentorError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function mapError(e) {
  if (e instanceof MentorError) return e;
  if (e instanceof Anthropic.AuthenticationError) {
    return new MentorError('invalid_key', 'Your API key was rejected. Check it in Settings (it starts with sk-ant-).');
  }
  if (e instanceof Anthropic.PermissionDeniedError) {
    return new MentorError('permission', 'This API key is not allowed to use that model. Pick another model in Settings.');
  }
  if (e instanceof Anthropic.NotFoundError) {
    return new MentorError('model', 'Model not found. Check the model name in Settings.');
  }
  if (e instanceof Anthropic.RateLimitError) {
    return new MentorError('rate_limit', 'Rate limit reached. Wait a minute and try again.');
  }
  if (e instanceof Anthropic.BadRequestError) {
    const msg = e.error?.error?.message || e.message || '';
    if (/credit|balance|billing/i.test(msg)) return new MentorError('billing', 'Your Anthropic account has no credit left. Top up in the Anthropic console.');
    return new MentorError('bad_request', `The request was rejected: ${msg}`);
  }
  if (e instanceof Anthropic.APIConnectionError) {
    return new MentorError('offline', 'Could not reach the Anthropic API. Check your connection.');
  }
  if (e instanceof Anthropic.InternalServerError || (e instanceof Anthropic.APIError && (e.status === 529 || e.status >= 500))) {
    return new MentorError('overloaded', 'The API is busy right now. Try again in a moment.');
  }
  if (e instanceof Anthropic.APIError) {
    return new MentorError('api', `API error ${e.status ?? ''}: ${e.message}`);
  }
  return new MentorError('unknown', e?.message || 'Something went wrong.');
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        // fall through
      }
    }
    throw new MentorError('parse', 'The mentor replied in an unexpected format. Try again.');
  }
}

/**
 * Call the Messages API directly from the browser.
 * With `schema`, the reply is constrained to that JSON schema and returned parsed.
 */
export async function askClaude({ settings, system, messages, schema, maxTokens = 16000, effort = 'medium' }) {
  if (!settings.apiKey) throw new MentorError('no_key', 'Add your Anthropic API key in Settings to use the mentor.');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new MentorError('offline', 'You are offline. The mentor needs an internet connection; everything else works offline.');
  }

  const client = new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 });
  const model = settings.model || DEFAULT_MODEL;
  const output_config = { effort };
  if (schema) output_config.format = { type: 'json_schema', schema };
  const params = { model, max_tokens: maxTokens, system, messages, output_config };

  let res;
  try {
    if (FALLBACK_MODELS.has(model)) {
      try {
        res = await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
      } catch (e) {
        // If the account or model does not accept fallbacks, retry once without them.
        if (e instanceof Anthropic.BadRequestError) res = await client.messages.create(params);
        else throw e;
      }
    } else {
      res = await client.messages.create(params);
    }
  } catch (e) {
    throw mapError(e);
  }

  if (res.stop_reason === 'refusal') {
    throw new MentorError('refusal', 'The model declined this request. Rephrase it and try again.');
  }
  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  if (res.stop_reason === 'max_tokens' && schema) {
    throw new MentorError('truncated', 'The reply was cut off. Try again.');
  }
  return schema ? parseJson(text) : text;
}
