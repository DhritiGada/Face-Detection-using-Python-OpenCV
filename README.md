# Live Face Detection & Counting

A real-time computer-vision prototype that lets people open a web page, grant camera access, and see faces detected and counted live in their browser.

The repository also includes a local Python/OpenCV version for desktop testing.

## Live browser prototype

The browser version is the easiest way to make the project usable by other people.

Users can:

- Click **Start camera**
- Grant browser camera permission
- See live video from their device
- Detect faces continuously in real time
- See a bounding box around each detected face
- See the live **Faces detected** count update automatically
- Switch cameras when multiple cameras are available
- Stop the camera at any time

Camera frames are processed client-side and are not intentionally uploaded or stored by this prototype.

### Run locally

Camera access requires HTTPS or localhost.

From the repository folder:

```bash
python -m http.server 8000
```

Then open:

```
http://localhost:8000
```

Do not open `index.html` directly through a `file://` URL because browsers restrict camera access outside a secure context.

### Deploy for other people

Deploy this repository as a static site on Vercel or another HTTPS host.

No Python server is required for the browser version.

Once deployed, a visitor can open the public URL, click **Start camera**, grant permission, and use real-time face detection directly in the browser.

## Browser architecture

The web prototype uses:

- JavaScript
- Browser MediaDevices / `getUserMedia`
- MediaPipe Tasks Vision Face Detector
- VIDEO inference mode
- HTML Canvas for face bounding boxes
- Client-side inference

The live count represents the number of faces detected in the **current video frame**.

It is not a unique-person counter and does not track identities over time.

## Local Python/OpenCV version

The original desktop workflow remains available through `face_detection.py`.

### Install

```bash
pip install -r requirements.txt
```

### Webcam

```bash
python face_detection.py
```

Press `q` to quit.

If the default webcam is unavailable:

```bash
python face_detection.py --camera 1
```

### Image

```bash
python face_detection.py --image path/to/photo.jpg
```

Save an annotated image:

```bash
python face_detection.py --image path/to/photo.jpg --output output.jpg
```

## Face detection vs. face recognition

This project performs **face detection**, not face recognition.

It answers:

> How many faces are visible, and where are they?

It does not identify who a person is or compare a face against known identities.

## Privacy

The browser prototype is designed to process frames locally.

It does not intentionally:

- upload camera frames
- record video
- store detected faces
- identify people

Users must explicitly grant camera permission in their browser.

## Project structure

```
.
├── index.html
├── styles.css
├── app.js
├── face_detection.py
├── requirements.txt
└── README.md
```

## Common camera errors

### Camera permission denied

Allow camera permission for the site in the browser and reload the page.

### No camera found

Make sure the device has an available webcam.

### Camera already in use

Close another application that may have exclusive access to the webcam and try again.

### Camera does not work from the deployed page

The deployment must use HTTPS. Browsers generally allow camera access only from secure origins or `localhost`.

## Limitations

Detection quality can vary with:

- lighting
- camera quality
- face size
- head angle
- partial occlusion
- distance from the camera

This is a prototype and is not intended for identity recognition, surveillance, or production biometric use.
