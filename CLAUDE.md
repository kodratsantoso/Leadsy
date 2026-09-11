# Leadsy — Aturan Operasional Wajib untuk AI Agent

Aturan ini WAJIB dipatuhi pada setiap sesi. Lihat juga `AGENTS.md` (UI governance & release checklist) dan `frontend/AGENTS.md`.

## 1. Protokol Pre-Flight Git (SELALU PULL DULU)

- Sebelum membaca, menganalisis, atau mengubah kode apa pun, jalankan:
  ```
  git fetch origin
  git pull origin <branch_aktif>
  ```
- Cek `git status`; pastikan working tree sinkron dengan commit terbaru tim.
- **DILARANG KERAS** force push (`git push -f` / `git push --force`).
- **DILARANG KERAS** `git rebase` yang merusak/menimpa commit anggota tim lain (termasuk commit master release dari `virtuenet-tech` / `rizub`).
- Conflict saat pull diselesaikan dengan merge aman tanpa menghilangkan perubahan upstream.

## 2. Perlindungan Database & Volume Persistence

- Database Leadsy adalah **Single Source of Truth** berisi data operasional riil (±1.073 leads, user tim, riwayat audit, pesan WhatsApp) di Persistent Volume (PV/PVC).
- **DILARANG KERAS:**
  1. `php artisan migrate:fresh`, `php artisan db:wipe`, atau truncate tabel.
  2. Menjalankan seeder sembarangan (`ProductionSeeder` / `DatabaseSeeder`) yang menimpa akun admin atau mereset tabel.
  3. Membuat database container baru yang kosong atau mengarahkan aplikasi ke DB yang tidak terhubung ke volume persisten.
  4. `docker compose down -v` (flag `-v` menghapus named volumes dan menghancurkan data).
- Selalu gunakan persistent volume yang sama saat bekerja lokal dengan Docker.
- Jangan mengubah nama database, nama volume, atau skema migration yang sudah berjalan tanpa persetujuan eksplisit.
- Migrasi skema baru WAJIB backward-compatible (hanya menambah kolom/tabel; tidak drop kolom/tabel berisi data operasional).

## 3. Standar Pengembangan Fitur & Release

- **Branching:** `virtuenet` = pengembangan/integrasi; `main` = produksi. Feature branch pendek boleh dibuat, pull terbaru dari `virtuenet` sebelum merge.
- **Validasi sebelum push:** linting & typecheck harus lulus (`npm run build` / lint, `cd frontend && npx tsc --noEmit`); syntax endpoint backend tervalidasi.
- Push ke kedua remote yang sudah dikonfigurasi: `origin` (Production) dan `leadsy-backup` (Backup) sesuai release checklist di `AGENTS.md`.
