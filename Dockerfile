# Stage 1: Build the frontend
FROM node:14-alpine as frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend ./
RUN npm build

# Stage 2: Build the backend
FROM python:3.9-slim

# Keeps Python from generating .pyc files in the container
ENV PYTHONDONTWRITEBYTECODE=1

# Turns off buffering for easier container logging
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Add the application and backend directories to the PYTHONPATH environment variable
ENV PYTHONPATH=/app:/app/backend

# Copy the backend requirements and install dependencies
COPY backend/requirements.txt /app/backend/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r backend/requirements.txt

# Copy the backend code
COPY backend/ /app/backend

# Copy the built frontend from the previous stage
COPY --from=frontend-build /app/frontend/dist /app/backend/app/static

# Expose the backend port
EXPOSE 8000

# Start the backend server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]