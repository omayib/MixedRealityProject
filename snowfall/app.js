// Get DOM elements
const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const clearButton = document.getElementById('clearButton');
let videoWidth, videoHeight;

// Create an offscreen canvas to store accumulated snow
const accumulationCanvas = document.createElement('canvas');
const accCtx = accumulationCanvas.getContext('2d');

// Array to hold falling snow particles
let snowParticles = [];

// Flag for clear button press detection
let buttonPressed = false;

// Setup the webcam video stream
async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480 },
    audio: false
  });
  video.srcObject = stream;
  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      videoWidth = video.videoWidth;
      videoHeight = video.videoHeight;
      // Set dimensions for both canvases and video element
      video.width = videoWidth;
      video.height = videoHeight;
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      accumulationCanvas.width = videoWidth;
      accumulationCanvas.height = videoHeight;
      resolve(video);
    };
  });
}

// Initialize MediaPipe Pose
const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`
});
pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  smoothSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

let poseResults = null;
pose.onResults((results) => {
  poseResults = results;
});

// Process video frames with MediaPipe Pose
async function processVideo() {
  await pose.send({ image: video });
  requestAnimationFrame(processVideo);
}

// Snow particle class
class SnowParticle {
  constructor(x, y, speed) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.landed = false;
  }
  
  update() {
    if (!this.landed) {
      this.y += this.speed;
      // Reset particle if it goes off the bottom
      if (this.y > videoHeight) {
        this.y = 0;
        this.x = Math.random() * videoWidth;
      }
    }
  }
}

// Generate an initial batch of snow particles
function generateSnowParticles(count) {
  for (let i = 0; i < count; i++) {
    snowParticles.push(new SnowParticle(
      Math.random() * videoWidth,
      Math.random() * videoHeight,
      1 + Math.random()
    ));
  }
}

// Check if a snow particle collides with key body parts
function checkCollision(particle, landmarks) {
  if (!landmarks) return false;
  // Key landmarks: nose, shoulders, wrists, and index fingers
  const indices = ['nose', 'left_shoulder', 'right_shoulder', 'left_wrist', 'right_wrist', 'left_index', 'right_index'];
  const landmarkMap = {
    'nose': 0,
    'left_shoulder': 11,
    'right_shoulder': 12,
    'left_wrist': 15,
    'right_wrist': 16,
    'left_index': 19,
    'right_index': 20
  };
  const threshold = 20; // pixels
  for (let name of indices) {
    let idx = landmarkMap[name];
    let lm = landmarks[idx];
    if (lm) {
      const x = lm.x * videoWidth;
      const y = lm.y * videoHeight;
      const dist = Math.sqrt((particle.x - x) ** 2 + (particle.y - y) ** 2);
      if (dist < threshold) return true;
    }
  }
  return false;
}

// Check if a detected fingertip is over the clear button
function checkClearButton(landmarks) {
  if (!landmarks) return false;
  const landmarkMap = { 'left_index': 19, 'right_index': 20 };
  const rect = clearButton.getBoundingClientRect();
  const scaleX = canvas.clientWidth / canvas.width;
  const scaleY = canvas.clientHeight / canvas.height;
  for (let key in landmarkMap) {
    const lm = landmarks[landmarkMap[key]];
    if (lm) {
      const x = lm.x * videoWidth * scaleX;
      const y = lm.y * videoHeight * scaleY;
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return true;
      }
    }
  }
  return false;
}

// Clear the snow accumulation
function clearSnow() {
  accCtx.clearRect(0, 0, videoWidth, videoHeight);
}

// Main animation loop
function animate() {
  // Clear the overlay canvas for the current frame
  ctx.clearRect(0, 0, videoWidth, videoHeight);
  // Draw the persistent snow from the accumulation canvas
  ctx.drawImage(accumulationCanvas, 0, 0);
  
  // Update and draw each snow particle
  for (let particle of snowParticles) {
    if (!particle.landed) {
      particle.update();
      if (poseResults && poseResults.poseLandmarks) {
        if (checkCollision(particle, poseResults.poseLandmarks)) {
          particle.landed = true;
          // Draw the landed particle on the accumulation canvas
          accCtx.beginPath();
          accCtx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
          accCtx.fillStyle = 'white';
          accCtx.fill();
        }
      }
      // Draw the falling particle
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
    }
  }
  
  // Check for finger gesture over the clear button
  if (poseResults && poseResults.poseLandmarks) {
    const isFingerOnButton = checkClearButton(poseResults.poseLandmarks);
    if (isFingerOnButton && !buttonPressed) {
      buttonPressed = true;
      clearButton.style.backgroundColor = 'rgba(200,200,200,0.9)';
    } else if (!isFingerOnButton && buttonPressed) {
      buttonPressed = false;
      clearSnow();
      clearButton.style.backgroundColor = 'rgba(255,255,255,0.7)';
    }
  }
  
  requestAnimationFrame(animate);
}

// Main entry point
async function main() {
  await setupCamera();
  video.play();
  generateSnowParticles(200);
  processVideo();
  animate();
}

main();
