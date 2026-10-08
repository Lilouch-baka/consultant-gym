import Anthropic from '@anthropic-ai/sdk';

export const MODEL = 'claude-sonnet-5-5';
// USD per million tokens.
export const PRICE = { input: 2, output: 10 };

export function costUsd(inputTokens, outputTokens) {
  return (inputTokens * PRICE.input + outputTokens * PRICE.output) / 1e6;
}

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
    return new MentorError('permission', `This API key is not allowed to use ${MODEL}.`);
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
  if (e instanceof Anthropic.APIError) {
    if (e.status === 529 || e.status >= 500) return new MentorError('overloaded', 'The API is busy right now. Try again in a moment.');
    return new MentorError('api', `API error ${e.status ?? ''}`);
  }
  return new MentorError('unknown', 'Something went wrong with the API call.');
}

/**
 * One small Messages API call from the browser.
 * Thinking is switched off (between_tools) and output is capped, so calls stay cheap.
 * With `schema`, the reply is constrained to that JSON schema and returned parsed.
 * Returns { result, usage: { input, output } }.
 */
export async function askClaude({ apiKey, system, content, schema, maxTokens = 300 }) {
  if (!apiKey) throw new MentorError('no_key', 'No API key saved. Add one in Settings, or self-grade.');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new MentorError('offline', 'You are offline. Self-grade this one; everything else works offline.');
  }

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 30000, logLevel: 'off' });
  const output_config = { effort: 'low' };
  if (schema) output_config.format = { type: 'json_schema', schema };

  let res;
  try {
    res = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      thinking: { type: 'between_tools' },
      output_config,
      system,
      messages: [{ role: 'user', content }],
    });
  } catch (e) {
    throw mapError(e);
  }

  const usage = {
    input: (res.usage?.input_tokens || 0) + (res.usage?.cache_creation_input_tokens || 0) + (res.usage?.cache_read_input_tokens || 0),
    output: res.usage?.output_tokens || 0,
  };
  if (res.stop_reason === 'refusal') throw Object.assign(new MentorError('refusal', 'The model declined this request.'), { usage });

  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  if (!schema) return { result: text, usage };
  try {
    return { result: JSON.parse(text), usage };
  } catch {
    throw Object.assign(new MentorError('parse', 'The reply was cut off or malformed.'), { usage });
  }
}
