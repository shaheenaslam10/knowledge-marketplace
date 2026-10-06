# syntax=docker/dockerfile:1
# Backend image. `dev` target is used by docker-compose (mounted source, hot reload);
# `prod` target is the slim runtime used by docker-compose.prod.yml (ADR-0016).

FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl postgresql-client \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY pyproject.toml README.md ./
COPY apps ./apps
COPY config ./config
COPY manage.py ./
RUN pip install -e ".[dev]"

FROM deps AS dev
EXPOSE 8000
CMD ["uvicorn", "config.asgi:application", "--host", "0.0.0.0", "--port", "8000"]

# Runtime dependencies only. The `deps` stage installs the [dev] extra
# (pytest/ruff/import-linter) which has no business in a production image:
# smaller surface, smaller image, nothing to `pip-audit` that users cannot reach.
FROM base AS deps-prod
COPY pyproject.toml README.md ./
COPY apps ./apps
COPY config ./config
COPY manage.py ./
RUN pip install -e "."

FROM base AS prod
COPY --from=deps-prod /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps-prod /usr/local/bin /usr/local/bin
COPY docker ./docker
COPY pyproject.toml README.md ./
COPY apps ./apps
COPY config ./config
COPY manage.py ./
RUN useradd --create-home --uid 1000 hem \
    && mkdir -p /app/staticfiles \
    && chown -R hem:hem /app
USER hem
EXPOSE 8000
ENTRYPOINT ["/app/docker/entrypoint.prod.sh"]
CMD ["uvicorn", "config.asgi:application", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
