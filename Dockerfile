# Use the official Python image as the base image
FROM python:3.9-slim

# Set the working directory
WORKDIR /app

# Copy the backend requirements and install dependencies
COPY backend/requirements.txt /app/backend/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r backend/requirements.txt

# Copy the backend code
COPY backend /app/backend

# Copy the frontend code
COPY frontend /app/frontend

# Build the frontend
WORKDIR /app/frontend
RUN npm install && npm run build

# Set the working directory back to the backend
WORKDIR /app/backend

# Expose the backend port
EXPOSE 8000

# Start the backend server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]