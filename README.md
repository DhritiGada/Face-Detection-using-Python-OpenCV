# Live Face Detection & Counting

A Python + OpenCV web app that detects and counts visible faces from a user's webcam in near real time.

**Live demo:** https://live-face-counter.vercel.app/

## How it works

1. The browser requests camera access.
2. JavaScript samples webcam frames.
3. Frames are sent to a Flask backend.
4. Python/OpenCV detects face candidates and validates them with eye-region checks to reduce false positives.
5. The app returns bounding boxes and the current face count to the browser.

## Features

- Live webcam face detection
- Real-time face count
- Bounding-box overlays
- Start/stop camera controls
- Camera switching
- False-positive filtering
- Responsive browser UI
- Flask health endpoint at `/health`
- Face detection only, no identity recognition

## Tech stack

- Python
- Flask
- OpenCV
- NumPy
- JavaScript
- HTML/CSS
- Vercel

## Project structure

```
.
├── app.py
├── face_detection.py
├── pyproject.toml
├── requirements.txt
├── templates/
│   └── index.html
├── static/
│   ├── app.js
│   └── styles.css
└── README.md
```

## Run locally

```bash
pip install -r requirements.txt
python app.py
```

Then open:

```
http://localhost:5000
```

Allow camera access and click **Start camera**.

## API

### `POST /detect`

Accepts a JPEG frame as multipart form data under `frame` and returns:

```json
{
  "count": 1,
  "faces": [
    {
      "x": 120,
      "y": 90,
      "width": 180,
      "height": 180
    }
  ],
  "frameWidth": 1280,
  "frameHeight": 720
}
```

### `GET /health`

Returns the backend health status and detector type.

## Privacy

This project performs **face detection, not face recognition**. It does not intentionally identify users, create biometric profiles, record video, or store submitted frames. Frames are processed in memory for detection.

## Notes

The displayed count is the number of faces detected in the current analyzed frame. It does not track unique people over time.

Detection quality can still vary with lighting, camera angle, distance, and occlusion.
