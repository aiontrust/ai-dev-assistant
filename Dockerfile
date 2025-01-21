# Stage 1: Build the frontend
FROM node:14-alpine AS frontend-build

WORKDIR /app/frontend

# Copy package.json and install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy the rest of the frontend files and build the app
COPY frontend/ ./
RUN npm build

# Stage 2: Build the backend
FROM python:3.9-slim

# Set the working directory
WORKDIR /app

# Copy the backend requirements and install dependencies
COPY backend/requirements.txt /app/backend/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r backend/requirements.txt

# Copy the backend code
COPY backend/ /app/backend

# Copy the built frontend from the previous stage
COPY --from=frontend-build /app/frontend/frontend/build /app/backend/app/static

# Expose the backend port
EXPOSE 8000

# Start the backend server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
