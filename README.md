# Live Face Detection & Counting

A Python and OpenCV powered web prototype for real-time face detection and counting.

Visitors open the deployed app, grant camera access, and see visible faces detected and counted continuously. The browser captures camera frames, sends sampled frames to a Flask backend, and the backend uses OpenCV to return face bounding boxes and the current face count.

## Architecture

```
Browser camera
   ↓
JavaScript frame capture
   ↓
POST /detect
   ↓
Flask backend
   ↓
Python + OpenCV Haar Cascade
   ↓
JSON face boxes + count
   ↓
Browser canvas overlay
```

This is a real Python-backed web application. The browser is responsible only for camera access, frame capture, and rendering.

## Features

- Live webcam access in the browser
- Python/OpenCV face detection
- Real-time visible-face count
- Bounding boxes around each detected face
- Start and stop camera controls
- Multi-camera switching
- Camera permission error handling
- Health endpoint at `/health`
- Responsive web interface
- No identity recognition

## Project structure

```
.
├── app.py
├── face_detection.py
├── requirements.txt
├── vercel.json
├── templates/
│   └── index.html
├── static/
│   ├── app.js
│   └── styles.css
└── README.md
```

## Run locally

Create and activate a virtual environment if desired, then install dependencies:

```bash
pip install -r requirements.txt
```

Start Flask:

```bash
python app.py
```

Open:

```
http://localhost:5000
```

Click **Start camera** and allow camera permission.

## Deploy to Vercel

Import this GitHub repository into Vercel and select the Python application/runtime option.

The Flask app is exposed through `app.py`, and dependencies are defined in `requirements.txt`.

No external database or environment variables are required for the current prototype.

After deployment, the app must be accessed over HTTPS for browser camera permissions to work.

## Detection API

### `POST /detect`

Accepts a multipart image upload:

```
frame=<jpeg image>
```

Returns:

```json
{
  "count": 2,
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

Returns the backend health state and detector type.

## Real-time behavior

The browser samples the live camera roughly every 250 ms.

For each sample:

1. The video frame is converted to JPEG.
2. The frame is posted to the Flask `/detect` endpoint.
3. OpenCV converts it to grayscale.
4. Histogram equalization is applied.
5. Haar Cascade face detection runs.
6. Bounding boxes are returned as JSON.
7. The browser draws the boxes and updates the face count.

The count represents the number of faces detected in the **current analyzed frame**.

It is not a unique-person counter and does not track identities over time.

## Privacy

This prototype performs face detection, not face recognition.

It does not intentionally:

- identify people
- maintain biometric profiles
- store uploaded camera frames
- record video
- track a person across sessions

Frames are sent to the application backend only for detection and are processed in memory.

## Local OpenCV script

The repository still contains `face_detection.py` for local desktop testing.

Run webcam detection locally:

```bash
python face_detection.py
```

Run image detection:

```bash
python face_detection.py --image path/to/photo.jpg
```

## Limitations

Detection quality can vary with lighting, face angle, distance, occlusion, and camera quality.

The Haar Cascade detector is lightweight and useful for a prototype, but a future version could use a more robust modern face detector while preserving the same Flask API contract.
