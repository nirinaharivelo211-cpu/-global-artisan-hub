# Infra

Contains Docker, docker-compose files and deployment manifests.

Suggested layout:
- `infra/docker/` — Dockerfiles and compose files
- `infra/k8s/` — Kubernetes manifests (optional)
- `infra/scripts/` — deployment helpers

Next: move existing `docker/` into `infra/docker` during migration.
