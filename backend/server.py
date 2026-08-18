from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, field_validator
from typing import List, Optional
import os
import re
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()


# Pydantic validation errors default to a technical {"detail": [{...}]} body.
# Brief section 9 wajib pesan error bahasa manusia, jadi diseragamkan jadi
# {"detail": "<pesan pertama>"} biar frontend bisa langsung tampilin ke user.
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    first = exc.errors()[0]
    msg = str(first.get("msg", "Data yang dikirim tidak valid"))
    msg = msg.removeprefix("Value error, ")
    return JSONResponse(status_code=422, content={"detail": msg})


api_router = APIRouter(prefix="/api")

VALID_WORK_DAYS = {"sen", "sel", "rab", "kam", "jum", "sab", "min"}
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
MAX_LOGO_BYTES = 3 * 1024 * 1024  # base64 string length cap (~3MB)
EMPLOYEE_LIMIT_DEFAULT = 20


@api_router.get("/")
async def root():
    return {"message": "Absen Aja API"}


@api_router.get("/health")
async def health():
    try:
        await db.command("ping")
    except Exception:
        raise HTTPException(status_code=503, detail="Koneksi database gagal")
    return {"status": "ok", "db": "connected"}


class BusinessCreate(BaseModel):
    name: str
    address: str
    logo_data_uri: Optional[str] = None
    work_start: str
    work_end: Optional[str] = None
    work_days: List[str]

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Nama usaha wajib diisi")
        return v

    @field_validator("address")
    @classmethod
    def validate_address(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Alamat wajib diisi")
        return v

    @field_validator("work_start")
    @classmethod
    def validate_work_start(cls, v: str) -> str:
        if not TIME_RE.match(v or ""):
            raise ValueError("Jam masuk tidak valid, gunakan format JJ:MM")
        return v

    @field_validator("work_end")
    @classmethod
    def validate_work_end(cls, v: Optional[str]) -> Optional[str]:
        if v and not TIME_RE.match(v):
            raise ValueError("Jam pulang tidak valid, gunakan format JJ:MM")
        return v

    @field_validator("work_days")
    @classmethod
    def validate_work_days(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("Pilih minimal satu hari kerja")
        invalid = set(v) - VALID_WORK_DAYS
        if invalid:
            raise ValueError(f"Hari kerja tidak dikenali: {', '.join(sorted(invalid))}")
        return v

    @field_validator("logo_data_uri")
    @classmethod
    def validate_logo(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not v.startswith("data:image/"):
            raise ValueError("Format logo tidak didukung")
        if len(v) > MAX_LOGO_BYTES:
            raise ValueError("Ukuran logo terlalu besar, pakai gambar yang lebih kecil")
        return v


async def generate_unique_token(name: str) -> str:
    first_word = re.split(r"\s+", name.strip())[0]
    base = re.sub(r"[^A-Za-z0-9]", "", first_word).upper()[:10] or "USAHA"
    n = 1
    while True:
        candidate = f"{base}{n:02d}"
        if not await db.businesses.find_one({"token": candidate}):
            return candidate
        n += 1


@api_router.post("/businesses")
async def create_business(payload: BusinessCreate):
    token = await generate_unique_token(payload.name)
    now = datetime.now(timezone.utc).isoformat()
    business = {
        "_id": str(uuid.uuid4()),
        "name": payload.name,
        "address": payload.address,
        "logo_data_uri": payload.logo_data_uri,
        "token": token,
        "work_start": payload.work_start,
        "work_end": payload.work_end,
        "work_days": payload.work_days,
        "employee_limit": EMPLOYEE_LIMIT_DEFAULT,
        "created_at": now,
        "updated_at": now,
    }
    await db.businesses.insert_one(business)
    business["id"] = business.pop("_id")
    return business


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
