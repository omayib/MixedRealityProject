function startApp() {
    let imgElement = document.getElementById('upload');
    let canvas = document.getElementById('output');
    let ctx = canvas.getContext('2d');
  
    imgElement.addEventListener('change', (e) => {
      let file = e.target.files[0];
      let reader = new FileReader();
      reader.onload = function(event) {
        let img = new Image();
        img.onload = function() {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  
    document.getElementById('process').addEventListener('click', () => {
      let algorithm = document.getElementById('algorithm').value;
      let src = cv.imread(canvas);
      let gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  
      if (algorithm === 'harris') {
        detectHarris(gray, src);
      } else {
        detectShiTomasi(gray, src);
      }
  
      cv.imshow('output', src);
      src.delete();
      gray.delete();
    });
  }
  
  function detectHarris(gray, dst) {
    let dstHarris = new cv.Mat();
    let dstNorm = new cv.Mat();
    let dstNormScaled = new cv.Mat();
  
    cv.cornerHarris(gray, dstHarris, 2, 3, 0.04);
    cv.normalize(dstHarris, dstNorm, 0, 255, cv.NORM_MINMAX);
    cv.convertScaleAbs(dstNorm, dstNormScaled);
  
    for (let i = 0; i < dstNorm.rows; i++) {
      for (let j = 0; j < dstNorm.cols; j++) {
        if (dstNorm.ucharPtr(i, j)[0] > 125) {
          cv.circle(dst, new cv.Point(j, i), 5, [255, 0, 0, 255], 2);
        }
      }
    }
  
    dstHarris.delete();
    dstNorm.delete();
    dstNormScaled.delete();
  }
  
  function detectShiTomasi(gray, dst) {
    let corners = new cv.Mat();
    let maxCorners = 100;
    let qualityLevel = 0.01;
    let minDistance = 10;
  
    cv.goodFeaturesToTrack(gray, corners, maxCorners, qualityLevel, minDistance);
  
    for (let i = 0; i < corners.rows; ++i) {
      let x = corners.data32F[i * 2];
      let y = corners.data32F[i * 2 + 1];
      cv.circle(dst, new cv.Point(x, y), 5, [0, 255, 0, 255], 2);
    }
  
    corners.delete();
  }
  