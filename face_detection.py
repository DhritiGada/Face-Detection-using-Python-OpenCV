"""Face detection with Python and OpenCV.

Run with a webcam:
    python face_detection.py

Run with an image:
    python face_detection.py --image path/to/photo.jpg

Press q to close the webcam window.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import cv2


WINDOW_NAME = "Face Detection"


def build_detector() -> cv2.CascadeClassifier:
    """Load OpenCV's bundled Haar cascade face detector."""
    cascade_path = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
    detector = cv2.CascadeClassifier(str(cascade_path))

    if detector.empty():
        raise RuntimeError(f"Could not load face detector from {cascade_path}")

    return detector


def detect_faces(
    frame,
    detector: cv2.CascadeClassifier,
    scale_factor: float = 1.1,
    min_neighbors: int = 5,
):
    """Return detected face rectangles as (x, y, width, height)."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)

    return detector.detectMultiScale(
        gray,
        scaleFactor=scale_factor,
        minNeighbors=min_neighbors,
        minSize=(30, 30),
    )


def draw_faces(frame, faces):
    """Draw a bounding box and label for each detected face."""
    output = frame.copy()

    for index, (x, y, width, height) in enumerate(faces, start=1):
        cv2.rectangle(
            output,
            (x, y),
            (x + width, y + height),
            (0, 255, 0),
            2,
        )
        cv2.putText(
            output,
            f"Face {index}",
            (x, max(y - 10, 20)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (0, 255, 0),
            2,
            cv2.LINE_AA,
        )

    return output


def detect_from_image(
    image_path: Path,
    detector: cv2.CascadeClassifier,
    output_path: Path | None,
) -> int:
    """Detect faces in one image and optionally save the annotated result."""
    image = cv2.imread(str(image_path))

    if image is None:
        print(f"Error: could not open image: {image_path}", file=sys.stderr)
        return 1

    faces = detect_faces(image, detector)
    annotated = draw_faces(image, faces)

    print(f"Detected {len(faces)} face(s) in {image_path.name}.")

    for index, (x, y, width, height) in enumerate(faces, start=1):
        print(
            f"Face {index}: left={x}, top={y}, "
            f"right={x + width}, bottom={y + height}"
        )

    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)

        if not cv2.imwrite(str(output_path), annotated):
            print(f"Error: could not save output to {output_path}", file=sys.stderr)
            return 1

        print(f"Saved annotated image to {output_path}")

    cv2.imshow(WINDOW_NAME, annotated)
    print("Press any key in the image window to close.")
    cv2.waitKey(0)
    cv2.destroyAllWindows()

    return 0


def detect_from_camera(
    camera_index: int,
    detector: cv2.CascadeClassifier,
) -> int:
    """Run real-time face detection from a webcam."""
    capture = cv2.VideoCapture(camera_index)

    if not capture.isOpened():
        print(
            f"Error: could not open camera index {camera_index}. "
            "Check camera permissions or try --camera 1.",
            file=sys.stderr,
        )
        return 1

    print("Camera started. Press q to quit.")

    try:
        while True:
            success, frame = capture.read()

            if not success:
                print("Error: could not read a frame from the camera.", file=sys.stderr)
                return 1

            faces = detect_faces(frame, detector)
            annotated = draw_faces(frame, faces)

            cv2.putText(
                annotated,
                f"Faces: {len(faces)}",
                (16, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (0, 255, 0),
                2,
                cv2.LINE_AA,
            )

            cv2.imshow(WINDOW_NAME, annotated)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
    finally:
        capture.release()
        cv2.destroyAllWindows()

    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Detect faces in an image or from a live webcam using OpenCV."
    )
    parser.add_argument(
        "--image",
        type=Path,
        help="Path to an image. If omitted, webcam mode is used.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Optional path for saving the annotated image.",
    )
    parser.add_argument(
        "--camera",
        type=int,
        default=0,
        help="Webcam index to use in live mode. Default: 0.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        detector = build_detector()
    except RuntimeError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    if args.image:
        return detect_from_image(args.image, detector, args.output)

    return detect_from_camera(args.camera, detector)


if __name__ == "__main__":
    raise SystemExit(main())
