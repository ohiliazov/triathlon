# Triathlon Performance Analytics

This project is split into a **Next.js Frontend** and a **FastAPI Backend**.

## Project Structure

- `frontend/`: Next.js web application.
- `backend/`: FastAPI Python application for data processing and database.
- `package.json`: Main project configuration for frontend and common scripts.
- `pyproject.toml`: Python dependencies and backend configuration.

## Getting Started

### Prerequisites

- Node.js & npm
- Python 3.13+
- [uv](https://github.com/astral-sh/uv) (recommended) or pip

### Installation

1. Install frontend dependencies:
   ```bash
   npm install
   ```

2. Install backend dependencies:
   ```bash
   uv sync
   # or
   pip install -e .
   ```

### Running the Development Environment

You can run both the frontend and backend simultaneously using:

```bash
npm run dev
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

## Docker Support

You can run the entire stack (Frontend, Backend, and PostgreSQL database) using Docker Compose:

1. **Build and start the containers:**
   ```bash
   docker compose up --build
   ```

2. **Access the applications:**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API: [http://localhost:8000](http://localhost:8000)
   - API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

3. **Stop the containers:**
   ```bash
   docker compose down
   ```

## Sub-applications

- **FIT File Analyzer**: Processes Garmin/Wahoo .fit files for heart rate, pace, and power analysis.
- **Lab Test Analyzer**: Parses CPET laboratory Excel reports to calculate physiological thresholds (AT/RC) and metabolic efficiency.
- **Bike Fit**: (In Development)

## Testing & Validation

To run frontend tests:
```bash
npm test
```
