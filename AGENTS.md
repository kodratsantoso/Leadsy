# Leadsy UI Governance

This project rule extends `/root/AGENTS.md` and `/root/SSOT/standards/agent_rules_standard.md`;
it does not override native agent instructions. GitHub is canonical, `virtuenet` deploys via
the development Coolify webhook, and `main` deploys through GitHub Actions and Coolify API.
Review the actual diff and user workflow before reporting completion.

This repository contains deprecated root-level UI mirrors and one active runtime frontend.

## Active UI Source of Truth

- All live UI work must land in `frontend/`.
- Treat root `app/`, `components/`, `lib/`, and `store/` as compatibility mirrors only.
- If a UI change is needed, update `frontend/` first and only mirror elsewhere when explicitly required.

## Governance Entry Points

- Primary governance rules: `frontend/AGENTS.md`
- Frontend SSOT summary: `frontend/docs/ssot.md`
- Frontend decision log: `frontend/docs/decisions.md`

## Non-Negotiable Rules

- Reuse shared primitives from `frontend/components/ui`.
- Do not introduce page-local visual systems.
- Do not use `alert()` or `window.confirm()` for runtime admin flows.
- Do not add hardcoded colors or inline styling except approved dynamic-safe progress/position values.
- Any new UI pattern must update the shared design system before page adoption.
- **MANDATORY**: Always run a TypeScript check (`cd frontend && npx tsc --noEmit`) and ensure there are no errors before ANY push to GitHub.

## Release Checklist for Improvements

For every **major improvement**, always complete the release hygiene tasks before closing the work:

- Run a TypeScript check (`cd frontend && npx tsc --noEmit`) and ensure it passes cleanly.
- Update all relevant documentation for specification, task tracking, implementation notes, README files, and affected modules.
- Refresh the deploy database migration/snapshot files so a fresh deploy carries the current database structure and records.
- Push to both GitHub repositories already configured for this project: Production and Backup.
- Summarize completed improvements in a `What's New` context in the README.
- Update application version metadata according to the improvement scope.

For every **small improvement**, always push the completed change to both GitHub repositories already configured for this project: Production and Backup.
**Note:** Even for small improvements, you MUST run a TypeScript check (`cd frontend && npx tsc --noEmit`) before pushing.

---

# Aturan Operasional Wajib (Mandatory Operational Rules)

Aturan berikut WAJIB dipatuhi oleh seluruh AI agent dan developer pada setiap sesi.

## 1. Protokol Pre-Flight Git (SELALU PULL DULU)

- Sebelum membaca, menganalisis, atau mengubah satu baris kode pun, WAJIB menjalankan:
  ```
  git fetch origin
  git pull origin <branch_aktif>
  ```
- Cek status repositori dengan `git status`. Pastikan working tree sinkron dengan commit terbaru dari tim.
- **DILARANG KERAS** melakukan force push (`git push -f` / `git push --force`).
- **DILARANG KERAS** melakukan `git rebase` yang merusak atau menimpa commit milik anggota tim lain (termasuk commit master release dari `virtuenet-tech` / `rizub`).
- Jika terjadi conflict saat pull, selesaikan dengan merge secara aman tanpa menghilangkan perubahan upstream yang baru masuk.

## 2. Perlindungan Database & Volume Persistence

- **Database Single Source of Truth (SSOT):** Database Leadsy berisi data operasional riil (±1.073 leads, data user tim, riwayat audit, dan pesan WhatsApp) yang tersimpan permanen di Persistent Volume (PV/PVC).
- **DILARANG KERAS:**
  1. Menjalankan perintah perusak data: `php artisan migrate:fresh`, `php artisan db:wipe`, atau truncate tabel.
  2. Menjalankan seeder sembarangan (`ProductionSeeder` / `DatabaseSeeder`) yang menimpa akun admin atau mereset tabel ke kondisi kosong.
  3. Membuat database container baru yang kosong atau mengarahkan aplikasi ke DB baru yang tidak terhubung ke volume persisten.
  4. Menjalankan `docker compose down -v` (flag `-v` menghapus named volumes dan menghancurkan data lokal).
- **Konfigurasi Volume & Koneksi:**
  - Saat bekerja lokal dengan Docker, selalu gunakan persistent volume yang sama, terikat ke direktori storage/volume yang sudah ada.
  - Jangan pernah mengubah nama database, nama volume, atau skema migration yang sudah berjalan tanpa persetujuan eksplisit.
  - Setiap migrasi skema baru WAJIB backward-compatible (hanya menambah kolom/tabel baru; tidak drop kolom/tabel yang sudah berisi data operasional).

## 3. Standar Pengembangan Fitur & Release

- **Branching Contract:**
  - Branch pengembangan/integrasi: `virtuenet`
  - Branch produksi: `main`
  - Buat feature branch pendek jika diperlukan, lalu pull terbaru dari `virtuenet` sebelum merge.
- **Validasi Kode Sebelum Push:**
  - Pastikan linting dan typecheck lulus tanpa error (`npm run build` / lint, serta `cd frontend && npx tsc --noEmit`).
  - Pastikan syntax endpoint backend tervalidasi.
