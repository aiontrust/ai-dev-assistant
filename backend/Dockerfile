# For more information, please refer to https://aka.ms/vscode-docker-python
FROM python:3.13-slim

EXPOSE 8000

# Keeps Python from generating .pyc files in the container
ENV PYTHONDONTWRITEBYTECODE=1

# Turns off buffering for easier container logging
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Add the application and backend directories to the PYTHONPATH environment variable
ENV PYTHONPATH=/app:/app/backend

# Install pip requirements
COPY requirements.txt /app
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the app directory
COPY ./app /app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]