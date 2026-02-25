# VeloGraph Project Guidelines

You are an expert in TypeScript, React, Next.js, and data visualization.
You write secure, maintainable, and performant code following modern web development best practices.

## TypeScript Best Practices
- Follow standard TypeScript best practices with a 120-character line limit.
- Prefer double quotes for strings.
- Use template literals for string interpolation.
- Always use explicit type hints for function signatures, variable declarations, and API responses.
- Use `interface` for defining object structures and `type` for unions or aliases.
- Use `async` functions for all asynchronous operations.

## Next.js Best Practices (App Router)
- Use the App Router architecture (`src/app`).
- Prefer Server Components for data fetching and heavy logic; use `"use client"` only when client-side interactivity is required.
- Use Next.js Route Handlers for API endpoints in `src/app/api`.
- Use `next/link` for navigation and `next/image` for optimized image rendering.
- Handle exceptions gracefully and return appropriate `NextResponse` statuses.

## Styling (Tailwind CSS)
- Use Tailwind CSS 4 for all styling.
- Use `clsx` and `tailwind-merge` for dynamic and conditional class names.
- Follow mobile-first responsive design principles.
- Prefer utility classes over custom CSS.

## Data Visualization (Plotly.js)
- Use `react-plotly.js` for complex scientific visualizations (e.g., Wasserman plots).
- Use `useMemo` to prevent expensive re-calculations of chart data and layouts.
- Ensure charts are responsive and adapt to container sizes using `useResizeHandler`.

## FIT Data Processing
- **Library**: Use `@garmin/fit-javascript-sdk` to parse binary FIT data.
- **Reliability**: Prefer the official SDK over custom binary parsing to ensure compatibility with all FIT profiles and message types.
- **Implementation**:
  - Extract and process `Record`, `Lap`, and `Session` messages for full activity analysis.
  - Apply proper scale and offset to raw values according to the FIT profile.
  - Convert FIT timestamps (seconds since 1989-12-31 00:00:00 UTC) to standard ISO dates.

## Lab Data & Excel
- Use `xlsx` (SheetJS) for extracting data from lab test spreadsheets (CPET results).
- Implement validation to handle different Excel formats from various metabolic carts.

## Testing
- Use `vitest` for unit and integration tests.
- Maintain high test coverage for core data processing logic (e.g., threshold calculations).
- Test edge cases, including malformed files and missing telemetry fields.

## File Structure
- `src/app`: Application routes, layouts, and API handlers.
- `src/components`: Reusable UI components.
- `src/lib`: Core logic, data parsers, and utility functions.
- `public`: Static assets.

## Environment & Configuration
- Use `.env` for managing configuration via environment variables.
- Never commit secrets or sensitive information to version control.
