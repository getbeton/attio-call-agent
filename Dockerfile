FROM python:3.14-slim
WORKDIR /app
COPY agent.py ./
COPY prompts ./prompts
ENV PYTHONUNBUFFERED=1 DATA_DIR=/data
CMD ["python", "agent.py", "serve"]
