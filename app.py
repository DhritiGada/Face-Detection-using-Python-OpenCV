from __future__ import annotations

import os
from pathlib import Path

import cv2
import numpy as np
from flask import Flask, jsonify, render_template, request

app = Flask(__name__, template_folder="templates", static_folder="static")

CASCADE_PATH = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
FACE_DETECTOR = cv2.CascadeClassifier(str(CASCADE_PATH))

if FACE_DETECTOR.empty():
    raise RuntimeError(f"Unable to load OpenCV face detector from {CASCADE_PATH}")


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/health")
def health():
    return jsonify({"status": "ok", "detector": "opencv-haar-cascade"})


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
    height, width = frame.shape[:2]
    scale = 1.0

    if width > max_width:
        scale = max_width / width
        frame = cv2.resize(
            frame,
            (max_width, int(height * scale)),
            interpolation=cv2.INTER_AREA,
        )

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)

    faces = FACE_DETECTOR.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(40, 40),
    )

    inverse_scale = 1.0 / scale

    boxes = [
        {
            "x": int(x * inverse_scale),
            "y": int(y * inverse_scale),
            "width": int(w * inverse_scale),
            "height": int(h * inverse_scale),
        }
        for (x, y, w, h) in faces
    ]

    return jsonify(
        {
            "count": len(boxes),
            "faces": boxes,
            "frameWidth": width,
            "frameHeight": height,
        }
    )


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)
