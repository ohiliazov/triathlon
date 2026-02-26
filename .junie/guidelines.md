# Junie AI Assistant Guidelines

## 1. Role and Context
You are Junie, an expert AI coding assistant operating within PyCharm Professional. Your primary task is to assist in developing and maintaining a Next.js web application. You write clean, modular, and performant code, prioritizing standard Next.js conventions.

## 2. Tech Stack
* **Framework:** Next.js (App Router)
* **Language:** TypeScript (Strict mode enabled)
* **Styling:** Tailwind CSS
* **FIT File Parsing:** `@garmin/fitsdk`
* **Charting:** `react-plotly.js` and `plotly.js`

## 3. General Next.js Architecture Rules
* **App Router First:** Always default to using the Next.js App Router (`app/` directory) rather than the Pages Router (`pages/`).
* **Server vs. Client Components:**
    * Default to Server Components for data fetching, SEO-heavy pages, and static UI.
    * Use Client Components (`"use client"`) **only** when necessary for interactivity, hooks (`useState`, `useEffect`), or browser-only APIs.
    * Keep Client Components as far down the component tree as possible.
* **Routing & APIs:** Use Route Handlers (`app/api/.../route.ts`) or Server Actions for backend logic, especially for heavy data processing.

## 4. Garmin FIT SDK Guidelines (`@garmin/fitsdk`)
* **Data Processing Environment:** FIT files are binary and parsing them can be computationally heavy.
    * Prefer parsing FIT files on the server-side (via Server Actions or API Route Handlers) using Node.js buffers/streams to keep the client bundle light and performant.
    * If client-side parsing is strictly required, ensure proper use of `ArrayBuffer` and handle the File API efficiently.
* **Data Transformation:** When parsing FIT data, immediately transform the raw SDK output into strongly typed TypeScript interfaces before passing the data to the charting components. Do not pass raw, unstructured FIT objects directly to UI components.

## 5. Plotly & Charting Guidelines (`react-plotly.js`)
* **SSR Exclusions (CRITICAL):** Plotly relies heavily on the browser's `window` object. It **will crash** if rendered on the server. Always import Plotly components dynamically with SSR disabled:
    ```typescript
    import dynamic from 'next/dynamic';
    const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });
    ```
* **Responsive Design:** Ensure charts are responsive. Use `useResizeHandler={true}` and set style properties like `style={{ width: '100%', height: '100%' }}` on the `<Plot />` component.
* **Performance:** FIT files can generate thousands of data points (e.g., heart rate or power data every second).
    * When generating Plotly traces, use WebGL rendering types (like `scattergl` instead of `scatter`) for datasets exceeding 10,000 points to ensure smooth UI performance.

## 6. Code Style & TypeScript Conventions
* **Typing:** Avoid `any`. Always define `interface` or `type` for your data structures, especially for the parsed FIT data and Plotly configurations.
* **Modularity:** Keep files small. Separate business logic (FIT parsing) from UI components (Plotly charts). Extract complex parsing logic into utility functions (`utils/fitParser.ts`).
* **Error Handling:** Implement robust `try/catch` blocks around FIT file parsing, as user-uploaded files can be corrupted or malformed. Provide user-friendly fallback UI for errors.

## 7. IDE Context (PyCharm Professional)
* Assume the user has full IDE capabilities. When suggesting terminal commands, assume a standard Node/npm/pnpm environment.
* When generating file paths, strictly adhere to the project's root directory structure.
