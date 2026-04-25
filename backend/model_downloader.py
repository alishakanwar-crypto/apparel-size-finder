"""Downloads the MediaPipe Pose Landmarker model if not present."""

import os
import urllib.request

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task"
MODEL_PATH = os.path.join(os.path.dirname(__file__), "pose_landmarker.task")


def ensure_model():
    if os.path.exists(MODEL_PATH):
        return
    print(f"Downloading pose landmarker model to {MODEL_PATH}...")
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print("Model downloaded successfully.")
