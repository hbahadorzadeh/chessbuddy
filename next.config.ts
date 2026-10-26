import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  outputFileTracingIncludes: { '/mcp': ['./public/chess-widget.html','./public/replay-widget.html'], '/board': ['./public/chess-widget.html'], '/replay': ['./public/replay-widget.html'] },
};
export default config;
