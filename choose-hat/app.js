    // --- Configurable Video Scale Factor ---
    const videoScale = 1.2; // Adjust this value to scale the video and overlay

    // Global state variables
    let currentHatType = 0;        // Determines which hat image to draw (0, 1, or 2)
    let hoveredButtonId = null;      // Tracks the currently hovered button, if any
    let faceLandmarks = null;        // Latest face landmarks from FaceMesh
    let handIndexTip = null;         // Latest index finger tip coordinates from Hands

    // Define three button regions on the overlay canvas
    const buttons = [
      { id: 0, label: 'Hat 1', x: 20,  y: 20, width: 100, height: 40 },
      { id: 1, label: 'Hat 2', x: 140, y: 20, width: 100, height: 40 },
      { id: 2, label: 'Hat 3', x: 260, y: 20, width: 100, height: 40 }
    ];

    // Load hat images – update these sources to your own hat image paths
    const hatImages = [];
    for (let i = 0; i < 3; i++) {
      hatImages.push(new Image());
    }
    hatImages[0].src = 'assets/cap1.png'; // Replace with your hat image URL or local file
    hatImages[1].src = 'assets/cap2.png';
    hatImages[2].src = 'assets/cap3.png';

    // Get DOM elements
    const videoElement = document.getElementById('video');
    const canvasElement = document.getElementById('overlay');
    const canvasCtx = canvasElement.getContext('2d');

    // Apply scaling transforms to video and canvas
    videoElement.style.transform = `scale(${videoScale})`;
    canvasElement.style.transform = `scale(${videoScale})`;

    // Adjust the canvas size when video metadata loads
    videoElement.addEventListener('loadedmetadata', () => {
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
    });

    // Draw the entire overlay (hat image, buttons, and optional hand indicator)
    function drawOverlay() {
      // Clear the canvas
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

      // If a face is detected, compute head position and draw the hat image.
      if (faceLandmarks) {
        // Compute the bounding box for the face
        let minX = 1, minY = 1, maxX = 0, maxY = 0;
        faceLandmarks.forEach(pt => {
          if (pt.x < minX) minX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y > maxY) maxY = pt.y;
        });
        // Head center and top in canvas coordinates
        const headCenterX = ((minX + maxX) / 2) * canvasElement.width;
        const headTopY = minY * canvasElement.height;
        // Compute head width based on landmark bounding box
        const headWidth = (maxX - minX) * canvasElement.width;

        // Calculate rotation angle based on eye positions (landmarks 33 and 263)
        const leftEye = faceLandmarks[33];
        const rightEye = faceLandmarks[263];
        const dx = (rightEye.x - leftEye.x) * canvasElement.width;
        const dy = (rightEye.y - leftEye.y) * canvasElement.height;
        const angle = Math.atan2(dy, dx);

        // Draw the hat image with its width matching the head width.
        drawHat(canvasCtx, headCenterX, headTopY, angle, currentHatType, headWidth);
      }

      // Draw the on-canvas buttons
      buttons.forEach(button => {
        // Semi-transparent background
        canvasCtx.fillStyle = "rgba(255, 255, 255, 0.3)";
        canvasCtx.fillRect(button.x, button.y, button.width, button.height);
        // Button border
        canvasCtx.strokeStyle = "white";
        canvasCtx.strokeRect(button.x, button.y, button.width, button.height);
        // Button label
        canvasCtx.fillStyle = "white";
        canvasCtx.font = "16px sans-serif";
        canvasCtx.fillText(button.label, button.x + 10, button.y + 25);
      });

      // Optional: Draw a small circle at the detected index finger tip (for debugging)
      if (handIndexTip) {
        canvasCtx.beginPath();
        canvasCtx.arc(handIndexTip.x, handIndexTip.y, 5, 0, 2 * Math.PI);
        canvasCtx.fillStyle = "yellow";
        canvasCtx.fill();
      }
    }

    // Draw the hat image on the canvas.
    // The hat's bottom center will align with (x, y), and the image is rotated by 'angle'.
    // hatWidth is set to headWidth.
    function drawHat(ctx, x, y, angle, hatType, headWidth) {
      const img = hatImages[hatType];
      if (!img.complete) {
        // Skip drawing if the image isn't loaded yet.
        return;
      }
      // Set hat dimensions so its width equals headWidth.
      const hatWidth = headWidth;
      // Compute hat height based on the image's natural aspect ratio.
      const aspectRatio = img.naturalHeight / img.naturalWidth;
      const hatHeight = hatWidth * aspectRatio;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      // Draw the image such that its bottom center aligns with (0,0)
      ctx.drawImage(img, -hatWidth / 2, -hatHeight, hatWidth, hatHeight);
      ctx.restore();
    }

    // Callback for FaceMesh: update face landmarks and redraw overlay.
    function onFaceResults(results) {
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        faceLandmarks = results.multiFaceLandmarks[0];
      } else {
        faceLandmarks = null;
      }
      drawOverlay();
    }

    // Callback for Hands: update index finger tip position and check for button hover.
    function onHandsResults(results) {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        // The index finger tip is landmark 8.
        handIndexTip = {
          x: landmarks[8].x * canvasElement.width,
          y: landmarks[8].y * canvasElement.height
        };
        // Check if the index finger is over any button.
        buttons.forEach(button => {
          if (
            handIndexTip.x >= button.x &&
            handIndexTip.x <= button.x + button.width &&
            handIndexTip.y >= button.y &&
            handIndexTip.y <= button.y + button.height
          ) {
            if (hoveredButtonId !== button.id) {
              hoveredButtonId = button.id;
              currentHatType = button.id;
            }
          } else {
            if (hoveredButtonId === button.id) {
              hoveredButtonId = null;
            }
          }
        });
      } else {
        handIndexTip = null;
        hoveredButtonId = null;
      }
      drawOverlay();
    }

    // Initialize MediaPipe FaceMesh for head tracking.
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    faceMesh.onResults(onFaceResults);

    // Initialize MediaPipe Hands for finger detection.
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    });
    hands.onResults(onHandsResults);

    // Setup the camera stream using MediaPipe Camera Utils.
    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await faceMesh.send({ image: videoElement });
        await hands.send({ image: videoElement });
      },
      width: 640,
      height: 480
    });
    camera.start();