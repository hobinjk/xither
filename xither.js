import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.18/+esm';

const Methods = {
  Atkinson: 'Atkinson',
  FloydSteinberg: 'Floyd-Steinberg',
};

const Models = {
  Accurate: 'Accurate',
  Average: 'Average',
};

const options = {
  ditherScale: 5,
  method: Methods.Atkinson,
  model: Models.Accurate,
};

const gui = new GUI();
gui.add(options, 'ditherScale', 1, 32, 1);
gui.add(options, 'method', Object.values(Methods));
gui.add(options, 'model', Object.values(Models));

gui.onChange(() => {
  dither(input);
});


const canvasContainer = document.querySelector('.canvas-container');

const input = document.createElement('img');
input.src = './test.jpg';
input.onload = function() {
  dither(input);
};

function dither(image) {
  const canvas = document.createElement('canvas');
  const imageWidth = parseInt(image.width);
  const imageHeight = parseInt(image.height);
  const gfx = canvas.getContext('2d');
  const width = Math.round(imageWidth / options.ditherScale);
  const height = Math.round(imageHeight / options.ditherScale);
  gfx.width = width;
  gfx.height = height;
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = imageWidth + 'px';
  canvas.style.height = imageHeight + 'px';

  gfx.drawImage(image, 0, 0, width, height);

  const imageData = gfx.getImageData(0, 0, width, height);
  const outData = gfx.createImageData(width, height);

  const pixels = new Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let i = y * width + x;
      let r = imageData.data[4 * i + 0] / 255;
      let g = imageData.data[4 * i + 1] / 255;
      let b = imageData.data[4 * i + 2] / 255;

      let pixel = 0;
      if (options.model === Models.Accurate) {
        pixel = Math.sqrt(
          0.299 * r * r +
          0.587 * g * g +
          0.114 * b * b);
      } else if (options.model === Models.Average) {
        pixel = (r + g + b) / 3;
      }

      pixels[i] = pixel;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let i = y * width + x;
      let pixel = pixels[i];
      let newPixel = pixel > 0.5 ? 1 : 0;
      let error = pixel - newPixel;

      // floyd-steinberg
      if (options.method === Methods.FloydSteinberg) {
        pixels[(x + 1) + y * width] += error * 7 / 16;
        pixels[(x - 1) + (y + 1) * width] += error * 3 / 16;
        pixels[(x + 0) + (y + 1) * width] += error * 5 / 16;
        pixels[(x + 1) + (y + 1) * width] += error * 1 / 16;
      } else if (options.method === Methods.Atkinson) {
        pixels[(x + 1) + (y + 0) * width] += error / 8;
        pixels[(x + 2) + (y + 0) * width] += error / 8;
        pixels[(x - 1) + (y + 1) * width] += error / 8;
        pixels[(x + 0) + (y + 1) * width] += error / 8;
        pixels[(x - 1) + (y + 1) * width] += error / 8;
        pixels[(x + 0) + (y + 2) * width] += error / 8;
      }

      outData.data[4 * i + 0] = newPixel * 255;
      outData.data[4 * i + 1] = newPixel * 255;
      outData.data[4 * i + 2] = newPixel * 255;
      outData.data[4 * i + 3] = 255;
    }
  }
  gfx.putImageData(outData, 0, 0);
  let existing = document.querySelector('canvas');
  if (existing) {
    existing.parentNode.removeChild(existing);
  }
  canvasContainer.appendChild(canvas);
}
