// Vercel Function entry. vercel.json rewrites every path here as ?__path=.
import { createApp } from '../src/proxy.js';

const handle = createApp();

export const GET = (request) => handle(request);
export const POST = (request) => handle(request);
export const PUT = (request) => handle(request);
export const DELETE = (request) => handle(request);
