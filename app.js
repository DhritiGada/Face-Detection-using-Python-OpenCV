import {
  FaceDetector,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm";

const video = document.querySelector("#video");
const overlay = document.querySelector("#overlay");
const ctx = overlay.getContext("2d");
const startButton = document.querySelector("#startButton");
const stopButton = document.querySelector("#stopButton");
const cameraSelect = document.querySelector("#cameraSelect");
const faceCount = document.querySelector("#faceCount");
const statusText = document.querySelector("#statusText");
const statusDot = document.querySelector("#statusDot");
const liveBadge = document.querySelector("#liveBadge");
const emptyState = document.querySelector("#emptyState");
const videoWrap = document.querySelector("#videoWrap");
const message = document.querySelector("#message");

let detector = null;
let stream = null;
let animationFrameId = null;
let lastVideoTime = -1;
let selectedDeviceId = "";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite";
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";

function setStatus(text, mode = "idle") {
  statusText.textContent = text;
  statusDot.classList.remove("live", "error");
  liveBadge.classList.remove("live");

  if (mode === "live") {
    statusDot.classList.add("live");
    liveBadge.classList.add("live");
    liveBadge.textContent = "LIVE";
  } else if (mode === "error") {
    statusDot.classList.add("error");
    liveBadge.textContent = "ERROR";
  } else {
    liveBadge.textContent = "OFFLINE";
  }
}

function setMessage(text, error = false) {
  message.textContent = text;
  message.classList.toggle("error", error);
}

async function loadDetector() {
  if (detector) return detector;

  setStatus("Loading model");
  setMessage("Loading the face-detection model…");

  const vision = await FilesetResolver.forVisionTasks(WASM_URL);

  try {
    detector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      minDetectionConfidence: 0.5,
      minSuppressionThreshold: 0.3
    });
  } catch (gpuError) {
    console.warn("GPU initialization failed. Retrying with CPU.", gpuError);

    detector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL
      },
      runningMode: "VIDEO",
      minDetectionConfidence: 0.5,
      minSuppressionThreshold: 0.3
    });
  }

  return detector;
}

async function listCameras() {
  if (!navigator.mediaDevices?.enumerateDevices) return;

  const devices = await navigator.mediaDevices.enumerateDevices();
  const cameras = devices.filter((device) => device.kind === "videoinput");

  cameraSelect.innerHTML = "";

  if (!cameras.length) {
    const option = document.createElement("option");
    option.textContent = "No camera found";
    option.value = "";
    cameraSelect.append(option);
    cameraSelect.disabled = true;
    return;
  }

  cameras.forEach((camera, index) => {
    const option = document.createElement("option");
    option.value = camera.deviceId;
    option.textContent = camera.label || `Camera ${index + 1}`;
    cameraSelect.append(option);
  });

  cameraSelect.disabled = cameras.length < 2;

  if (selectedDeviceId && cameras.some((c) => c.deviceId === selectedDeviceId)) {
    cameraSelect.value = selectedDeviceId;
  } else if (cameras[0]) {
    selectedDeviceId = cameras[0].deviceId;
    cameraSelect.value = selectedDeviceId;
  }
}

function cameraConstraints() {
  return {
    audio: false,
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: selectedDeviceId ? undefined : { ideal: "user" },
      deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined
    }
  };
}

async function startCamera() {
  startButton.disabled = true;
  setMessage("Requesting camera permission…");

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        "This browser does not support camera access. Try a current version of Chrome, Edge, Safari, or Firefox."
      );
    }

    await loadDetector();

    if (stream) {
      stopCamera(false);
    }

    stream = await navigator.mediaDevices.getUserMedia(cameraConstraints());
    video.srcObject = stream;

    await new Promise((resolve) => {
      if (video.readyState >= 2) {
        resolve();
        return;
      }

      video.addEventListener("loadeddata", resolve, { once: true });
    });

    await video.play();

    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;

    emptyState.hidden = true;
    videoWrap.hidden = false;

    await listCameras();

    setStatus("Detecting faces", "live");
    setMessage("Detection is running in your browser. Camera frames are not stored by this app.");
    stopButton.disabled = false;
    startButton.textContent = "Restart camera";
    startButton.disabled = false;

    lastVideoTime = -1;
    predict();
  } catch (error) {
    console.error(error);
    stopCamera(false);

    const friendlyMessage =
      error?.name === "NotAllowedError"
        ? "Camera permission was denied. Allow camera access in your browser settings and try again."
        : error?.name === "NotFoundError"
          ? "No camera was found on this device."
          : error?.name === "NotReadableError"
            ? "The camera is already in use by another application or could not be opened."
            : error?.message || "Unable to start the camera.";

    setStatus("Camera error", "error");
    setMessage(friendlyMessage, true);
    startButton.disabled = false;
  }
}

function stopCamera(resetMessage = true) {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  video.srcObject = null;
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  faceCount.textContent = "0";
  videoWrap.hidden = true;
  emptyState.hidden = false;
  stopButton.disabled = true;
  setStatus("Ready");
  startButton.textContent = "Start camera";

  if (resetMessage) {
    setMessage("Camera stopped. No video was recorded.");
  }
}

function drawDetections(detections) {
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  ctx.lineWidth = Math.max(3, overlay.width / 320);
  ctx.strokeStyle = "#39e58c";
  ctx.fillStyle = "#39e58c";
  ctx.font = `${Math.max(16, overlay.width / 45)}px system-ui, sans-serif`;

  detections.forEach((detection, index) => {
    const box = detection.boundingBox;
    if (!box) return;

    ctx.strokeRect(box.originX, box.originY, box.width, box.height);

    const label = `Face ${index + 1}`;
    const textWidth = ctx.measureText(label).width;
    const labelHeight = Math.max(24, overlay.width / 35);
    const labelY = Math.max(0, box.originY - labelHeight);

    ctx.fillRect(box.originX, labelY, textWidth + 14, labelHeight);
    ctx.fillStyle = "#07120d";
    ctx.fillText(label, box.originX + 7, labelY + labelHeight - 7);
    ctx.fillStyle = "#39e58c";
  });
}

function predict() {
  if (!stream || !detector || video.readyState < 2) return;

  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;

    try {
      const result = detector.detectForVideo(video, performance.now());
      const detections = result.detections || [];

      faceCount.textContent = String(detections.length);
      drawDetections(detections);
    } catch (error) {
      console.error("Detection error:", error);
      setMessage("A frame could not be analyzed. Detection will keep trying.", true);
    }
  }

  animationFrameId = requestAnimationFrame(predict);
}

startButton.addEventListener("click", startCamera);
stopButton.addEventListener("click", () => stopCamera(true));

cameraSelect.addEventListener("change", async (event) => {
  selectedDeviceId = event.target.value;

  if (stream) {
    await startCamera();
  }
});

window.addEventListener("beforeunload", () => {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
});

if (!window.isSecureContext) {
  startButton.disabled = true;
  setStatus("HTTPS required", "error");
  setMessage(
    "Camera access requires HTTPS (or localhost). Deploy this page over HTTPS to use the live prototype.",
    true
  );
}
