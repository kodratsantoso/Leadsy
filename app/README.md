# Deprecated Root UI Tree

This root `app/` directory is a legacy duplicate of the real frontend.

Active UI source of truth:
- `frontend/app/`
- `frontend/components/`
- `frontend/lib/`
- `frontend/store/`

Why this exists:
- Older work landed in the repository root before the Docker/runtime wiring was standardized.
- The live frontend container in `docker-compose.yml` mounts `./frontend` and does not serve this root tree.

Rules:
- Do not add new UI work here.
- When fixing or building pages, change `frontend/` instead.
- Treat this directory as deprecated compatibility code until it is removed in a future cleanup pass.
