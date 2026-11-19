/**
 * apiMock — every story runs with NO real network.
 * The app's BFF base URL is set to https://storybook.invalid (see main.ts define),
 * and window.fetch is replaced here. A request matches a route by path substring.
 * Unmatched requests fail like a network error, so a missing fixture shows the
 * real error state instead of leaking a call.
 */
import { onlineManager } from '@tanstack/react-query';

export type ApiMode = 'ok' | 'loading' | 'error' | 'offline' | 'empty';
export interface ApiRoute { match: string; body?: unknown; status?: number; delayMs?: number }
export interface ApiParams { mode?: ApiMode; routes?: ApiRoute[] }

const realFetch: typeof fetch = globalThis.fetch.bind(globalThis);
export const STORYBOOK_API_HOST = 'https://storybook.invalid';

export function installApiMock({ mode = 'ok', routes = [] }: ApiParams = {}) {
  onlineManager.setOnline(mode !== 'offline');
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith(STORYBOOK_API_HOST)) {
      // Static assets (fonts, images bundled by Vite, remote card art) pass through.
      if (/\.(ttf|otf|png|jpe?g|webp|gif|svg|json|riv|lottie|mp4)(\?|$)/i.test(url) || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith(location.origin)) return realFetch(input as any, init);
      throw new TypeError(`[storybook] blocked network call to ${url}`);
    }
    if (mode === 'loading') return new Promise<Response>(() => {});
    if (mode === 'offline') throw new TypeError('Network request failed');
    if (mode === 'error') return json({ status: 'error', message: 'Something went wrong' }, 500);
    const route = routes.find((r) => url.includes(r.match));
    if (!route) throw new TypeError(`[storybook] no fixture for ${url}`);
    if (route.delayMs) await new Promise((r) => setTimeout(r, route.delayMs));
    return json(route.body ?? {}, route.status ?? 200);
  }) as typeof fetch;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
