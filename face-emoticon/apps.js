const video = document.getElementById('video');
const emojiDisplay = document.getElementById('emoji');

const expressionEmojis = {
  happy: "😄",
  sad: "😢",
  angry: "😠",
  surprised: "😲",
  fearful: "😱",
  disgusted: "🤢",
  neutral: "😐"
};

async function startVideo() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;
  } catch (err) {
    console.error("Failed to access webcam:", err);
  }
}

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('models'),
    faceapi.nets.faceExpressionNet.loadFromUri('models')
  ]).then(startVideo);


function getTopExpression(expressions) {
  return Object.entries(expressions)
    .sort((a, b) => b[1] - a[1])[0][0];
}

video.addEventListener('play', () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);

  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(
      video,
      new faceapi.TinyFaceDetectorOptions()
    ).withFaceExpressions();

    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    faceapi.draw.drawDetections(canvas, resizedDetections);

    if (detections.length > 0) {
      const topExp = getTopExpression(detections[0].expressions);
      emojiDisplay.textContent = expressionEmojis[topExp] || "😐";
    }
  }, 300);
});