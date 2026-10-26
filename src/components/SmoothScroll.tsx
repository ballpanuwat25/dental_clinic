'use client';

import { useEffect } from 'react';
import { mountSmooth } from '@/lib/smooth';

// Starts the page's smooth scroll (see lib/smooth.ts); it draws nothing.
export default function SmoothScroll() {
  useEffect(() => mountSmooth(), []);
  return null;
}
