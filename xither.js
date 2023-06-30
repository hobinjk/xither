import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.18/+esm';

const Methods = {
  Atkinson: 'Atkinson',
  FloydSteinberg: 'Floyd-Steinberg',
};

const Models = {
  Color: 'Color',
  Accurate: 'Gray (Accurate)',
  Average: 'Gray (Average)',
};

const Palettes = {
  Gray: [
    {r: 0, g: 0, b: 0},
    {r: 1, g: 1, b: 1},
  ],
  GrayRed: [
    {r: 0, g: 0, b: 0},
    {r: 1, g: 1, b: 1},
    // {r: 1, g: 0, b: 0},
    {r: 0.8, g: 0, b: 0},
    // {r: 0.6, g: 0, b: 0},
    // {r: 0.4, g: 0, b: 0},
    // {r: 0.2, g: 0, b: 0},
  ],
};

const options = {
  ditherScale: 5,
  method: Methods.Atkinson,
  model: Models.Accurate,
  palette: 'Gray',
};

const gui = new GUI();
gui.add(options, 'ditherScale', 1, 12, 1);
gui.add(options, 'method', Object.values(Methods));
gui.add(options, 'model', Object.values(Models));
gui.add(options, 'palette', Object.keys(Palettes));

gui.onChange(() => {
  dither(input);
});


const canvasContainer = document.querySelector('.canvas-container');

const input = document.createElement('img');
input.src = './test.jpg';
input.onload = function() {
  dither(input);
};

function pixelSub(a, b) {
  return {
    r: a.r - b.r,
    g: a.g - b.g,
    b: a.b - b.b,
  };
}

function pixelAddInPlace(a, b) {
  if (!a) {
    return;
  }
  a.r += b.r;
  a.g += b.g;
  a.b += b.b;
}

function pixelMul(a, v) {
  return {
    r: a.r * v,
    g: a.g * v,
    b: a.b * v,
  };
}

function pixelDistSq(a, b) {
  let diff = pixelSub(a, b);
  return diff.r * diff.r + diff.g * diff.g + diff.b * diff.b;
}

function dither(image) {
  const palette = Palettes[options.palette];
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

      if (options.model === Models.Accurate) {
        r = g = b = Math.sqrt(
          0.299 * r * r +
          0.587 * g * g +
          0.114 * b * b);
      } else if (options.model === Models.Average) {
        r = g = b = (r + g + b) / 3;
      }

      pixels[i] = {
        r,
        g,
        b,
      };
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let i = y * width + x;
      let pixel = pixels[i];
      let minDist = 2000;
      let newPixel = palette[0];
      for (let testPixel of palette) {
        let dist = pixelDistSq(pixel, testPixel);
        if (dist > minDist) {
          continue;
        }
        minDist = dist;
        newPixel = testPixel;
      }

      let error = pixelSub(pixel, newPixel);

      // floyd-steinberg
      if (options.method === Methods.FloydSteinberg) {
        pixelAddInPlace(pixels[(x + 1) + y * width], pixelMul(error, 7 / 16));
        pixelAddInPlace(pixels[(x - 1) + (y + 1) * width], pixelMul(error, 3 / 16));
        pixelAddInPlace(pixels[(x + 0) + (y + 1) * width], pixelMul(error, 5 / 16));
        pixelAddInPlace(pixels[(x + 1) + (y + 1) * width], pixelMul(error, 1 / 16));
      } else if (options.method === Methods.Atkinson) {
        pixelAddInPlace(pixels[(x + 1) + (y + 0) * width], pixelMul(error, 1 / 8));
        pixelAddInPlace(pixels[(x + 2) + (y + 0) * width], pixelMul(error, 1 / 8));
        pixelAddInPlace(pixels[(x - 1) + (y + 1) * width], pixelMul(error, 1 / 8));
        pixelAddInPlace(pixels[(x + 0) + (y + 1) * width], pixelMul(error, 1 / 8));
        pixelAddInPlace(pixels[(x - 1) + (y + 1) * width], pixelMul(error, 1 / 8));
        pixelAddInPlace(pixels[(x + 0) + (y + 2) * width], pixelMul(error, 1 / 8));
      }

      outData.data[4 * i + 0] = newPixel.r * 255;
      outData.data[4 * i + 1] = newPixel.g * 255;
      outData.data[4 * i + 2] = newPixel.b * 255;
      outData.data[4 * i + 3] = 255;
    }
  }
  gfx.putImageData(outData, 0, 0);
  canvasContainer.innerHTML = '';
  canvasContainer.appendChild(canvas);
  canvasContainer.appendChild(image);
}
