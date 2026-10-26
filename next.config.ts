import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

// `next dev` writes to its own folder, so running `next build` while a dev server is up
// no longer overwrites the dev server's files (that clash crashed /favicon.ico with MODULE_NOT_FOUND).
export default function config(phase: string): NextConfig {
  return {
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  };
}
