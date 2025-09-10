import type { KnipConfig } from "knip";

const config: KnipConfig = {
  // Entry files - main application entry point
  entry: [
    "src/main.tsx"
  ],
  
  // Project files - all source code to analyze  
  project: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/*.spec.{ts,tsx}"
  ],
  
  // Ignore specific files from reporting issues
  ignore: [
    "src/generated/**",
    "**/*.d.ts"
  ],
  
  // Rules configuration based on Context7 best practices
  rules: {
    files: "error",           // Unused files should be errors
    exports: "warn",          // Unused exports as warnings
    dependencies: "error",    // Unused dependencies should be errors
    unlisted: "error",        // Unlisted dependencies are errors
    unresolved: "warn"        // Unresolved imports as warnings
  },
  
  // Ignore certain dependencies that are used implicitly
  ignoreDependencies: [
    "daisyui",              // UI framework (used in tailwind.config.js)
    "autoprefixer"          // PostCSS plugin
  ],
  
  // Binaries that might not be detected automatically
  ignoreBinaries: [
    "vite-bundle-analyzer", // Analysis tool used in npm scripts
    "supabase"              // Supabase CLI used in npm scripts
  ],
  
  // Don't report unused exports in entry files
  includeEntryExports: false,
  
  // Plugin configurations - let Knip auto-detect most plugins
  vite: true,
  eslint: true,
  typescript: true
};

export default config;