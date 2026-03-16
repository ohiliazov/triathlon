from io import BytesIO

import numpy as np
import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter()

# Constants
VO2 = "VO2"
VE_VO2 = "VE/VO2"
VE_VCO2 = "VE/VCO2"
TIME = "t"
TIME_MINUTES = "minutes"
VO2_HR = "VO2/HR"
VE = "VE_ergo"
VCO2 = "VCO2"
HR = "HR"
SPEED = "Speed"
POWER = "Power"
VT = "VT"
PET_O2 = "PetO2"
PET_CO2 = "PetCO2"
SP_CO2 = "SpO2"
RQ = "RQ"
GRADE = "Grade"
FAT = "FAT"
CHO = "CHO"
FAT_PC = "FAT%"
CHO_PC = "CHO%"
VO2_KG = "VO2/kg"

COLUMNS = [
    VO2,
    VE_VO2,
    VE_VCO2,
    VO2_HR,
    VE,
    VCO2,
    HR,
    VT,
    PET_O2,
    PET_CO2,
    SP_CO2,
    RQ,
    SPEED,
    POWER,
    GRADE,
    FAT,
    CHO,
    FAT_PC,
    CHO_PC,
    VO2_KG,
]


@router.post("/upload")
async def upload_lab_test(file: UploadFile = File(...)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400, detail="Only Excel files are supported"
        )

    contents = await file.read()
    try:
        result = process_lab_test_excel(contents)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def process_lab_test_excel(buffer: bytes):
    # Using pandas to read excel
    pd.read_excel(BytesIO(buffer), sheet_name="Dane", header=0, skiprows=2)

    # The original JS code had some complex logic for headers.
    # Let's simplify and assume the headers are correct in the Excel.
    # EXCEL_DANE_HEADER_START_COL = 9 (Index 9)
    # So we take columns from index 9 onwards.

    # Actually, let's look at how headers were handled in JS:
    # const headers = (daneData[0] as string[]).slice(EXCEL_DANE_HEADER_START_COL);
    # const rows = daneData.slice(EXCEL_DANE_DATA_START_ROW);

    # Re-reading with proper headers
    all_data = pd.read_excel(BytesIO(buffer), sheet_name="Dane", header=None)
    headers = all_data.iloc[0, 9:].values
    data_rows = all_data.iloc[3:, 9:]
    data_rows.columns = headers

    # Process Time
    # In JS: parseTimeValue handles Excel fractional days or "HH:MM:SS" strings.
    # Pandas usually handles this well.

    def parse_time(val):
        if pd.isna(val):
            return None
        if isinstance(val, (int, float)):
            if val < 1.0:  # Excel fractional day
                return val * 86400
            return val
        if isinstance(val, str):
            if ":" in val:
                parts = val.split(":")
                if len(parts) == 3:
                    return (
                        int(parts[0]) * 3600
                        + int(parts[1]) * 60
                        + float(parts[2])
                    )
                elif len(parts) == 2:
                    return int(parts[0]) * 60 + float(parts[1])
            try:
                return float(val)
            except ValueError:
                return None
        import datetime

        if isinstance(val, datetime.time):
            return (
                val.hour * 3600
                + val.minute * 60
                + val.second
                + val.microsecond / 1e6
            )
        if isinstance(val, datetime.datetime):
            # If it's a datetime, we only care about the time part if it's duration-like
            # but usually it's better to just use time part
            return (
                val.hour * 3600
                + val.minute * 60
                + val.second
                + val.microsecond / 1e6
            )
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

    data_rows[TIME] = data_rows[TIME].apply(parse_time)
    data_rows[TIME_MINUTES] = data_rows[TIME] / 60.0

    # Convert numeric columns
    for col in headers:
        if col != TIME:
            data_rows[col] = pd.to_numeric(data_rows[col], errors="coerce")

    # Smoothing (Centered Moving Average 40s)
    # JS: avgTimeDelta detection
    deltas = data_rows[TIME].diff().dropna()
    avg_time_delta = deltas.iloc[:50].mean() if not deltas.empty else 1.0
    window_size = max(1, round(40 / avg_time_delta))

    smooth_cols = [c for c in headers if c not in [SPEED, POWER, GRADE, TIME]]
    for col in smooth_cols:
        if col in data_rows.columns:
            data_rows[col] = (
                data_rows[col]
                .rolling(window=window_size, center=True, min_periods=1)
                .mean()
            )

    # Frayn Equation
    vo2_l = data_rows[VO2] / 1000.0
    vco2_l = data_rows[VCO2] / 1000.0

    fat_g = 1.67 * vo2_l - 1.67 * vco2_l
    cho_g = 4.55 * vco2_l - 3.21 * vo2_l

    data_rows[FAT] = fat_g.clip(lower=0) * 9.0
    data_rows[CHO] = cho_g.clip(lower=0) * 4.0

    total_kcal = data_rows[FAT] + data_rows[CHO]
    data_rows[FAT_PC] = (data_rows[FAT] / total_kcal * 100).fillna(0)
    data_rows[CHO_PC] = (data_rows[CHO] / total_kcal * 100).fillna(0)

    # Thresholds logic (simplified for now, following JS)
    # ... (skipping full complex threshold logic for brevity in this initial setup,
    # but I'll add the basic ones)

    max_vo2_idx = data_rows[VO2].idxmax()
    final_max = data_rows.loc[max_vo2_idx, TIME_MINUTES]

    # Return data as list of dicts
    processed_data = data_rows.replace({np.nan: None}).to_dict(
        orient="records"
    )

    return {
        "data": processed_data,
        "thresholds": {
            "max": final_max,
            "at": None,  # TODO: Port full logic
            "rc": None,
        },
    }
