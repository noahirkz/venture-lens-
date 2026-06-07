# ─────────────────────────────────────────────────────────────────────────────
# VentureLens backend — production image (used by Railway).
#
# Why a Dockerfile and not nixpacks?
#   • nixpacks couldn't reliably expose `pip` on PATH and can't easily install
#     the system shared libraries Chromium needs at runtime.
#   • A pinned base image gives us a reproducible build.
#
# Base image: python 3.12 slim. We install Playwright's chromium browser at
# build time, so /api/v1/scraper/run actually has a browser to drive.
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

# System libraries Chromium needs to render headless. This is the conservative
# subset that matches `playwright install --with-deps chromium` on jammy/noble.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      libnss3 \
      libnspr4 \
      libatk1.0-0 \
      libatk-bridge2.0-0 \
      libcups2 \
      libdrm2 \
      libxcomposite1 \
      libxdamage1 \
      libxrandr2 \
      libxfixes3 \
      libxext6 \
      libgbm1 \
      libxkbcommon0 \
      libpango-1.0-0 \
      libcairo2 \
      libasound2 \
      libatspi2.0-0 \
      libx11-6 \
      libxcb1 \
      libwayland-client0 \
      fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps before copying source so Docker caches them.
COPY pyproject.toml ./
COPY uv.lock* ./
# Hatchling validates `packages = ["app"]` at install time, so we stub the
# package directory before `pip install -e .`. The real source is copied
# below; because the install is editable (.pth file), the stub is overwritten
# in place and code changes are picked up immediately.
RUN mkdir -p app && touch app/__init__.py
RUN pip install --upgrade pip && pip install -e .

# Install Chromium under PLAYWRIGHT_BROWSERS_PATH so it lives outside /root/.
RUN python -m playwright install chromium

# Real app source last — changes here don't bust the dep/browser cache above.
COPY app ./app

# Railway sets $PORT at runtime. Default to 8000 for `docker run` locally.
ENV PORT=8000
EXPOSE 8000

# Use sh -c so $PORT expands at runtime, not at build time.
CMD ["sh", "-c", "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
