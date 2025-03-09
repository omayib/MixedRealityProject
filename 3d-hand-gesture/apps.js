(async function () {
    // --- Setup Video and Canvas ---
    const videoElement = document.getElementById('videoElement');
    const canvasElement = document.getElementById('overlay');
    const canvasCtx = canvasElement.getContext('2d');
  
    // Adjust canvas size when video is ready
    function resizeCanvas() {
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
    }
  
    // Request webcam access
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;
    videoElement.onloadedmetadata = () => {
      resizeCanvas();
      videoElement.play();
    };
  
    // --- Setup Mediapipe Hands ---
    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });
  
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });
  
    hands.onResults(onResults);
  
    // Use Mediapipe Camera Utils to continuously send frames for processing
    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await hands.send({ image: videoElement });
      },
      width: 640,
      height: 480,
    });
    camera.start();
  
    // --- Setup Three.js Scene ---
    const scene = new THREE.Scene();
    const camera3D = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Append the Three.js canvas so that it overlays on top of the video/canvas
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = 3;
    document.body.appendChild(renderer.domElement);
  
    // Create a simple 3D cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshNormalMaterial();
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
  
    camera3D.position.z = 5;
  
    // Flag to control 3D object visibility
    let show3DObject = false;
  
    // Animation loop for Three.js
    function animate() {
      requestAnimationFrame(animate);
      if (show3DObject) {
        // Here, cube.rotation is updated in onResults based on hand rotation.
        // You can add further animations if desired.
      }
      renderer.render(scene, camera3D);
    }
    animate();
  
    // --- Process Hand Gesture Results ---
    function onResults(results) {
      canvasCtx.save();
      // Clear the overlay canvas
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
  
        // Draw hand landmarks and connections for visual feedback
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
          color: '#00FF00',
          lineWidth: 5,
        });
        drawLandmarks(canvasCtx, landmarks, {
          color: '#FF0000',
          lineWidth: 2,
        });
  
        // --- Hand Open Detection Heuristic ---
        // This is a simple heuristic: we measure the distance between the wrist (landmark 0)
        // and the index finger tip (landmark 8). If above a threshold, we assume the hand is open.
        const wrist = landmarks[0];
        const indexTip = landmarks[8];
        const dx = indexTip.x - wrist.x;
        const dy = indexTip.y - wrist.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0.2) {
          show3DObject = true;
        } else {
          show3DObject = false;
        }
  
        // --- Calculate Hand Rotation ---
        // Estimate the angle of the hand using the wrist and index finger tip positions.
        // You can refine this calculation by considering additional landmarks.
        const angle = Math.atan2(indexTip.y - wrist.y, indexTip.x - wrist.x);
        // Rotate the cube 360° based on the detected angle
        cube.rotation.y = angle;
      } else {
        show3DObject = false;
      }
      canvasCtx.restore();
    }
  })();
  