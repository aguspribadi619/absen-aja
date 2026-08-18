# Backend Conventions — Absen Aja

## Tenant isolation (WAJIB dibaca sebelum nambah endpoint baru)

Kita pakai MongoDB, bukan Postgres — jadi tidak ada Row-Level Security
otomatis. Brief section 2 & 9 eksplisit bilang ini titik paling kritis:
isolasi data antar `business_id` **harus** ditegakkan manual di setiap
endpoint backend, jangan pernah percaya `business_id` yang datang dari
client (path param, body, atau query string), karena itu artinya siapa
pun yang tahu/nebak sebuah ID bisa baca/tulis data usaha orang lain.

### Pola: session token + dependency

1. Setiap login yang berhasil (owner sekarang, karyawan nanti di poin 7)
   membuat baris di koleksi `sessions`: `{_id: <token opaque>, business_id, created_at}`
   lewat `create_session(business_id)`, dan mengembalikannya ke client
   sebagai `{"token": ..., "business": {...}}`.
2. Client menyimpan token itu (di sisi frontend: `expo-secure-store`,
   lihat `src/utils/session.ts`) dan mengirimnya lagi di setiap request
   ke endpoint yang butuh sesi lewat header `Authorization: Bearer <token>`.
3. Endpoint yang mengakses data milik satu business (karyawan, absensi,
   lembur, dst) **wajib** punya parameter:

   ```python
   business_id: str = Depends(get_current_business_id)
   ```

   Dependency ini yang menerjemahkan token -> `business_id` dengan
   mem-verifikasi ke koleksi `sessions`. Kalau header `Authorization`
   gak ada, formatnya salah, atau tokennya gak ketemu di `sessions`,
   otomatis raise `401` dengan pesan "Sesi tidak valid, silakan login
   ulang" -- endpoint gak akan pernah kejalanin dengan business_id yang
   gak terverifikasi.

   **Jangan** tulis ulang cek token secara manual di tiap endpoint --
   selalu lewat dependency ini (atau turunannya, lihat catatan karyawan
   di bawah) supaya polanya konsisten dan gampang di-audit.

4. Endpoint TIDAK BOLEH menerima `business_id` sebagai path/body/query
   param kalau tujuannya buat nentuin data siapa yang diakses. Contoh
   yang benar (poin 6, `list_employees`/`create_employee`):

   ```python
   @api_router.get("/employees")
   async def list_employees(business_id: str = Depends(get_current_business_id)):
       ...
   ```

   Bukan `/businesses/{business_id}/employees` dengan `business_id`
   dari URL -- itu pola LAMA (sebelum poin ini) yang sudah di-retrofit.

### Pengecualian: endpoint bootstrap sebelum ada sesi

Beberapa endpoint terjadi **sebelum** owner punya sesi login sama sekali
(alur Buat Usaha -> Konfirmasi -> Setup Kredensial belum pernah lewat
`/owners/login`). Endpoint-endpoint ini masih dikunci oleh `business_id`
di URL, karena itu satu-satunya identitas yang ada di titik itu, mirip
threat model link reset-password: siapa pun yang pegang UUID business
(unguessable, 36 karakter) dianggap berhak di momen setup itu.

- `POST /api/businesses` — bikin usaha, belum ada apa-apa buat diautentikasi
- `GET /api/businesses/{id}` — dipanggil layar Konfirmasi Usaha sebelum kredensial ada
- `PATCH /api/businesses/{id}/token` — ubah token dari layar Konfirmasi (belum ada sesi)
- `PATCH /api/businesses/{id}/owner-credentials` — endpoint yang JUSTRU membuat sesi pertama kali

**Ini trade-off yang disadari, bukan celah yang kelewat.** Kalau nanti
mau diperketat (misal: setelah kredensial pernah di-set, wajib sesi buat
ubah token/kredensial lagi), itu penambahan scope yang perlu didiskusikan
dulu -- jangan diam-diam diubah.

### Karyawan (poin 7 dan seterusnya)

Login karyawan bakal butuh isolasi SATU LEVEL LEBIH SEMPIT dari owner:
bukan cuma "business_id yang mana", tapi juga "employee_id yang mana" --
seorang karyawan cuma boleh lihat absensi/riwayat dirinya sendiri, bukan
karyawan lain di business yang sama. Pola yang sama berlaku: sesi
karyawan simpan `{business_id, employee_id}`, dan endpoint karyawan pakai
dependency turunan (misal `get_current_employee() -> (business_id, employee_id)`)
yang juga menolak (401/403) kalau sesi gak valid ATAU employee_id di
data yang diakses gak cocok sama punya sesi.

### Keterbatasan yang disengaja (Phase 1)

- Token sesi **tidak expire**. Cukup buat MVP; kadaluarsa token jadi
  item Phase 2.
- Belum ada endpoint logout (belum ada tombol logout di UI juga).
  Kalau ditambah nanti: `DELETE /api/sessions` (hapus token dari
  koleksi `sessions`) + hapus token tersimpan di frontend.
