# Absen Aja — Build Brief untuk Claude Code

Tagline: "Absensi Gak Pake Ribet."

Dokumen ini adalah versi terstruktur dari spec awal, disesuaikan supaya stack-nya konsisten dengan project [QRIS Aja](https://github.com/aguspribadi619/Qris-Aja) yang udah jalan, dan scope-nya dipecah biar gak overbuild di awal.

---

## 1. Prinsip Utama

- Owner cukup setup sekali. Karyawan cukup buka aplikasi dan tekan ABSEN.
- Jangan overengineer. Ini bukan HRIS enterprise — cukup jawab satu masalah: usaha kecil catat kehadiran karyawan dengan mudah.
- **Bangun bertahap.** Jangan mulai Phase 2 sebelum Phase 1 beneran runnable dan bisa dites manual.

---

## 2. Tech Stack (disesuaikan dari spec awal)

| Layer | Pilihan | Alasan |
|---|---|---|
| Frontend | React Native (Expo) | Sama seperti QRIS Aja — reuse pengalaman & tooling yang udah ada |
| Backend | FastAPI | Sama seperti QRIS Aja |
| Database | MongoDB | Sama seperti QRIS Aja, dideploy di Railway |
| Hosting backend | Railway | Sama seperti QRIS Aja |
| Distribusi | EAS Build → APK | Sama seperti QRIS Aja |
| Auth karyawan | Token Usaha + PIN (hashed) | Bukan dropdown — ini fix utama dari versi HTML lama |
| Isolasi data antar bisnis | Scoping `business_id` di setiap query API (bukan Postgres RLS, karena kita di Mongo) | Karena bukan Postgres, isolasi ditegakkan di layer API FastAPI, bukan di level DB policy — **ini WAJIB dicek di setiap endpoint, jangan andalkan frontend menyembunyikan data** |

> Catatan buat Claude Code: spec awal (dari ChatGPT) nyaranin Supabase/Postgres+RLS. Kita sengaja ganti ke Mongo+FastAPI supaya satu stack dipakai untuk dua aplikasi (QRIS Aja & Absen Aja), ngurangin beban maintenance. Konsekuensinya: keamanan multi-tenant HARUS diimplementasi manual di setiap endpoint (cek `business_id` yang login match dengan `business_id` resource yang diakses), bukan otomatis lewat DB policy. Ini titik paling kritis buat di-review manual, jangan cuma percaya kode yang di-generate.

---

## 3. Role

**OWNER**: bikin usaha, atur aturan absensi, tambah karyawan, lihat semua data, atur denda/lembur, atur kebijakan share WhatsApp.

**KARYAWAN**: login pakai Token Usaha + PIN, lihat dashboard sendiri, absen, lihat riwayat/denda/lembur sendiri. **Tidak boleh lihat data karyawan lain** — ini ditegakkan di backend, bukan cuma disembunyikan di UI.

---

## 4. Database Schema (MongoDB collections)

```
businesses
  _id, name, address, logo_url, token (unique), work_hours {start, end},
  work_days [], penalty_rules [], overtime_rate, wa_policy,
  trial_started_at, trial_ends_at, subscription_status, employee_limit,
  created_at, updated_at

employees
  _id, business_id, name, role, pin_hash, is_active,
  created_at, updated_at

shifts
  _id, business_id, name, start_time, end_time  // support lintas tengah malam

attendance
  _id, business_id, employee_id, type (masuk/pulang),
  photo_url, client_timestamp, server_timestamp,
  minutes_late, penalty_amount, location (optional, lat/lng/accuracy),
  synced (bool)  // buat offline queue nanti

overtime
  _id, business_id, employee_id, attendance_id, hours, amount, status (pending/approved/rejected)

subscriptions
  _id, business_id, plan, started_at, ends_at, status
```

---

## 5. PHASE 1 — MVP (fokus di sini dulu, direvisi sesuai mockup)

Ini yang harus jalan dan bisa dites manual sebelum lanjut ke phase berikutnya:

1. Setup project: Expo app + FastAPI backend + koneksi MongoDB di Railway
2. Layar splash/onboarding: pilihan "Buat Usaha" / "Sudah Punya Akun"
3. Owner: bikin usaha (nama, alamat, logo upload, jam masuk, jam pulang opsional, hari kerja) → dapet Token Usaha otomatis, boleh custom token
4. Layar konfirmasi "Usaha berhasil dibuat" — tampilkan token & max karyawan (20)
5. Login Owner: nomor HP/email + PIN, opsi "ingat saya" (session persist)
6. Owner: Tambah Karyawan (nama, PIN) — PIN di-hash sebelum disimpan. **Layar ini gak ada di mockup, tapi wajib ada — tanpa ini gak ada karyawan yang bisa login.**
7. Login Karyawan: Token Usaha + PIN, session tersimpan. **Juga belum ada di mockup, perlu didesain menyusul.**
8. Dashboard Karyawan: status hari ini (belum absen/sudah), tombol ABSEN MASUK
9. Kamera absen: ambil foto langsung (bukan galeri), overlay nama+usaha+tanggal+jam+status keterlambatan
10. Server hitung status tepat waktu/terlambat + **denda dasar** pakai satu aturan sederhana (tier custom masuk Phase 2)
11. Layar Bukti Absensi: foto + overlay info, tombol Share ke WA (opsional — bisa langsung tekan SELESAI)
12. Dashboard Owner: ringkasan hari ini (hadir/terlambat/belum absen, total denda hari ini), menu grid
13. Karyawan: lihat riwayat absensi sendiri (list sederhana, belum perlu filter bulan)

**Yang SENGAJA masih di-skip di Phase 1:** lembur+approval, laporan bulanan+export, trial-lock, aturan keterlambatan custom per-tier, kebijakan WA wajib/opsional (default opsional dulu), shift, offline sync, GPS.

---

## 6. PHASE 2 — Setelah Phase 1 dites dan jalan

- Denda keterlambatan (aturan bisa diatur owner) — **tambahkan opsi on/off**, jangan jadi default aktif, karena implikasi hukumnya beda-beda tiap usaha
- Lembur + approval owner
- Shift (termasuk shift lintas tengah malam)
- Share ke WhatsApp (opsional, pakai native Share, bukan klaim "terkirim otomatis")
- Trial 30 hari + kunci fitur setelah habis (data tidak dihapus)

## 7. PHASE 3 — Kalau sudah ada traksi nyata

- Offline-first sync
- Laporan bulanan + export
- GPS/geofencing (skema sudah disiapkan dari Phase 1, tinggal diaktifkan)
- Payment gateway (Midtrans/Xendit) buat subscription

---

## 8. UI Screens & Design Tokens (dari mockup)

**Warna:**
- Primary: biru vivid/navy (lihat `logo_absen_aja_vivid_blue.png`) — tombol utama, header, ikon
- Accent: oranye/gold — CTA sekunder (BUAT USAHA), badge trial, teks "Aja" di logo
- Status: hijau = tepat waktu/sukses, merah = terlambat, oranye = trial/warning, abu = tidak hadir/netral

**Aset logo** (taruh di `/assets/`):
- `logo_absen_aja_vivid_blue.png` — dipakai di atas background terang
- `logo_absen_aja_white.png` — dipakai di atas background biru gelap (splash screen)
- `Logo_Absen_Aja_tranparan2.png` — versi transparan, general-purpose (app icon, dsb)

**Urutan layar Phase 1** (sesuai poin section 5):
1. Splash (Buat Usaha / Sudah Punya Akun)
2. Buat Usaha (form)
3. Konfirmasi Usaha Dibuat (token)
4. Login Owner
5. Tambah Karyawan (owner) — *belum ada desain, ikutin pola form yang lain*
6. Login Karyawan (Token + PIN) — *belum ada desain, ikutin pola form yang lain*
7. Dashboard Karyawan
8. Kamera Absen Masuk
9. Bukti Absensi (siap share)
10. Dashboard Owner
11. Riwayat Absensi (Karyawan)

**Referensi buat Phase 2** (sudah ada desainnya di mockup, jangan dikerjain dulu): Laporan Absensi (Owner) dengan export Excel, Pengaturan (Owner) lengkap dengan toggle Denda Aktif/Lembur Aktif.

> Catatan buat Claude Code: layar Tambah Karyawan & Login Karyawan belum punya desain visual dari user — ikutin pola styling layar Login Owner & Buat Usaha (card putih rounded, label di atas input, tombol biru penuh lebar) supaya konsisten, tapi tunjukkan hasilnya ke user dulu sebelum dianggap final.

---

## 9. Aturan Keras (jangan dilanggar)

- Jangan pakai dropdown untuk login karyawan atau pilih usaha
- Jangan pakai galeri sebagai sumber foto absensi — harus kamera langsung
- PIN tidak boleh disimpan plain text
- Isolasi data antar business_id harus dicek di backend, bukan cuma disembunyikan di frontend
- Server timestamp dipakai untuk hitung keterlambatan, bukan jam device
- WhatsApp bukan database — semua data absensi tetap tersimpan di MongoDB terlepas dari apakah di-share ke WA atau tidak
- Semua teks aplikasi Bahasa Indonesia, pesan error pakai bahasa manusia (bukan "401 Unauthorized")

---

## 10. Sebelum Claude Code mulai coding

Minta Claude Code untuk:
1. Konfirmasi struktur folder (mono-repo: `/backend` FastAPI, `/app` Expo) atau repo terpisah — samain pola sama QRIS Aja kalau itu udah ada strukturnya
2. Setup koneksi Railway + MongoDB dulu, pastikan bisa connect sebelum nulis fitur
3. Baru mulai dari Phase 1 poin 1-2 (setup + owner bikin usaha), jangan loncat ke fitur lain
