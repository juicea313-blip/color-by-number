const uploadInput = document.getElementById("upload");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const paletteDiv = document.getElementById("palette");
const colorSlider = document.getElementById("colorSlider");
const colorCountInput = document.getElementById("colorCount");
const revealToggle = document.getElementById("revealToggle");
const createOutlineBtn = document.getElementById("createOutline");

let currentColor = null;
let imageData = null;
let originalImage = null;
let userProgress = {};
let numColors = 6;

// --- Upload + store original image ---
uploadInput.addEventListener("change", handleUpload);

function handleUpload(e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      originalImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    };
    img.src = event.target.result;
  };

  reader.readAsDataURL(file);
}

// --- Sync slider and text input ---
colorSlider.addEventListener("input", () => {
  numColors = parseInt(colorSlider.value);
  colorCountInput.value = numColors;
});

colorCountInput.addEventListener("input", () => {
  numColors = parseInt(colorCountInput.value);
  colorSlider.value = numColors;
});

// --- Create outline on demand ---
createOutlineBtn.addEventListener("click", () => {
  if (!originalImage) {
    alert("Please upload an image first.");
    return;
  }
  imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  posterizeImage(numColors);
  extractPalette();
});

// --- Posterize image (reduce colors) ---
function posterizeImage(levels = 6) {
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i] = Math.floor(imageData.data[i] / (256 / levels)) * (256 / levels);
    imageData.data[i+1] = Math.floor(imageData.data[i+1] / (256 / levels)) * (256 / levels);
    imageData.data[i+2] = Math.floor(imageData.data[i+2] / (256 / levels)) * (256 / levels);
  }
  ctx.putImageData(imageData, 0, 0);
}

// --- Extract palette from posterized image ---
function extractPalette() {
  let colors = new Set();
  for (let i = 0; i < imageData.data.length; i += 4) {
    let rgb = `rgb(${imageData.data[i]},${imageData.data[i+1]},${imageData.data[i+2]})`;
    colors.add(rgb);
  }
  paletteDiv.innerHTML = "";
  [...colors].slice(0, 12).forEach(color => {
    const swatch = document.createElement("div");
    swatch.classList.add("color-swatch");
    swatch.style.backgroundColor = color;
    swatch.addEventListener("click", () => currentColor = color);
    paletteDiv.appendChild(swatch);
  });
}

// --- Coloring interaction ---
canvas.addEventListener("click", function(e) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(e.clientX - rect.left);
  const y = Math.floor(e.clientY - rect.top);

  const index = (y * canvas.width + x) * 4;
  const targetColor = `rgb(${imageData.data[index]},${imageData.data[index+1]},${imageData.data[index+2]})`;

  if (!userProgress[targetColor]) userProgress[targetColor] = [];

  if (revealToggle.checked) {
    // Reveal mode → show original image section
    const r = originalImage.data[index];
    const g = originalImage.data[index+1];
    const b = originalImage.data[index+2];
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, y, 1, 1);
    userProgress[targetColor].push([x, y, r, g, b]);
  } else {
    if (!currentColor) return;
    ctx.fillStyle = currentColor;
    ctx.fillRect(x, y, 1, 1);
    userProgress[targetColor].push([x, y, ...currentColor.match(/\d+/g).map(Number)]);
  }
});

// --- Save/Load Progress ---
document.getElementById("save").addEventListener("click", () => {
  localStorage.setItem("colorByNumberProgress", JSON.stringify(userProgress));
  alert("Progress saved!");
});

document.getElementById("load").addEventListener("click", () => {
  const saved = localStorage.getItem("colorByNumberProgress");
  if (saved) {
    userProgress = JSON.parse(saved);
    redrawProgress();
    alert("Progress loaded!");
  }
});

function redrawProgress() {
  ctx.putImageData(imageData, 0, 0); // reset to posterized outline
  for (let color in userProgress) {
    userProgress[color].forEach(([x, y, r, g, b]) => {
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, 1, 1);
    });
  }
}

// --- Download Final ---
document.getElementById("download").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "color-by-number.png";
  link.href = canvas.toDataURL();
  link.click();
});
