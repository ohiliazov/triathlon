import os

from sqlmodel import Session, SQLModel, create_engine

# Import all models here to ensure they are registered in SQLModel.metadata

# from backend.app.apps.fit_analyzer.models import Activity # if exists later

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./triathlon.db")

engine = create_engine(DATABASE_URL, echo=True)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
