from fastapi import FastAPI, APIRouter, HTTPException, Request, Header, Depends
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
import secrets
from datetime import datetime, timezone, timedelta
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


# --- Auth / tenant isolation ---------------------------------------------
# Section 2 & 9 dari brief: isolasi data antar business_id WAJIB ditegakkan
# di backend (Mongo gak punya RLS kayak Postgres). Pola: setiap login
# (owner ATAU karyawan) dapat token sesi opaque yang disimpan di koleksi
# `sessions` -> business_id (+ employee_id kalau yang login karyawan).
# Endpoint yang akses data karyawan/absensi TIDAK BOLEH menerima business_id
# dari path/body/query -- wajib lewat salah satu dependency di bawah, yang
# nolak (401) kalau token gak ada/gak valid. Detail & endpoint mana yang
# jadi pengecualian (bootstrap sebelum ada sesi) didokumentasikan di
# backend/CONVENTIONS.md.
async def create_session(business_id: str, employee_id: Optional[str] = None) -> str:
    token = secrets.token_urlsafe(32)
    doc = {
        "_id": token,
        "business_id": business_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if employee_id:
        doc["employee_id"] = employee_id
    await db.sessions.insert_one(doc)
    return token


async def _resolve_session(authorization: str) -> Optional[dict]:
    if not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        return None
    return await db.sessions.find_one({"_id": token})


# Owner-scoped: business_id dari sesi, TAPI nolak kalau sesinya sesi karyawan
# (punya employee_id) -- karyawan gak boleh pakai token sesinya sendiri buat
# manggil endpoint kelola-karyawan milik owner.
async def get_current_business_id(authorization: str = Header(default="")) -> str:
    invalid = HTTPException(status_code=401, detail="Sesi tidak valid, silakan login ulang")
    session = await _resolve_session(authorization)
    if not session or session.get("employee_id"):
        raise invalid
    return session["business_id"]


# Karyawan-scoped: butuh sesi yang punya employee_id (dari /employees/login).
# Dipakai endpoint absensi/riwayat nanti (poin 8+) supaya karyawan cuma bisa
# akses datanya sendiri, bukan data karyawan lain di business yang sama.
async def get_current_employee(authorization: str = Header(default="")) -> tuple[str, str]:
    invalid = HTTPException(status_code=401, detail="Sesi tidak valid, silakan login ulang")
    session = await _resolve_session(authorization)
    if not session or not session.get("employee_id"):
        raise invalid
    return session["business_id"], session["employee_id"]


# Logout -- kerja buat sesi owner MAUPUN karyawan (gak pakai kedua dependency di
# atas karena keduanya nolak salah satu jenis sesi). Idempotent: token yang gak
# ada/udah kehapus tetap balas 200, bukan error, karena hasil akhirnya sama
# (klien gak punya sesi valid lagi).
@api_router.delete("/sessions")
async def logout(authorization: str = Header(default="")):
    if authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        if token:
            await db.sessions.delete_one({"_id": token})
    return {"ok": True}


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


# Owner-scoped (business_id dari sesi, bukan path param) -- dipakai layar Profil
# Usaha, satu-satunya cara owner lihat lagi Token Usaha setelah signup. Beda dari
# GET /businesses/{business_id} di bawah yang publik/tanpa auth (dipakai pas
# konfirmasi-usaha, sebelum kredensial owner dibuat jadi belum ada sesi).
# HARUS didaftarkan sebelum /businesses/{business_id} -- kalau kebalik, "me" bakal
# ketangkep sebagai business_id oleh route path-param itu duluan.
@api_router.get("/businesses/me")
async def get_my_business(business_id: str = Depends(get_current_business_id)):
    biz = await db.businesses.find_one({"_id": business_id})
    if not biz:
        raise HTTPException(status_code=404, detail="Usaha tidak ditemukan")
    return serialize_business(biz)


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
    token = await create_session(business_id)
    return {"token": token, "business": serialize_business(biz)}


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
    token = await create_session(biz["_id"])
    return {"token": token, "business": serialize_business(biz)}


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


@api_router.get("/employees")
async def list_employees(business_id: str = Depends(get_current_business_id)):
    employees = await db.employees.find({"business_id": business_id}).sort("created_at", 1).to_list(1000)
    return [serialize_employee(e) for e in employees]


@api_router.post("/employees")
async def create_employee(payload: EmployeeCreate, business_id: str = Depends(get_current_business_id)):
    biz = await db.businesses.find_one({"_id": business_id})
    if not biz:
        raise HTTPException(status_code=404, detail="Usaha tidak ditemukan")
    current_count = await db.employees.count_documents({"business_id": business_id})
    if current_count >= biz.get("employee_limit", EMPLOYEE_LIMIT_DEFAULT):
        raise HTTPException(status_code=409, detail=f"Sudah mencapai batas maksimal {biz.get('employee_limit', EMPLOYEE_LIMIT_DEFAULT)} karyawan")
    # PIN harus unik dalam satu business -- Login Karyawan (poin 7) nyari
    # karyawan cuma dari Token Usaha + PIN (gak ada dropdown pilih nama),
    # jadi kalau dua karyawan boleh pakai PIN sama, sistem gak akan bisa
    # nentuin siapa yang login.
    siblings = await db.employees.find({"business_id": business_id, "is_active": True}).to_list(1000)
    for sib in siblings:
        if bcrypt.checkpw(payload.pin.encode(), sib["pin_hash"].encode()):
            raise HTTPException(status_code=409, detail="PIN ini sudah dipakai karyawan lain, pilih PIN lain")
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


class EmployeeLogin(BaseModel):
    token: str
    pin: str


@api_router.post("/employees/login")
async def employee_login(payload: EmployeeLogin):
    generic_error = "Token Usaha atau PIN salah"
    token = payload.token.strip().upper()
    biz = await db.businesses.find_one({"token": token})
    if not biz:
        raise HTTPException(status_code=401, detail=generic_error)
    employees = await db.employees.find({"business_id": biz["_id"], "is_active": True}).to_list(1000)
    matched = None
    for emp in employees:
        if bcrypt.checkpw(payload.pin.encode(), emp["pin_hash"].encode()):
            matched = emp
            break
    if not matched:
        raise HTTPException(status_code=401, detail=generic_error)
    session_token = await create_session(biz["_id"], employee_id=matched["_id"])
    return {"token": session_token, "business": serialize_business(biz), "employee": serialize_employee(matched)}


@api_router.get("/employees/me")
async def get_my_employee_info(current=Depends(get_current_employee)):
    business_id, employee_id = current
    emp = await db.employees.find_one({"_id": employee_id})
    biz = await db.businesses.find_one({"_id": business_id})
    if not emp or not biz:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    return {"employee": serialize_employee(emp), "business": serialize_business(biz)}


# Phase 1 belum ada pengaturan timezone per-business, jadi "hari ini" buat
# absensi diasumsikan WIB (UTC+7) buat semua business. Kalau ada business di
# WITA/WIT, batas hari absennya bakal sedikit meleset -- item follow-up kalau
# skala usaha di luar WIB beneran muncul.
WIB_OFFSET = timedelta(hours=7)


DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def wib_day_bounds_utc(date_str: str) -> tuple[str, str]:
    if not DATE_RE.match(date_str):
        raise HTTPException(status_code=422, detail="Format tanggal tidak valid, gunakan YYYY-MM-DD")
    try:
        y, m, d = (int(x) for x in date_str.split("-"))
        start_wib_naive = datetime(y, m, d)
    except ValueError:
        raise HTTPException(status_code=422, detail="Tanggal tidak valid")
    start_utc = start_wib_naive.replace(tzinfo=timezone.utc) - WIB_OFFSET
    end_utc = start_utc + timedelta(days=1)
    return start_utc.isoformat(), end_utc.isoformat()


def wib_today_bounds_utc() -> tuple[str, str]:
    now_wib = datetime.now(timezone.utc) + WIB_OFFSET
    return wib_day_bounds_utc(f"{now_wib.year:04d}-{now_wib.month:02d}-{now_wib.day:02d}")


@api_router.get("/attendance/today")
async def get_attendance_today(current=Depends(get_current_employee)):
    business_id, employee_id = current
    start_iso, end_iso = wib_today_bounds_utc()
    record = await db.attendance.find_one({
        "business_id": business_id,
        "employee_id": employee_id,
        "type": "masuk",
        "server_timestamp": {"$gte": start_iso, "$lt": end_iso},
    })
    return {"attended_today": bool(record)}


# Aturan denda Phase 1: satu tarif flat per menit terlambat, gak ada tier/
# kustomisasi per-owner (itu Phase 2, brief section 6). Angka ini gampang
# diubah nanti kalau ternyata gak sesuai kebutuhan pengguna.
PENALTY_PER_MINUTE_LATE = 1000


class AttendanceCreate(BaseModel):
    photo_data_uri: str
    client_timestamp: Optional[str] = None

    @field_validator("photo_data_uri")
    @classmethod
    def validate_photo(cls, v: str) -> str:
        if not v or not v.startswith("data:image/"):
            raise ValueError("Foto tidak valid")
        if len(v) > MAX_LOGO_BYTES:
            raise ValueError("Ukuran foto terlalu besar")
        return v


@api_router.post("/attendance")
async def create_attendance(payload: AttendanceCreate, current=Depends(get_current_employee)):
    business_id, employee_id = current
    biz = await db.businesses.find_one({"_id": business_id})
    if not biz:
        raise HTTPException(status_code=404, detail="Usaha tidak ditemukan")

    start_iso, end_iso = wib_today_bounds_utc()
    existing = await db.attendance.find_one({
        "business_id": business_id,
        "employee_id": employee_id,
        "type": "masuk",
        "server_timestamp": {"$gte": start_iso, "$lt": end_iso},
    })
    if existing:
        raise HTTPException(status_code=409, detail="Kamu sudah absen masuk hari ini")

    # Server timestamp dipakai buat hitung keterlambatan, bukan jam device
    # (aturan keras section 9) -- client_timestamp cuma disimpan buat referensi.
    now_utc = datetime.now(timezone.utc)
    now_wib = now_utc + WIB_OFFSET
    start_h, start_m = (int(x) for x in biz["work_start"].split(":"))
    scheduled_wib = now_wib.replace(hour=start_h, minute=start_m, second=0, microsecond=0)
    minutes_late = max(0, int((now_wib - scheduled_wib).total_seconds() // 60))
    penalty_amount = minutes_late * PENALTY_PER_MINUTE_LATE

    record = {
        "_id": str(uuid.uuid4()),
        "business_id": business_id,
        "employee_id": employee_id,
        "type": "masuk",
        "photo_data_uri": payload.photo_data_uri,
        "client_timestamp": payload.client_timestamp,
        "server_timestamp": now_utc.isoformat(),
        "minutes_late": minutes_late,
        "penalty_amount": penalty_amount,
        "synced": True,
    }
    await db.attendance.insert_one(record)
    return {
        "id": record["_id"],
        "server_timestamp": record["server_timestamp"],
        "minutes_late": minutes_late,
        "penalty_amount": penalty_amount,
        "status": "terlambat" if minutes_late > 0 else "tepat_waktu",
    }


@api_router.get("/dashboard/owner")
async def owner_dashboard(business_id: str = Depends(get_current_business_id)):
    biz = await db.businesses.find_one({"_id": business_id})
    if not biz:
        raise HTTPException(status_code=404, detail="Usaha tidak ditemukan")

    total_employees = await db.employees.count_documents({"business_id": business_id, "is_active": True})
    start_iso, end_iso = wib_today_bounds_utc()
    today_records = await db.attendance.find({
        "business_id": business_id,
        "type": "masuk",
        "server_timestamp": {"$gte": start_iso, "$lt": end_iso},
    }).to_list(1000)

    hadir = len(today_records)
    terlambat = sum(1 for r in today_records if r.get("minutes_late", 0) > 0)
    belum_absen = max(0, total_employees - hadir)
    total_denda = sum(r.get("penalty_amount", 0) for r in today_records)

    # Section "Aktivitas Terbaru" -- beberapa entri absen masuk paling baru hari
    # ini, join manual ke nama karyawan (Mongo gak punya JOIN kayak SQL).
    recent_sorted = sorted(today_records, key=lambda r: r["server_timestamp"], reverse=True)[:5]
    emp_ids = list({r["employee_id"] for r in recent_sorted})
    emp_names = {}
    if emp_ids:
        emps = await db.employees.find({"_id": {"$in": emp_ids}}).to_list(len(emp_ids))
        emp_names = {e["_id"]: e["name"] for e in emps}
    recent_activity = [
        {
            "employee_id": r["employee_id"],
            "employee_name": emp_names.get(r["employee_id"], "?"),
            "server_timestamp": r["server_timestamp"],
            "status": "terlambat" if r.get("minutes_late", 0) > 0 else "tepat_waktu",
        }
        for r in recent_sorted
    ]

    return {
        "business": serialize_business(biz),
        "hadir": hadir,
        "terlambat": terlambat,
        "belum_absen": belum_absen,
        "total_denda_hari_ini": total_denda,
        "recent_activity": recent_activity,
    }


# Poin 13: "list sederhana, belum perlu filter bulan" -- jadi cuma balikin
# record yang beneran ada, gak nyintesis baris "Tidak hadir" buat hari yang
# gak ada absensinya (itu butuh nyocokin ke work_days, di luar scope "sederhana").
@api_router.get("/attendance/me")
async def list_my_attendance(current=Depends(get_current_employee)):
    business_id, employee_id = current
    records = await db.attendance.find({
        "business_id": business_id,
        "employee_id": employee_id,
        "type": "masuk",
    }).sort("server_timestamp", -1).to_list(1000)
    return [
        {
            "id": r["_id"],
            "server_timestamp": r["server_timestamp"],
            "minutes_late": r.get("minutes_late", 0),
            "penalty_amount": r.get("penalty_amount", 0),
            "status": "terlambat" if r.get("minutes_late", 0) > 0 else "tepat_waktu",
        }
        for r in records
    ]


# Poin 4 (revisi Dashboard Owner): tile Absensi perlu bisa browse SATU tanggal
# lain (kemarin, dst), bukan cuma hari ini. Agregasi lintas banyak hari/export
# tetap Phase 2 ("Laporan Bulanan"), jadi endpoint ini sengaja dibatasi satu
# tanggal per request.
@api_router.get("/attendance/by-date")
async def list_attendance_by_date(date: str, business_id: str = Depends(get_current_business_id)):
    start_iso, end_iso = wib_day_bounds_utc(date)
    employees = await db.employees.find({"business_id": business_id, "is_active": True}).sort("created_at", 1).to_list(1000)
    records = await db.attendance.find({
        "business_id": business_id,
        "type": "masuk",
        "server_timestamp": {"$gte": start_iso, "$lt": end_iso},
    }).to_list(1000)
    record_by_employee = {r["employee_id"]: r for r in records}

    items = []
    for emp in employees:
        r = record_by_employee.get(emp["_id"])
        if r:
            items.append({
                "employee_id": emp["_id"],
                "employee_name": emp["name"],
                "status": "terlambat" if r.get("minutes_late", 0) > 0 else "tepat_waktu",
                "server_timestamp": r["server_timestamp"],
                "minutes_late": r.get("minutes_late", 0),
                "penalty_amount": r.get("penalty_amount", 0),
            })
        else:
            items.append({
                "employee_id": emp["_id"],
                "employee_name": emp["name"],
                "status": "belum_absen",
                "server_timestamp": None,
                "minutes_late": 0,
                "penalty_amount": 0,
            })

    return {
        "date": date,
        "items": items,
        "hadir": sum(1 for i in items if i["status"] != "belum_absen"),
        "terlambat": sum(1 for i in items if i["status"] == "terlambat"),
        "belum_absen": sum(1 for i in items if i["status"] == "belum_absen"),
        "total_denda": sum(i["penalty_amount"] for i in items),
    }


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
