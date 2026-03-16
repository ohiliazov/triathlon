from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, File, HTTPException, UploadFile
from garmin_fit_sdk import Decoder, Stream

router = APIRouter()


def camel_to_snake(name: str) -> str:
    import re

    name = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", name).lower()


def normalize_message(msg: Dict[str, Any]) -> Dict[str, Any]:
    normalized = {}
    for k, v in msg.items():
        if isinstance(k, str):
            key = camel_to_snake(k)
        else:
            key = str(k)

        if isinstance(v, datetime):
            normalized[key] = v.isoformat()
        elif isinstance(v, list):
            normalized[key] = [
                x.isoformat() if isinstance(x, datetime) else x for x in v
            ]
        else:
            normalized[key] = v
    return normalized


@router.post("/upload")
async def upload_fit_file(file: UploadFile = File(...)):
    if not file.filename.endswith(".fit"):
        raise HTTPException(
            status_code=400, detail="Only .fit files are supported"
        )

    contents = await file.read()
    try:
        stream = Stream.from_byte_array(contents)
        decoder = Decoder(stream)
        messages, errors = decoder.read()

        if errors:
            # We can log errors but still try to process
            print(f"FIT decoding errors: {errors}")

        records_raw = messages.get("record_mesgs", [])
        laps_raw = messages.get("lap_mesgs", [])
        sessions_raw = messages.get("session_mesgs", [])

        records = []
        for m in records_raw:
            nm = normalize_message(m)
            if "timestamp" in nm:
                if "enhanced_speed" in nm:
                    nm["speed"] = nm["enhanced_speed"]
                if "enhanced_altitude" in nm:
                    nm["altitude"] = nm["enhanced_altitude"]
                records.append(nm)

        laps = []
        for m in laps_raw:
            nm = normalize_message(m)
            if "timestamp" in nm:
                if "enhanced_avg_speed" in nm:
                    nm["avg_speed"] = nm["enhanced_avg_speed"]
                if "enhanced_max_speed" in nm:
                    nm["max_speed"] = nm["enhanced_max_speed"]
                laps.append(nm)

        session = None
        if sessions_raw:
            session = normalize_message(sessions_raw[0])
            if "enhanced_avg_speed" in session:
                session["avg_speed"] = session["enhanced_avg_speed"]
            if "enhanced_max_speed" in session:
                session["max_speed"] = session["enhanced_max_speed"]

        return {"records": records, "laps": laps, "session": session}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
