import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  outputFileTracingIncludes: { '/mcp': ['./public/chess-widget.html'], '/board': ['./public/chess-widget.html'] },
};
export default config;
