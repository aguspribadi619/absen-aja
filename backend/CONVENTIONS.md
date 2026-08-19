# Backend Conventions — Absen Aja

## Tenant isolation (WAJIB dibaca sebelum nambah endpoint baru)

Kita pakai MongoDB, bukan Postgres — jadi tidak ada Row-Level Security
otomatis. Brief section 2 & 9 eksplisit bilang ini titik paling kritis:
isolasi data antar `business_id` **harus** ditegakkan manual di setiap
endpoint backend, jangan pernah percaya `business_id` yang datang dari
client (path param, body, atau query string), karena itu artinya siapa
pun yang tahu/nebak sebuah ID bisa baca/tulis data usaha orang lain.

### Pola: session token + dependency

1. Setiap login yang berhasil (owner via `/owners/login` atau
   `/businesses/{id}/owner-credentials`, karyawan via `/employees/login`)
   membuat baris di koleksi `sessions` lewat `create_session(business_id,
   employee_id=None)` dan mengembalikan tokennya ke client sebagai
   `{"token": ..., "business": {...}}` (owner) atau `{"token": ...,
   "business": {...}, "employee": {...}}` (karyawan). Sesi karyawan beda
   dari sesi owner HANYA dari ada/tidaknya field `employee_id` di
   dokumen `sessions` -- bukan koleksi terpisah.
2. Client menyimpan token itu (di sisi frontend: `expo-secure-store`,
   lihat `src/utils/session.ts`) dan mengirimnya lagi di setiap request
   ke endpoint yang butuh sesi lewat header `Authorization: Bearer <token>`.
3. Ada DUA dependency, pilih sesuai siapa yang boleh manggil endpointnya:

   ```python
   # Endpoint khusus OWNER (kelola karyawan, lihat semua absensi, dst).
   # Nolak (401) kalau sesinya sesi karyawan (punya employee_id) --
   # karyawan gak boleh pakai token-nya sendiri buat manggil endpoint ini.
   business_id: str = Depends(get_current_business_id)

   # Endpoint khusus KARYAWAN (absen, riwayat/data milik sendiri).
   # Nolak (401) kalau sesinya sesi owner (gak punya employee_id).
   business_id, employee_id = Depends(get_current_employee)
   ```

   Keduanya resolve dari header `Authorization: Bearer <token>` ke
   koleksi `sessions`, raise `401` "Sesi tidak valid, silakan login
   ulang" kalau token gak ada/gak ketemu/salah jenis sesi.

   **Jangan** tulis ulang cek token secara manual di tiap endpoint --
   selalu lewat salah satu dependency ini supaya polanya konsisten dan
   gampang di-audit.

4. Endpoint TIDAK BOLEH menerima `business_id` (atau `employee_id`)
   sebagai path/body/query param kalau tujuannya buat nentuin data siapa
   yang diakses. Contoh yang benar (poin 6, `list_employees`/`create_employee`):

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

### Karyawan (diimplementasi poin 7, `POST /api/employees/login`)

Isolasi karyawan SATU LEVEL LEBIH SEMPIT dari owner: bukan cuma
"business_id yang mana", tapi juga "employee_id yang mana" -- seorang
karyawan cuma boleh lihat absensi/riwayat dirinya sendiri, bukan
karyawan lain di business yang sama. `get_current_employee()` balikin
tuple `(business_id, employee_id)` dari sesi -- endpoint karyawan (poin
8+: absen, riwayat) wajib scoping query-nya pakai KEDUANYA, bukan cuma
business_id, kalau data itu spesifik per-karyawan.

Login karyawan (Token Usaha + PIN, tanpa dropdown pilih nama -- aturan
keras section 9) nyari karyawan dengan nyoba `bcrypt.checkpw` PIN yang
dikirim ke `pin_hash` semua karyawan aktif di business itu satu-satu.
Ini KENAPA PIN karyawan harus unik dalam satu business -- `create_employee`
udah nolak (409) kalau PIN yang mau didaftarin sudah dipakai karyawan
lain yang masih aktif di business yang sama. Kalau nanti ada fitur
nonaktifkan karyawan, PIN karyawan yang dinonaktifkan otomatis "bebas"
dipakai ulang (karena pengecekan cuma against `is_active: true`).

### Keterbatasan yang disengaja (Phase 1)

- Token sesi **tidak expire**. Cukup buat MVP; kadaluarsa token jadi
  item Phase 2.
- Belum ada endpoint logout (belum ada tombol logout di UI juga).
  Kalau ditambah nanti: `DELETE /api/sessions` (hapus token dari
  koleksi `sessions`) + hapus token tersimpan di frontend.
