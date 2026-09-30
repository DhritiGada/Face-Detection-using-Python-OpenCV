from __future__ import annotations

import os
from pathlib import Path

import cv2
import numpy as np
from flask import Flask, jsonify, render_template, request

app = Flask(__name__, template_folder="templates", static_folder="static")

FACE_CASCADE_PATH = (
    Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
)
EYE_CASCADE_PATH = (
    Path(cv2.data.haarcascades) / "haarcascade_eye_tree_eyeglasses.xml"
)

FACE_DETECTOR = cv2.CascadeClassifier(str(FACE_CASCADE_PATH))
EYE_DETECTOR = cv2.CascadeClassifier(str(EYE_CASCADE_PATH))

if FACE_DETECTOR.empty():
    raise RuntimeError(
        f"Unable to load OpenCV face detector from {FACE_CASCADE_PATH}"
    )

if EYE_DETECTOR.empty():
    raise RuntimeError(
        f"Unable to load OpenCV eye detector from {EYE_CASCADE_PATH}"
    )


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "detector": "opencv-haar-face-plus-eye-validation",
        }
    )


def has_eye_evidence(gray: np.ndarray, x: int, y: int, w: int, h: int) -> bool:
    """Validate a face candidate using eye-like features in its upper region."""
    upper_height = max(1, int(h * 0.62))
    margin_x = int(w * 0.08)
    margin_y = int(h * 0.08)

    x1 = max(0, x + margin_x)
    x2 = min(gray.shape[1], x + w - margin_x)
    y1 = max(0, y + margin_y)
    y2 = min(gray.shape[0], y + upper_height)

    eye_region = gray[y1:y2, x1:x2]

    if eye_region.size == 0:
        return False

    minimum_eye = max(12, int(min(w, h) * 0.12))

    eyes = EYE_DETECTOR.detectMultiScale(
        eye_region,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(minimum_eye, minimum_eye),
    )

    return len(eyes) >= 1


@app.post("/detect")
def detect_faces():
    uploaded = request.files.get("frame")
    if uploaded is None:
        return jsonify({"error": "Missing frame upload."}), 400

    data = np.frombuffer(uploaded.read(), dtype=np.uint8)
    frame = cv2.imdecode(data, cv2.IMREAD_COLOR)

    if frame is None:
        return jsonify({"error": "Unable to decode image frame."}), 400

    max_width = 960
    original_height, original_width = frame.shape[:2]
    scale = 1.0

    if original_width > max_width:
        scale = max_width / original_width
        frame = cv2.resize(
            frame,
            (max_width, int(original_height * scale)),
            interpolation=cv2.INTER_AREA,
        )

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)

    candidates = FACE_DETECTOR.detectMultiScale(
        gray,
        scaleFactor=1.08,
        minNeighbors=8,
        minSize=(60, 60),
    )

    validated_faces = []

    for x, y, w, h in candidates:
        aspect_ratio = w / float(h)

        # Haar false positives are frequently oddly shaped compared with
        # a frontal webcam face, so reject implausible candidate geometry.
        if not 0.78 <= aspect_ratio <= 1.28:
            continue

        if not has_eye_evidence(gray, x, y, w, h):
            continue

        validated_faces.append((x, y, w, h))

    inverse_scale = 1.0 / scale

    boxes = [
        {
            "x": int(x * inverse_scale),
            "y": int(y * inverse_scale),
            "width": int(w * inverse_scale),
            "height": int(h * inverse_scale),
        }
        for (x, y, w, h) in validated_faces
    ]

    return jsonify(
        {
            "count": len(boxes),
            "faces": boxes,
            "frameWidth": original_width,
            "frameHeight": original_height,
        }
    )


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)
