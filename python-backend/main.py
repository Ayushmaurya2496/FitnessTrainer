"""FastAPI entrypoint for the pose / detection backend.

Render Start Command example (if Root Directory left blank):
  uvicorn python-backend.main:app --host 0.0.0.0 --port $PORT

If Root Directory is set to "python-backend":
  uvicorn main:app --host 0.0.0.0 --port $PORT

This file currently exposes only health and version endpoints. Extend by
importing logic from pose_analyzer.py or other modules when ready.
"""

from fastapi import FastAPI
from importlib.metadata import version, PackageNotFoundError
import platform

app = FastAPI(title="Fitness Trainer Pose Backend", version="0.1.0")


@app.get("/healthz")
def health() -> dict:
    return {"status": "ok"}


@app.get("/env")
def env_info() -> dict:
    def safe_ver(pkg: str) -> str:
        try:
            return version(pkg)
        except PackageNotFoundError:
            return "not-installed"

    return {
        "python": platform.python_version(),
        "fastapi": safe_ver("fastapi"),
        "uvicorn": safe_ver("uvicorn"),
        "opencv-python": safe_ver("opencv-python"),
        "mediapipe": safe_ver("mediapipe"),
        "numpy": safe_ver("numpy"),
    }


# Placeholder for future pose analysis endpoint
@app.post("/analyze/pose")
def analyze_pose():  # TODO: accept uploaded video/frame and run pose detection
    return {"detail": "Pose analysis not yet implemented"}


if __name__ == "__main__":  # Local debug convenience
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
