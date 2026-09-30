# Face Detection using Python and OpenCV

A simple computer-vision project that detects human faces in either a still image or a live webcam feed using OpenCV's bundled Haar Cascade classifier.

## Features

- Detect faces in a local image
- Detect faces in real time from a webcam
- Draw bounding boxes around detected faces
- Display the number of faces detected
- Print face coordinates for image inputs
- Optionally save an annotated output image
- No external model download is required

## Requirements

- Python 3.9+
- OpenCV

Install dependencies:

```bash
pip install -r requirements.txt
```

## Run with a webcam

```bash
python face_detection.py
```

Press `q` to close the webcam window.

If your default camera is not available, try another camera index:

```bash
python face_detection.py --camera 1
```

Your operating system may ask you to grant camera permission to Python or your terminal.

## Run with an image

```bash
python face_detection.py --image path/to/photo.jpg
```

To save the detected result:

```bash
python face_detection.py --image path/to/photo.jpg --output output.jpg
```

The script prints the number of detected faces and the pixel coordinates of each bounding box.

## How it works

1. OpenCV loads its built-in frontal-face Haar Cascade.
2. Each input frame is converted to grayscale.
3. Histogram equalization improves contrast for detection.
4. `detectMultiScale` searches the image at multiple scales for likely faces.
5. OpenCV draws a bounding box around every detected face.

This project performs **face detection**, not face recognition. It locates faces in an image but does not identify who a person is.

## Project structure

```
.
├── face_detection.py
├── requirements.txt
└── README.md
```

## Notes

Haar Cascades are lightweight and convenient for a learning project, but modern deep-learning face detectors are usually more robust to difficult lighting, pose, occlusion, and very small faces.

This version intentionally uses OpenCV's bundled classifier so the repository remains easy to install and run without requiring `dlib`, `face_recognition`, a notebook environment, or a separate model file.
