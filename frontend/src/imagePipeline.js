const MB = 1024 * 1024;

function dataUrlApproxBytes(dataUrl) {
  const payload = String(dataUrl || "").split(",")[1] || "";
  return Math.round((payload.length * 3) / 4);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Cannot read image"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Cannot load image"));
    img.src = src;
  });
}

function drawToCanvas(img, width, height, cropSquare) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");

  if (cropSquare) {
    const minSide = Math.min(img.width, img.height);
    const sx = Math.floor((img.width - minSide) / 2);
    const sy = Math.floor((img.height - minSide) / 2);
    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, width, height);
  } else {
    ctx.drawImage(img, 0, 0, width, height);
  }

  return canvas;
}

function normalizedSize(img, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  return {
    width: Math.max(1, Math.round(img.width * scale)),
    height: Math.max(1, Math.round(img.height * scale)),
  };
}

export async function compressImageToDataUrl(file, profile) {
  if (!file || !String(file.type || "").startsWith("image/")) {
    throw new Error(profile.invalidTypeMessage || "Select an image file");
  }
  if (file.size > (profile.maxInputBytes || 7 * MB)) {
    throw new Error(profile.tooLargeInputMessage || "Image file is too large");
  }

  const sourceUrl = await readFileAsDataUrl(file);
  const img = await loadImage(sourceUrl);

  const maxOutputBytes = profile.maxOutputBytes || 300 * 1024;
  const qualitySteps = profile.qualitySteps || [0.86, 0.78, 0.7, 0.62, 0.54];
  const downscaleSteps = profile.downscaleSteps || [1, 0.85, 0.72, 0.6, 0.5];

  let best = null;
  for (const downscale of downscaleSteps) {
    const baseSide = Math.max(1, Math.round((profile.maxSide || 1280) * downscale));
    const size = profile.cropSquare
      ? { width: baseSide, height: baseSide }
      : normalizedSize(img, baseSide);
    const canvas = drawToCanvas(img, size.width, size.height, Boolean(profile.cropSquare));

    for (const q of qualitySteps) {
      const dataUrl = canvas.toDataURL("image/jpeg", q);
      const bytes = dataUrlApproxBytes(dataUrl);
      if (!best || bytes < best.bytes) {
        best = { dataUrl, bytes, width: size.width, height: size.height, quality: q };
      }
      if (bytes <= maxOutputBytes) {
        return {
          dataUrl,
          bytes,
          width: size.width,
          height: size.height,
          mime: "image/jpeg",
        };
      }
    }
  }

  return {
    dataUrl: best.dataUrl,
    bytes: best.bytes,
    width: best.width,
    height: best.height,
    mime: "image/jpeg",
  };
}

export const IMAGE_PROFILES = {
  avatar: {
    cropSquare: true,
    maxSide: 320,
    maxInputBytes: 7 * MB,
    maxOutputBytes: 110 * 1024,
    tooLargeInputMessage: "Файл слишком большой. Выберите изображение до 7 МБ.",
    invalidTypeMessage: "Выберите файл изображения",
  },
  chatImage: {
    cropSquare: false,
    maxSide: 1280,
    maxInputBytes: 10 * MB,
    maxOutputBytes: 190 * 1024,
    tooLargeInputMessage: "Файл слишком большой. Выберите изображение до 10 МБ.",
    invalidTypeMessage: "Выберите файл изображения",
  },
};
