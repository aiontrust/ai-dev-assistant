# Stage 1: Build the frontend
FROM node:23-alpine AS frontend-build

WORKDIR /app/frontend

# Copy package.json and install dependencies
COPY frontend/package*.json ./
RUN npm install

# Set the necessary permissions for node_modules
RUN chmod -R 755 /app/frontend/node_modules

# Copy the rest of the frontend files and build the app
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the backend
FROM python:alpine

# Set the working directory
WORKDIR /app

# Install system dependencies for building Python packages
RUN apk update && apk add --no-cache \
build-base \
g++ \
&& rm -rf /var/cache/apk/*

# Copy the backend requirements and install dependencies
COPY backend/requirements.txt /app/backend/
RUN ls -l /app/backend/requirements.txt && \
    pip install --no-cache-dir --upgrade pip --root-user-action=ignore && \
    pip install --no-cache-dir -r /app/backend/requirements.txt --root-user-action=ignore

# Copy the backend code
COPY backend/ /app/backend

# Copy the built frontend from the previous stage
COPY --from=frontend-build /app/frontend/build /app/backend/app/static

# Expose the backend port
EXPOSE 8000

# Start the backend server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
