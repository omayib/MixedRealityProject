document.addEventListener('DOMContentLoaded', function() {
    const upload = document.getElementById('upload');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const processButton = document.getElementById('process');
    const operationSelect = document.getElementById('operation');
    const channelsContainer = document.getElementById('channels');
    let originalImageData = null;
    
    // Load gambar dan tampilkan pada canvas
    upload.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          // Simpan data asli agar bisa diolah ulang
          originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          // Bersihkan container channel jika ada gambar sebelumnya
          channelsContainer.innerHTML = '';
        }
        img.src = event.target.result;
      }
      reader.readAsDataURL(file);
    });
    
    // Proses gambar sesuai pilihan operasi
    processButton.addEventListener('click', function() {
      if (!originalImageData) return;
      const op = operationSelect.value;
      let resultImageData;
      
      // Hapus kontainer channel untuk memastikan tidak ada tampilan campuran
      channelsContainer.innerHTML = '';
      
      switch(op) {
        case 'grayscale': {
          let imgData = new ImageData(new Uint8ClampedArray(originalImageData.data), originalImageData.width, originalImageData.height);
          resultImageData = toGrayscale(imgData);
          ctx.putImageData(resultImageData, 0, 0);
          break;
        }
        case 'edgeRight': {
          let imgData = new ImageData(new Uint8ClampedArray(originalImageData.data), originalImageData.width, originalImageData.height);
          imgData = toGrayscale(imgData);
          const kernelRight = [
            -1, 0, 1,
            -2, 0, 2,
            -1, 0, 1
          ];
          resultImageData = convolveGrayscale(imgData, kernelRight, 'right');
          ctx.putImageData(resultImageData, 0, 0);
          break;
        }
        case 'edgeTop': {
          let imgData = new ImageData(new Uint8ClampedArray(originalImageData.data), originalImageData.width, originalImageData.height);
          imgData = toGrayscale(imgData);
          const kernelTop = [
            -1, -2, -1,
             0,  0,  0,
             1,  2,  1
          ];
          resultImageData = convolveGrayscale(imgData, kernelTop, 'top');
          ctx.putImageData(resultImageData, 0, 0);
          break;
        }
        case 'blur': {
          const kernelBlur = [
            1/9, 1/9, 1/9,
            1/9, 1/9, 1/9,
            1/9, 1/9, 1/9
          ];
          resultImageData = convolveColor(originalImageData, kernelBlur);
          ctx.putImageData(resultImageData, 0, 0);
          break;
        }
        case 'separate': {
          // Tampilkan hasil channel terpisah dalam container tersendiri
          separateChannels(originalImageData);
          // Kita biarkan canvas utama tidak diubah (atau bisa juga direset ke gambar asli)
          ctx.putImageData(originalImageData, 0, 0);
          break;
        }
        default:
          return;
      }
    });
    
    // --- Fungsi Pendukung ---
    
    // Konversi ke grayscale (menggunakan rumus bobot)
    function toGrayscale(imageData) {
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
        data[i] = data[i+1] = data[i+2] = gray;
      }
      return imageData;
    }
    
    // Konvolusi untuk gambar grayscale (untuk deteksi tepi)
    function convolveGrayscale(imageData, kernel, directional) {
      const width = imageData.width;
      const height = imageData.height;
      const src = imageData.data;
      const output = new ImageData(width, height);
      const dst = output.data;
      const kernelSize = Math.sqrt(kernel.length);
      const half = Math.floor(kernelSize / 2);
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let sum = 0;
          for (let ky = -half; ky <= half; ky++) {
            for (let kx = -half; kx <= half; kx++) {
              const posX = x + kx;
              const posY = y + ky;
              if (posX >= 0 && posX < width && posY >= 0 && posY < height) {
                const i = (posY * width + posX) * 4;
                const pixel = src[i]; // Karena sudah grayscale, R=G=B
                const k = kernel[(ky + half) * kernelSize + (kx + half)];
                sum += pixel * k;
              }
            }
          }
          const idx = (y * width + x) * 4;
          if (directional === 'right') {
            sum = sum > 0 ? sum : 0;
          } else if (directional === 'top') {
            sum = sum < 0 ? -sum : 0;
          } else {
            sum = Math.abs(sum);
          }
          sum = sum > 255 ? 255 : sum;
          dst[idx] = dst[idx+1] = dst[idx+2] = sum;
          dst[idx+3] = 255;
        }
      }
      return output;
    }
    
    // Konvolusi untuk gambar berwarna (misalnya untuk efek blur)
    function convolveColor(imageData, kernel) {
      const width = imageData.width;
      const height = imageData.height;
      const src = imageData.data;
      const output = new ImageData(width, height);
      const dst = output.data;
      const kernelSize = Math.sqrt(kernel.length);
      const half = Math.floor(kernelSize / 2);
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let sumR = 0, sumG = 0, sumB = 0;
          for (let ky = -half; ky <= half; ky++) {
            for (let kx = -half; kx <= half; kx++) {
              const posX = x + kx;
              const posY = y + ky;
              if (posX >= 0 && posX < width && posY >= 0 && posY < height) {
                const i = (posY * width + posX) * 4;
                const k = kernel[(ky + half) * kernelSize + (kx + half)];
                sumR += src[i] * k;
                sumG += src[i+1] * k;
                sumB += src[i+2] * k;
              }
            }
          }
          const idx = (y * width + x) * 4;
          dst[idx]   = Math.min(Math.max(sumR, 0), 255);
          dst[idx+1] = Math.min(Math.max(sumG, 0), 255);
          dst[idx+2] = Math.min(Math.max(sumB, 0), 255);
          dst[idx+3] = 255;
        }
      }
      return output;
    }
    
    // Fungsi untuk memisahkan kanal warna RGB
    function separateChannels(imageData) {
      const width = imageData.width;
      const height = imageData.height;
      const src = imageData.data;
      
      // Buat ImageData untuk masing-masing channel
      const redData = new ImageData(width, height);
      const greenData = new ImageData(width, height);
      const blueData = new ImageData(width, height);
      
      for (let i = 0; i < src.length; i += 4) {
        // Red channel: hanya komponen merah yang ditampilkan
        redData.data[i] = src[i];
        redData.data[i+1] = 0;
        redData.data[i+2] = 0;
        redData.data[i+3] = src[i+3];
        
        // Green channel: hanya komponen hijau yang ditampilkan
        greenData.data[i] = 0;
        greenData.data[i+1] = src[i+1];
        greenData.data[i+2] = 0;
        greenData.data[i+3] = src[i+3];
        
        // Blue channel: hanya komponen biru yang ditampilkan
        blueData.data[i] = 0;
        blueData.data[i+1] = 0;
        blueData.data[i+2] = src[i+2];
        blueData.data[i+3] = src[i+3];
      }
      
      // Fungsi untuk membuat canvas baru dan menampilkan imageData
      function createChannelCanvas(channelName, data) {
        const channelCanvas = document.createElement('canvas');
        channelCanvas.width = width;
        channelCanvas.height = height;
        channelCanvas.className = 'channel-canvas';
        const context = channelCanvas.getContext('2d');
        context.putImageData(data, 0, 0);
        // Tambahkan judul di atas canvas
        const title = document.createElement('p');
        title.innerText = channelName;
        const container = document.createElement('div');
        container.style.display = 'inline-block';
        container.style.textAlign = 'center';
        container.style.marginRight = '10px';
        container.appendChild(title);
        container.appendChild(channelCanvas);
        return container;
      }
      
      // Tambahkan canvas untuk masing-masing channel ke dalam container
      channelsContainer.appendChild(createChannelCanvas('Red Channel', redData));
      channelsContainer.appendChild(createChannelCanvas('Green Channel', greenData));
      channelsContainer.appendChild(createChannelCanvas('Blue Channel', blueData));
    }
  });
  