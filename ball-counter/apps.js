let streaming = false;
let videoInput = document.getElementById('videoInput');
let startAndStop = document.getElementById('startAndStop');
let canvasOutput = document.getElementById('canvasOutput');
let canvasOverlay = document.getElementById('canvasOverlay');
let canvasContext = canvasOverlay.getContext('2d');

let utils = new Utils('errorMessage');
startAndStop.addEventListener('click', () => {
    if (!streaming) {
        utils.clearError();
        utils.startCamera('qvga', onVideoStarted, 'videoInput');
    } else {
        utils.stopCamera();
        onVideoStopped();
    }
});

function onVideoStarted() {
    streaming = true;
    startAndStop.innerText = 'Stop';
    videoInput.width = videoInput.videoWidth;
    videoInput.height = videoInput.videoHeight;
    startProcess();
}

function onVideoStopped() {
    streaming = false;
    canvasContext.clearRect(0, 0, canvasOutput.width, canvasOutput.height);
    startAndStop.innerText = 'Start';
}

utils.loadOpenCv(() => {
    startAndStop.removeAttribute('disabled');
});
function startProcess(){
    let video = document.getElementById('videoInput');
    let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
    let dst = new cv.Mat(video.height, video.width, cv.CV_8UC1);
    let gray = new cv.Mat(video.height, video.width, cv.CV_8UC1);
    let cap = new cv.VideoCapture(video);
    let circles = new cv.Mat();

    const FPS = 30;
    function detect() {
        if (!streaming) {
            // Clean and stop.
            src.delete();
            dst.delete();
            gray.delete();
            return;
        }
        let begin = Date.now();
        cap.read(src);
        // Convert to grayscale
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        // Apply a Gaussian blur to reduce noise and improve circle detection
        cv.GaussianBlur(gray, gray, new cv.Size(9, 9), 2, 2);

        let kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5));
        cv.morphologyEx(gray, gray, cv.MORPH_CLOSE, kernel);
        // Use the Hough Circle Transform to detect circles.
        // Parameters: (source image, output vector, method, dp, minDist, param1, param2, minRadius, maxRadius)
        cv.HoughCircles(gray, circles, cv.HOUGH_GRADIENT, 1, gray.rows/8, 100, 30, 0, 0);
    
    
        cv.imshow('canvasOutput', src);
        // Clear previous drawings from the canvas
        canvasContext.clearRect(0, 0, canvasOutput.width, canvasOutput.height);
    
        // Count the circles. circles.data32F contains triplets [x, y, radius]
        let circleCount = circles.data32F ? circles.data32F.length / 3 : 0;
        canvasContext.font = "30px Arial";
        canvasContext.fillStyle = "red";
        canvasContext.fillText("Balls: " + circleCount, 10, 30);
        console.log(circleCount)
    
        // Draw each detected circle on the overlay canvas
        for (let i = 0; i < circleCount; i++) {
          let x = circles.data32F[i * 3];
          let y = circles.data32F[i * 3 + 1];
          let radius = circles.data32F[i * 3 + 2];
          canvasContext.beginPath();
          canvasContext.arc(x, y, radius, 0, 2 * Math.PI);
          canvasContext.lineWidth = 3;
          canvasContext.strokeStyle = 'green';
          canvasContext.stroke();
        }
        let delay = 1000 / FPS - (Date.now() - begin);
        setTimeout(detect, delay);
      }

    setTimeout(detect, 0);

}