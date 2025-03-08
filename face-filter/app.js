// app.js
const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');

// Load models from the '/models' directory.
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('models')
]).then(startVideo);

function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: {} })
    .then(stream => {
      video.srcObject = stream;
      video.addEventListener('play', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        // Load the glasses image.
        const glassesImg = new Image();
        glassesImg.src = 'glasses.png'; // Ensure this image is in your project folder.
        glassesImg.onload = () => {
          drawFrame(glassesImg,0,0,0,0);
        };
      });
    })
    .catch(err => console.error("Error accessing the webcam: ", err));
}
function getCenterOfPoints(points) {
    const sum = points.reduce((acc, point) => {
      acc.x += point.x;
      acc.y += point.y;
      return acc;
    }, { x: 0, y: 0 });
    return {
      x: sum.x / points.length,
      y: sum.y / points.length
    };
  }
  
function drawFrame(glassesImg,eyeCenterX,eyeCenterY,glassesWidth,glassesHeight,angle ) {
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(eyeCenterX, eyeCenterY);
  ctx.rotate(angle)
  ctx.drawImage(
    glassesImg,
     - glassesWidth / 2,
     - glassesHeight / 2,
    glassesWidth,
    glassesHeight
  );
  ctx.restore();
  faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
  .withFaceLandmarks()
  .then(result => {
    let detectionData = {};
    if (result) {
      const landmarks = result.landmarks;
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();

      const leftEyeCenter = getCenterOfPoints(leftEye);
      const rightEyeCenter = getCenterOfPoints(rightEye);

  
      const dx = rightEyeCenter.x - leftEyeCenter.x;
      const dy = rightEyeCenter.y - leftEyeCenter.y;
      const angle = Math.atan2(dy, dx);
      
      detectionData.eyeCenterX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
      detectionData.eyeCenterY = (leftEyeCenter.y + rightEyeCenter.y) / 2;
      detectionData.angle = angle;

      detectionData.glassesWidth = Math.hypot(dx, dy) * 2;


      const aspectRatio = glassesImg.naturalHeight / glassesImg.naturalWidth;
      detectionData.glassesHeight = detectionData.glassesWidth * aspectRatio;
    }
    return detectionData;
  })
  .catch(err => {
    console.error("Detection error:", err);
    return {};
  })
  .then(detectionData => {
    requestAnimationFrame(() => drawFrame(glassesImg, detectionData.eyeCenterX, detectionData.eyeCenterY, detectionData.glassesWidth, detectionData.glassesHeight, detectionData.angle));
  });

}
