/**
 * client.ts — compatibility entry point.
 *
 * The transport now lives in ./http (client, errors, tokenManager). Existing
 * imports of `ApiError` / `httpRequest` / `basicAuthHeader` from here keep
 * working; new code should import from './http/*' directly.
 */
export { ApiError, isApiError, hasErrorCode } from './http/errors';
export type { ApiErrorKind, ApiErrorItem } from './http/errors';
export { httpRequest, basicAuthHeader } from './http/client';
export type { RequestOptions } from './http/client';

/**
 * Serialize a user-typed OTP for a request body.
 *
 * Sent as a digit STRING, never Number(): a JSON number cannot keep leading
 * zeros, so "045812" would reach the server as 45812 and always fail
 * verification (~1 in 10 OTPs start with 0). Single helper so login, signup
 * and payment OTPs stay consistent.
 */
export function otpValue(otp: string): string {
  return otp.replace(/\D/g, '');
}
