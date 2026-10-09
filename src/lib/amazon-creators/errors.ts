import type { CreatorsError } from './types';
const messages = {
  NOT_CONFIGURED: 'Amazon Creators credentials are not configured.',
  INVALID_VERSION: 'Amazon Creators credential version must be 3.1, 3.2 or 3.3.',
  INVALID_REQUEST: 'The Amazon catalog request is invalid.',
  AUTH_FAILED: 'Amazon Creators authentication is unavailable.',
  AUTH_COOLDOWN: 'Amazon Creators authentication is temporarily paused.',
  ACCESS_DENIED: 'Amazon Creators access is unavailable for this request.',
  RATE_LIMITED: 'Amazon Creators requests are temporarily paused.',
  DAILY_LIMIT: 'The configured daily Amazon catalog limit has been reached.',
  QUEUE_FULL: 'The Amazon catalog is busy. Please try again later.',
  REQUEST_FAILED: 'Amazon Creators is temporarily unavailable.',
  INVALID_RESPONSE: 'Amazon Creators returned an unexpected response.',
  ITEMS_NOT_FOUND: 'No matching Amazon products were returned.',
} as const;
export type FailureCode = keyof typeof messages;
export function failure(code: FailureCode): { success: false; error: CreatorsError } {
  return { success: false, error: { code, message: messages[code] } };
}
// Never expose provider bodies, URLs, credentials or exception text.
export function safeFailure(error: unknown) {
  const code = error instanceof Error && Object.hasOwn(messages, error.message)
    ? error.message as FailureCode : 'REQUEST_FAILED';
  return failure(code);
}
