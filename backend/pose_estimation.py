"""Pose estimation and body measurement extraction using MediaPipe Tasks API."""

import math
import base64
import os
from dataclasses import dataclass

import cv2
import numpy as np
import mediapipe as mp

MODEL_PATH = os.path.join(os.path.dirname(__file__), "pose_landmarker.task")

# MediaPipe Pose landmark indices
LEFT_SHOULDER = 11
RIGHT_SHOULDER = 12
LEFT_HIP = 23
RIGHT_HIP = 24
LEFT_ELBOW = 13
RIGHT_ELBOW = 14
LEFT_WRIST = 15
RIGHT_WRIST = 16


@dataclass
class PoseLandmarks:
    left_shoulder: tuple[float, float]
    right_shoulder: tuple[float, float]
    left_hip: tuple[float, float]
    right_hip: tuple[float, float]
    left_elbow: tuple[float, float]
    right_elbow: tuple[float, float]
    left_wrist: tuple[float, float]
    right_wrist: tuple[float, float]
    image_width: int
    image_height: int


@dataclass
class PixelMeasurements:
    shoulder_width_px: float
    torso_length_px: float
    chest_width_px: float
    left_arm_length_px: float
    right_arm_length_px: float
    avg_arm_length_px: float
    hip_width_px: float


@dataclass
class RealMeasurements:
    chest: float
    shoulder: float
    sleeve_length: float
    body_length: float
    waist: float


def _dist(p1: tuple[float, float], p2: tuple[float, float]) -> float:
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


def _midpoint(p1: tuple[float, float], p2: tuple[float, float]) -> tuple[float, float]:
    return ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)


def decode_image(image_data: str) -> np.ndarray:
    """Decode a base64 image string to a cv2 image (BGR)."""
    if "," in image_data:
        image_data = image_data.split(",", 1)[1]
    img_bytes = base64.b64decode(image_data)
    nparr = np.frombuffer(img_bytes, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


def detect_pose(image: np.ndarray) -> PoseLandmarks | None:
    """Run MediaPipe Pose Landmarker on an image and return key landmarks in pixel coords."""
    BaseOptions = mp.tasks.BaseOptions
    PoseLandmarker = mp.tasks.vision.PoseLandmarker
    PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=VisionRunningMode.IMAGE,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
    )

    with PoseLandmarker.create_from_options(options) as landmarker:
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = landmarker.detect(mp_image)

        if not result.pose_landmarks or len(result.pose_landmarks) == 0:
            return None

        h, w = image.shape[:2]
        lm = result.pose_landmarks[0]

        def px(idx: int) -> tuple[float, float]:
            return (lm[idx].x * w, lm[idx].y * h)

        return PoseLandmarks(
            left_shoulder=px(LEFT_SHOULDER),
            right_shoulder=px(RIGHT_SHOULDER),
            left_hip=px(LEFT_HIP),
            right_hip=px(RIGHT_HIP),
            left_elbow=px(LEFT_ELBOW),
            right_elbow=px(RIGHT_ELBOW),
            left_wrist=px(LEFT_WRIST),
            right_wrist=px(RIGHT_WRIST),
            image_width=w,
            image_height=h,
        )


def extract_pixel_measurements(landmarks: PoseLandmarks) -> PixelMeasurements:
    """Extract body measurements in pixels from detected landmarks."""
    shoulder_width = _dist(landmarks.left_shoulder, landmarks.right_shoulder)

    shoulder_mid = _midpoint(landmarks.left_shoulder, landmarks.right_shoulder)
    hip_mid = _midpoint(landmarks.left_hip, landmarks.right_hip)
    torso_length = _dist(shoulder_mid, hip_mid)

    # Chest width approximated as shoulder width * 1.1 (accounts for chest curve)
    chest_width = shoulder_width * 1.1

    # Arm length: shoulder -> elbow -> wrist
    left_arm = _dist(landmarks.left_shoulder, landmarks.left_elbow) + \
               _dist(landmarks.left_elbow, landmarks.left_wrist)
    right_arm = _dist(landmarks.right_shoulder, landmarks.right_elbow) + \
                _dist(landmarks.right_elbow, landmarks.right_wrist)

    hip_width = _dist(landmarks.left_hip, landmarks.right_hip)

    return PixelMeasurements(
        shoulder_width_px=shoulder_width,
        torso_length_px=torso_length,
        chest_width_px=chest_width,
        left_arm_length_px=left_arm,
        right_arm_length_px=right_arm,
        avg_arm_length_px=(left_arm + right_arm) / 2,
        hip_width_px=hip_width,
    )


def compute_real_measurements(
    pixel_meas: PixelMeasurements,
    pixels_per_inch: float,
) -> RealMeasurements:
    """Convert pixel measurements to real-world inches using calibration ratio."""
    shoulder_width_in = pixel_meas.shoulder_width_px / pixels_per_inch
    chest_circumference = (pixel_meas.chest_width_px / pixels_per_inch) * math.pi
    sleeve_length_in = pixel_meas.avg_arm_length_px / pixels_per_inch
    body_length_in = pixel_meas.torso_length_px / pixels_per_inch
    waist_circumference = (pixel_meas.hip_width_px / pixels_per_inch) * math.pi

    return RealMeasurements(
        chest=round(chest_circumference, 1),
        shoulder=round(shoulder_width_in, 1),
        sleeve_length=round(sleeve_length_in, 1),
        body_length=round(body_length_in, 1),
        waist=round(waist_circumference, 1),
    )


def draw_landmarks_on_image(image: np.ndarray, landmarks: PoseLandmarks) -> str:
    """Draw pose landmarks on the image and return as base64 JPEG."""
    annotated = image.copy()

    points = [
        landmarks.left_shoulder, landmarks.right_shoulder,
        landmarks.left_hip, landmarks.right_hip,
        landmarks.left_elbow, landmarks.right_elbow,
        landmarks.left_wrist, landmarks.right_wrist,
    ]
    for pt in points:
        cv2.circle(annotated, (int(pt[0]), int(pt[1])), 6, (0, 255, 0), -1)

    # Draw connections
    connections = [
        (landmarks.left_shoulder, landmarks.right_shoulder),
        (landmarks.left_shoulder, landmarks.left_elbow),
        (landmarks.left_elbow, landmarks.left_wrist),
        (landmarks.right_shoulder, landmarks.right_elbow),
        (landmarks.right_elbow, landmarks.right_wrist),
        (landmarks.left_shoulder, landmarks.left_hip),
        (landmarks.right_shoulder, landmarks.right_hip),
        (landmarks.left_hip, landmarks.right_hip),
    ]
    for p1, p2 in connections:
        cv2.line(annotated, (int(p1[0]), int(p1[1])), (int(p2[0]), int(p2[1])), (0, 255, 0), 2)

    # Encode to base64
    _, buffer = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return "data:image/jpeg;base64," + base64.b64encode(buffer).decode("utf-8")
