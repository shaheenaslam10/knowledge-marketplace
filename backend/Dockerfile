# syntax=docker/dockerfile:1
# Backend image. `dev` target is used by docker-compose (mounted source, hot reload);
# `prod` target is the slim runtime for Phase 13 deployments.

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

FROM base AS prod
COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin
COPY pyproject.toml README.md ./
COPY apps ./apps
COPY config ./config
COPY manage.py ./
RUN useradd --create-home --uid 1000 hem && chown -R hem:hem /app
USER hem
EXPOSE 8000
CMD ["uvicorn", "config.asgi:application", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
