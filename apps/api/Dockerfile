FROM python:3.12-slim

# Install system deps for Playwright + Lighthouse
RUN apt-get update && apt-get install -y \
    wget gnupg curl \
    libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0 \
    libcairo2 libatspi2.0-0 \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace packages first (for better layer caching)
COPY packages/crawler /app/packages/crawler
COPY packages/auditor /app/packages/auditor

# Copy API code
COPY apps/api /app/apps/api

WORKDIR /app/apps/api

# Install Python deps
RUN pip install --no-cache-dir -e ".[dev]" \
    && pip install --no-cache-dir -e ../../packages/crawler \
    && pip install --no-cache-dir -e ../../packages/auditor

# Install Playwright browser
RUN playwright install chromium --with-deps

# Install Lighthouse globally
RUN npm install -g lighthouse

# Port (Render provides $PORT env var)
EXPOSE 8000

# Default command (overridden by Render service config)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
