import logging
from logging.handlers import RotatingFileHandler
import os

# Ensure logs directory exists
os.makedirs("logs", exist_ok=True)

def get_logger(name: str):
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    # Avoid duplicate handlers in dev reload
    if logger.hasHandlers():
        return logger

    # Console Handler
    console_handler = logging.StreamHandler()
    console_formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s")
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)

    # Rotating File Handler
    file_handler = RotatingFileHandler(
        filename=f"logs/{name}.log", maxBytes=10*1024*1024, backupCount=3
    )
    file_formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s")
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)

    return logger
