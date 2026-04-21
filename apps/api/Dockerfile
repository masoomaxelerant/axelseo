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

# CRITICAL: Copy workspace packages FIRST and install them BEFORE the API
# This ensures pip can find axelseo-crawler and axelseo-auditor as local packages
COPY packages/crawler /app/packages/crawler
COPY packages/auditor /app/packages/auditor

# Install workspace packages in editable mode
RUN pip install --no-cache-dir -e /app/packages/crawler
RUN pip install --no-cache-dir -e /app/packages/auditor

# Now copy and install the API (which depends on the workspace packages above)
COPY apps/api /app/apps/api
WORKDIR /app/apps/api
RUN pip install --no-cache-dir -e .

# Install Playwright browser
RUN playwright install chromium --with-deps

# Install Lighthouse globally
RUN npm install -g lighthouse

EXPOSE 8000

# Default command - overridden by worker service
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
