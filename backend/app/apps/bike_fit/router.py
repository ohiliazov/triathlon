from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def get_bike_fit():
    return {"message": "Bike fit analysis not implemented yet"}
