# Leadsy UI Governance

This project rule extends `/root/AGENTS.md` and `/root/SSOT/standards/agent_rules_standard.md`;
it does not override native agent instructions. GitHub is canonical; long-lived branches are
`virtuenet` (development/integration) and `main` (production), and only a push to `main` deploys —
to the K3s cluster through a GitHub Actions in-cluster runner (see "Deployment contract" below).
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

---

## Deployment contract

Coolify is retired: there is no Coolify server, API, webhook, or GitHub App for this repository.
`coolify.json` and the Traefik/`coolify` network wiring in `docker-compose*.yml` are leftover
artifacts of that era; local compose is for developer workstations only and must never be used to
run production workloads.

- Application: Leadsy. Repository: `virtuenet-prasetia/leadsy`.
- Platform: the 3-node K3s cluster, deployed by GitHub Actions running on the org-scoped
  self-hosted in-cluster runners (`runs-on: [self-hosted, in-cluster, k3s]`).
- Workflow: `.github/workflows/ci.yml`. This is a bespoke in-cluster pipeline, **not** a caller of
  the org reusable workflow `virtuenet-prasetia/.github/.github/workflows/k3s-app-deploy.yml@main`.
- Triggers: push and pull_request on `main` and `virtuenet` run `test-backend` (PHP lint,
  composer install, Laravel unit tests) and `test-frontend` (Next.js build). The `deploy` job is
  gated to a push on `main` or a manual `workflow_dispatch` — a push to `virtuenet` never deploys,
  and there is no development namespace today. Treat that as a known gap.
- Images: built on the runner from `backend/Dockerfile.production` and
  `frontend/Dockerfile.production` and pushed to the in-cluster registry `10.43.110.114:5000` as
  `leadsy-backend:<commit sha>` and `leadsy-frontend:<commit sha>` (plus `:latest`).
- Namespace: `leadsy-prod`. The workflow rolls `deployment/leadsy-backend`, `deployment/leadsy-worker`,
  `deployment/leadsy-scheduler` (same backend image), and `deployment/leadsy` (frontend) with
  `kubectl apply` + `kubectl set image` + `kubectl rollout status`, then smoke-tests `https://leadsy.tech`
  (and verifies that `https://leadsy.virtuenet.space` redirects with HTTP 301 to `https://leadsy.tech`).
- Required secrets: the workflow references no GitHub repository secrets; the runner's in-cluster
  service account provides `docker` and `kubectl`. Runtime configuration is injected from
  Kubernetes Secrets/ConfigMaps in the namespace; the variable *names* are in `.env.example`
  (`APP_KEY`, `DB_*`, `REDIS_*`, `INTEGRATION_CREDENTIAL_KEY`, `INTEGRATION_CREDENTIAL_KEY_ID`,
  `WEBHOOK_SECRET`, `WHATSAPP_SIDECAR_URL`, `WHATSAPP_WEBHOOK_SECRET`, `LARK_*`, `AWS_*`,
  `MAIL_*`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`). Never print values.
- Runtime dependencies: PostgreSQL/MySQL per `DB_CONNECTION` on a persistent volume, Redis for
  cache and queues (the `worker` deployment), an S3-compatible bucket (`AWS_*`), the WhatsApp
  sidecar service, and the Lark Open API.
- Edge routing is Cloudflare (`leadsy.tech` -> `187.127.115.170`, with `leadsy.virtuenet.space`
  permanently 301-redirected to `https://leadsy.tech`) into the nginx
  `load-balancer` container on `vn-core-prod-02`, then a Kubernetes NodePort. The cluster has
  no cert-manager, so TLS terminates at the edge `load-balancer`.
- Ownership: GitHub team `virtuenet` (`virtuenet-prasetia/virtuenet`).

Deployment evidence is the Actions run URL, the image tag (commit SHA), `kubectl rollout status`
output for `leadsy-production`, and the public HTTPS check — an HTTP 200 alone is not evidence.
