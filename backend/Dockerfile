FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN addgroup --system leap && adduser --system --ingroup leap leap
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN chown -R leap:leap /app
USER leap
EXPOSE 8000
CMD ["sh", "seed/start_production.sh"]
