# Dockerfile

FROM python:3.11-slim

# Create app directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your code
COPY . .

# Expose port
EXPOSE 5000

# Start FastAPI with auto-reload in development
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
