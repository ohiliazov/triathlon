from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.apps.bike_fit import router as bike_fit_router
from backend.app.apps.fit_analyzer import router as fit_analyzer_router
from backend.app.apps.lab_analyzer import router as lab_analyzer_router
from backend.app.database.core import create_db_and_tables

app = FastAPI(
    title="Triathlon API",
    description="API for Fit File, Lab Test, and Bike Fit Analysis",
)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(
    fit_analyzer_router.router,
    prefix="/api/fit-analyzer",
    tags=["Fit Analyzer"],
)
app.include_router(
    lab_analyzer_router.router,
    prefix="/api/lab-analyzer",
    tags=["Lab Analyzer"],
)
app.include_router(
    bike_fit_router.router, prefix="/api/bike-fit", tags=["Bike Fit"]
)


@app.get("/")
async def root():
    return {"message": "Welcome to the Triathlon API"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
