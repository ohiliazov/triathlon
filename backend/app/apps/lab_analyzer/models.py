from typing import Optional

from sqlmodel import Field

from backend.app.models.base import TimestampModel


class LabTest(TimestampModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    test_date: Optional[str] = None
    max_vo2: Optional[float] = None
    at_time: Optional[float] = None
    rc_time: Optional[float] = None
    raw_data_json: str = Field(default="{}")  # Store as string for simplicity
