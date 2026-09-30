const video = document.querySelector("#video");
const overlay = document.querySelector("#overlay");
const ctx = overlay.getContext("2d");
const faceCount = document.querySelector("#faceCount");
const startButton = document.querySelector("#startButton");
const stopButton = document.querySelector("#stopButton");
const cameraSelect = document.querySelector("#cameraSelect");
const statusText = document.querySelector("#statusText");
const statusDot = document.querySelector("#statusDot");
const liveBadge = document.querySelector("#liveBadge");
const emptyState = document.querySelector("#emptyState");
const videoWrap = document.querySelector("#videoWrap");
const message = document.querySelector("#message");

const captureCanvas = document.createElement("canvas");
const captureCtx = captureCanvas.getContext("2d");

let stream = null;
let loopTimer = null;
let requestInFlight = false;
let selectedDeviceId = "";

const ANALYSIS_INTERVAL_MS = 250;

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

async function listCameras() {
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

  if (selectedDeviceId && cameras.some((c) => c.deviceId === selectedDeviceId)) {
    cameraSelect.value = selectedDeviceId;
  } else {
    selectedDeviceId = cameras[0].deviceId;
    cameraSelect.value = selectedDeviceId;
  }

  cameraSelect.disabled = cameras.length < 2;
}

function constraints() {
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
      throw new Error("This browser does not support camera access.");
    }

    stopCamera(false);

    stream = await navigator.mediaDevices.getUserMedia(constraints());
    video.srcObject = stream;

    await new Promise((resolve) => {
      if (video.readyState >= 2) return resolve();
      video.addEventListener("loadeddata", resolve, { once: true });
    });

    await video.play();
    await listCameras();

    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;

    emptyState.hidden = true;
    videoWrap.hidden = false;
    stopButton.disabled = false;
    startButton.disabled = false;
    startButton.textContent = "Restart camera";
    setStatus("Detecting faces", "live");
    setMessage("Python/OpenCV detection is active.");

    scheduleDetection();
  } catch (error) {
    console.error(error);
    stopCamera(false);

    const friendly =
      error?.name === "NotAllowedError"
        ? "Camera permission was denied. Allow access in your browser settings and try again."
        : error?.name === "NotFoundError"
          ? "No camera was found on this device."
          : error?.name === "NotReadableError"
            ? "The camera may already be in use by another application."
            : error?.message || "Unable to start the camera.";

    setStatus("Camera error", "error");
    setMessage(friendly, true);
    startButton.disabled = false;
  }
}

function stopCamera(resetMessage = true) {
  if (loopTimer) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }

  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  video.srcObject = null;
  requestInFlight = false;
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  faceCount.textContent = "0";
  videoWrap.hidden = true;
  emptyState.hidden = false;
  stopButton.disabled = true;
  startButton.textContent = "Start camera";
  setStatus("Ready");

  if (resetMessage) setMessage("Camera stopped. No video is being recorded.");
}

function scheduleDetection() {
  if (!stream) return;

  loopTimer = setTimeout(async () => {
    await analyzeFrame();
    scheduleDetection();
  }, ANALYSIS_INTERVAL_MS);
}

async function analyzeFrame() {
  if (!stream || requestInFlight || video.readyState < 2) return;

  requestInFlight = true;

  try {
    captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);

    const blob = await new Promise((resolve) =>
      captureCanvas.toBlob(resolve, "image/jpeg", 0.72)
    );

    if (!blob) throw new Error("Unable to capture a video frame.");

    const form = new FormData();
    form.append("frame", blob, "frame.jpg");

    const response = await fetch("/detect", {
      method: "POST",
      body: form
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Detection request failed.");
    }

    faceCount.textContent = String(data.count);
    drawBoxes(data.faces, data.frameWidth, data.frameHeight);
    setMessage(`Detection active · ${data.count} face${data.count === 1 ? "" : "s"} in current frame.`);
  } catch (error) {
    console.error(error);
    setMessage(error.message || "A frame could not be analyzed.", true);
  } finally {
    requestInFlight = false;
  }
}

function drawBoxes(faces, frameWidth, frameHeight) {
  if (overlay.width !== frameWidth || overlay.height !== frameHeight) {
    overlay.width = frameWidth;
    overlay.height = frameHeight;
  }

  ctx.clearRect(0, 0, overlay.width, overlay.height);
  ctx.lineWidth = Math.max(3, overlay.width / 320);
  ctx.strokeStyle = "#39e58c";
  ctx.fillStyle = "#39e58c";
  ctx.font = `${Math.max(16, overlay.width / 45)}px system-ui, sans-serif`;

  faces.forEach((face, index) => {
    ctx.strokeRect(face.x, face.y, face.width, face.height);

    const label = `Face ${index + 1}`;
    const textWidth = ctx.measureText(label).width;
    const labelHeight = Math.max(24, overlay.width / 35);
    const labelY = Math.max(0, face.y - labelHeight);

    ctx.fillRect(face.x, labelY, textWidth + 14, labelHeight);
    ctx.fillStyle = "#07120d";
    ctx.fillText(label, face.x + 7, labelY + labelHeight - 7);
    ctx.fillStyle = "#39e58c";
  });
}

startButton.addEventListener("click", startCamera);
stopButton.addEventListener("click", () => stopCamera(true));

cameraSelect.addEventListener("change", async (event) => {
  selectedDeviceId = event.target.value;
  if (stream) await startCamera();
});

window.addEventListener("beforeunload", () => {
  if (stream) stream.getTracks().forEach((track) => track.stop());
});

if (!window.isSecureContext) {
  startButton.disabled = true;
  setStatus("HTTPS required", "error");
  setMessage("Camera access requires HTTPS or localhost.", true);
}
