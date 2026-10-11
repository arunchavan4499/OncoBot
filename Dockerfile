# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install dependencies first for Docker caching
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the Python backend & final image
FROM python:3.10-slim
WORKDIR /app

# Install system dependencies (OpenSlide, OpenCV requirements, etc.)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    openslide-tools \
    awscli \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the built React frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Copy the backend source code and trained weights
COPY . .

# Expose port 8000 for FastAPI
EXPOSE 8000

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=8000
ENV KMP_DUPLICATE_LIB_OK=TRUE

# Run the FastAPI server using Uvicorn
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
