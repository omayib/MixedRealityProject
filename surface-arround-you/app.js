let utils = new Utils('errorMessage');


let streaming = false;
let videoInput = document.getElementById('videoInput');
let startAndStop = document.getElementById('startAndStop');
let canvasOutput = document.getElementById('canvasOutput');
let canvasContext = canvasOutput.getContext('2d');
let gifOverlay = document.getElementById('gifOverlay');

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
    gifOverlay.style.display = "none"; // hide gif when stopped
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

    // Containers for contours
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();

    const FPS = 30;
    function processVideo() {
        try {
            if (!streaming) {
                // Clean and stop.
                src.delete();
                dst.delete();
                gray.delete();
                contours.delete();
                hierarchy.delete();
                return;
            }
            let begin = Date.now();
            cap.read(src);
            
            // Convert frame to grayscale.
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
            
            // Apply threshold to get binary image.
            cv.threshold(gray, dst, 200, 255, cv.THRESH_BINARY);
            
            // Clone threshold image for contour detection.
            let threshClone = dst.clone();
            cv.findContours(threshClone, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
            threshClone.delete();
            gifOverlay.style.display = "none";
            
            // Draw contours on the original color image.
            const MIN_AREA = 500; // adjust this value as needed

            let surfaceDetected = false;
            for (let i = 0; i < contours.size(); ++i) {
                let cnt = contours.get(i);
                let area = cv.contourArea(cnt, false);
                // Create a Mat from the contour points if needed
                let [vx, vy, x0, y0] = [new cv.Mat(), new cv.Mat(), new cv.Mat(), new cv.Mat()];
                let line = new cv.Mat();
                // fitLine returns a vector with 4 values: [vx, vy, x0, y0]
                cv.fitLine(cnt, line, cv.DIST_L2, 0, 0.01, 0.01);
                
                // Extract the vector components
                let vx_val = line.data32F[0];
                let vy_val = line.data32F[1];
                // Calculate angle in degrees
                let angle = Math.atan2(vy_val, vx_val) * (180 / Math.PI);
                
                // Normalize angle to [0, 180)
                angle = (angle + 180) % 180;
                console.log(angle)
                 // Consider the contour horizontal if the angle is close to 0° or 180° (with a tolerance, e.g., ±15°)
                if (angle < 15 || angle > 165) {
                    if (area > MIN_AREA) {
                        // Optionally, you can further filter for horizontal contours.
                        // For a simple horizontal check, you might use the bounding rectangle.
                        let rect = cv.boundingRect(cnt);
                        if (rect.width > 1.5 * rect.height) { // example condition for horizontal shape
                            let color = new cv.Scalar(
                                Math.round(Math.random() * 255),
                                Math.round(Math.random() * 255),
                                Math.round(Math.random() * 255),
                                255
                            );
                            // Draw contour on the original image (or any image you'd like).
                            cv.drawContours(src, contours, i, color, 2, cv.LINE_8, hierarchy, 0);
                            // Position the GIF overlay on top of the detected surface.
                            let videoRect = videoInput.getBoundingClientRect();
                            gifOverlay.style.display = "block";
                            gifOverlay.style.left = (videoRect.left + rect.x) + "px";
                            gifOverlay.style.top = (videoRect.top + rect.y) + "px";
                            gifOverlay.style.width = rect.width + "px";
                            gifOverlay.style.height = rect.height + "px";
                            surfaceDetected = true;
                            // If you want to only show the gif for the first valid surface, you can break here.
                            break;
                        }
                    }
                }
                
                line.delete();
                vx.delete(); vy.delete(); x0.delete(); y0.delete();
            }
            // If no valid surface is detected, hide the GIF.
            if (!surfaceDetected) {
                gifOverlay.style.display = "none";
            }
            cv.imshow('canvasOutput', src);
            let delay = 1000 / FPS - (Date.now() - begin);
            setTimeout(processVideo, delay);
        } catch (err) {
            utils.printError(err);
        }
    };
    setTimeout(processVideo, 0);
}