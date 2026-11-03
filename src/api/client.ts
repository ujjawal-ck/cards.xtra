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
