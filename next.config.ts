import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: { "/api/workspace": ["./db/migrations/0001_workspaces.sql"] },
  outputFileTracingExcludes: { "/*": ["./.data/**/*"] },
};

export default nextConfig;
