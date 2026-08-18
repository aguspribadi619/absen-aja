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
import bcrypt
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


def serialize_business(biz: dict) -> dict:
    biz = dict(biz)
    biz["id"] = biz.pop("_id")
    biz.pop("owner_pin_hash", None)
    return biz


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
        "owner_phone": None,
        "owner_pin_hash": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.businesses.insert_one(business)
    return serialize_business(business)


@api_router.get("/businesses/{business_id}")
async def get_business(business_id: str):
    biz = await db.businesses.find_one({"_id": business_id})
    if not biz:
        raise HTTPException(status_code=404, detail="Usaha tidak ditemukan")
    return serialize_business(biz)


TOKEN_RE = re.compile(r"^[A-Z0-9]{4,20}$")


class TokenUpdate(BaseModel):
    token: str

    @field_validator("token")
    @classmethod
    def validate_token(cls, v: str) -> str:
        v = v.strip().upper()
        if not TOKEN_RE.match(v):
            raise ValueError("Token harus 4-20 karakter huruf/angka, tanpa spasi")
        return v


@api_router.patch("/businesses/{business_id}/token")
async def update_business_token(business_id: str, payload: TokenUpdate):
    biz = await db.businesses.find_one({"_id": business_id})
    if not biz:
        raise HTTPException(status_code=404, detail="Usaha tidak ditemukan")
    clash = await db.businesses.find_one({"token": payload.token, "_id": {"$ne": business_id}})
    if clash:
        raise HTTPException(status_code=409, detail="Token sudah dipakai usaha lain, coba token lain")
    now = datetime.now(timezone.utc).isoformat()
    await db.businesses.update_one({"_id": business_id}, {"$set": {"token": payload.token, "updated_at": now}})
    biz = await db.businesses.find_one({"_id": business_id})
    return serialize_business(biz)


PIN_RE = re.compile(r"^\S{4,20}$")


class OwnerCredentials(BaseModel):
    phone: str
    pin: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Nomor HP/Email wajib diisi")
        return v

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, v: str) -> str:
        if not PIN_RE.match(v or ""):
            raise ValueError("PIN harus 4-20 karakter tanpa spasi")
        return v


@api_router.patch("/businesses/{business_id}/owner-credentials")
async def set_owner_credentials(business_id: str, payload: OwnerCredentials):
    biz = await db.businesses.find_one({"_id": business_id})
    if not biz:
        raise HTTPException(status_code=404, detail="Usaha tidak ditemukan")
    clash = await db.businesses.find_one({"owner_phone": payload.phone, "_id": {"$ne": business_id}})
    if clash:
        raise HTTPException(status_code=409, detail="Nomor HP/Email ini sudah dipakai usaha lain")
    pin_hash = bcrypt.hashpw(payload.pin.encode(), bcrypt.gensalt()).decode()
    now = datetime.now(timezone.utc).isoformat()
    await db.businesses.update_one(
        {"_id": business_id},
        {"$set": {"owner_phone": payload.phone, "owner_pin_hash": pin_hash, "updated_at": now}},
    )
    biz = await db.businesses.find_one({"_id": business_id})
    return serialize_business(biz)


class OwnerLogin(BaseModel):
    identifier: str
    pin: str


@api_router.post("/owners/login")
async def owner_login(payload: OwnerLogin):
    generic_error = "Nomor HP/Email atau PIN salah"
    identifier = payload.identifier.strip()
    biz = await db.businesses.find_one({"owner_phone": identifier})
    if not biz or not biz.get("owner_pin_hash"):
        raise HTTPException(status_code=401, detail=generic_error)
    if not bcrypt.checkpw(payload.pin.encode(), biz["owner_pin_hash"].encode()):
        raise HTTPException(status_code=401, detail=generic_error)
    return serialize_business(biz)


def serialize_employee(emp: dict) -> dict:
    emp = dict(emp)
    emp["id"] = emp.pop("_id")
    emp.pop("pin_hash", None)
    return emp


class EmployeeCreate(BaseModel):
    name: str
    pin: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Nama karyawan wajib diisi")
        return v

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, v: str) -> str:
        if not PIN_RE.match(v or ""):
            raise ValueError("PIN harus 4-20 karakter tanpa spasi")
        return v


@api_router.get("/businesses/{business_id}/employees")
async def list_employees(business_id: str):
    biz = await db.businesses.find_one({"_id": business_id})
    if not biz:
        raise HTTPException(status_code=404, detail="Usaha tidak ditemukan")
    employees = await db.employees.find({"business_id": business_id}).sort("created_at", 1).to_list(1000)
    return [serialize_employee(e) for e in employees]


@api_router.post("/businesses/{business_id}/employees")
async def create_employee(business_id: str, payload: EmployeeCreate):
    biz = await db.businesses.find_one({"_id": business_id})
    if not biz:
        raise HTTPException(status_code=404, detail="Usaha tidak ditemukan")
    current_count = await db.employees.count_documents({"business_id": business_id})
    if current_count >= biz.get("employee_limit", EMPLOYEE_LIMIT_DEFAULT):
        raise HTTPException(status_code=409, detail=f"Sudah mencapai batas maksimal {biz.get('employee_limit', EMPLOYEE_LIMIT_DEFAULT)} karyawan")
    pin_hash = bcrypt.hashpw(payload.pin.encode(), bcrypt.gensalt()).decode()
    now = datetime.now(timezone.utc).isoformat()
    employee = {
        "_id": str(uuid.uuid4()),
        "business_id": business_id,
        "name": payload.name,
        "role": "karyawan",
        "pin_hash": pin_hash,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    await db.employees.insert_one(employee)
    return serialize_employee(employee)


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
