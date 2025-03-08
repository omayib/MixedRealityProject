const video = document.getElementById('webcam');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');

const overlays = [
  { img: new Image(), x: 100, y: 100, width: 150, height: 150 },
  { img: new Image(), x: 300, y: 200, width: 150, height: 150 }
];

overlays[0].img.src = 'https://picsum.photos/200';
overlays[1].img.src = 'https://picsum.photos/id/17/200/300';

let prevDistance = null;

video.addEventListener('loadedmetadata', resizeCanvas);
window.addEventListener('resize', resizeCanvas);

function resizeCanvas() {
  canvas.width = video.clientWidth;
  canvas.height = video.clientHeight;
}

function drawOverlay() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  overlays.forEach(item => {
    ctx.drawImage(item.img, item.x, item.y, item.width, item.height);
  });
}

function isIndexFingerExtended(hand) {
  const mcp = hand[5];
  const pip = hand[6];
  const tip = hand[8];
  
  const tipToPip = Math.hypot(tip.x - pip.x, tip.y - pip.y);
  const tipToMcp = Math.hypot(tip.x - mcp.x, tip.y - mcp.y);
  
  if (tipToMcp === 0) return false;
  
  const ratio = tipToPip / tipToMcp;
  return ratio < 0.7;
}

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults((results) => {
  drawOverlay();

  if (results.multiHandLandmarks && results.multiHandLandmarks.length >= 2) {
    let hand1 = results.multiHandLandmarks[0];
    let hand2 = results.multiHandLandmarks[1];
    let handedness1 = results.multiHandedness[0].label;
    let handedness2 = results.multiHandedness[1].label;
    
    let leftHand, rightHand;
    if (handedness1 === 'Left' && handedness2 === 'Right') {
      leftHand = hand1;
      rightHand = hand2;
    } else if (handedness1 === 'Right' && handedness2 === 'Left') {
      leftHand = hand2;
      rightHand = hand1;
    } else {
      leftHand = hand1;
      rightHand = hand2;
    }
    
    if (!isIndexFingerExtended(leftHand) || !isIndexFingerExtended(rightHand)) {
      prevDistance = null;
      return;
    }
    
    const leftIndex = leftHand[8];
    const rightIndex = rightHand[8];
    
    const leftX = leftIndex.x * canvas.width;
    const leftY = leftIndex.y * canvas.height;
    const rightX = rightIndex.x * canvas.width;
    const rightY = rightIndex.y * canvas.height;
    
    ctx.beginPath();
    ctx.arc(leftX, leftY, 10, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 255, 0.6)';
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(rightX, rightY, 10, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
    ctx.fill();
    
    const pinchCenter = {
      x: (leftX + rightX) / 2,
      y: (leftY + rightY) / 2
    };
    
    ctx.beginPath();
    ctx.arc(pinchCenter.x, pinchCenter.y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
    ctx.fill();
    
    const currentDistance = Math.hypot(rightX - leftX, rightY - leftY);
    
    if (prevDistance !== null) {
      const scaleFactor = currentDistance / prevDistance;
      overlays.forEach(item => {
        if (
          pinchCenter.x >= item.x &&
          pinchCenter.x <= item.x + item.width &&
          pinchCenter.y >= item.y &&
          pinchCenter.y <= item.y + item.height
        ) {
          const centerX = item.x + item.width / 2;
          const centerY = item.y + item.height / 2;
          item.width *= scaleFactor;
          item.height *= scaleFactor;
          item.x = centerX - item.width / 2;
          item.y = centerY - item.height / 2;
        }
      });
    }
    
    prevDistance = currentDistance;
  } else {
    prevDistance = null;
  }
});

navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
    video.play();
    async function processVideo() {
      await hands.send({ image: video });
      requestAnimationFrame(processVideo);
    }
    processVideo();
  })
  .catch(err => {
    console.error("Error accessing the webcam: " + err);
  });
