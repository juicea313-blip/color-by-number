const uploadInput = document.getElementById("upload");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const paletteDiv = document.getElementById("palette");
let currentColor = null;
let imageData = null;
let userProgress = {};

uploadInput.addEventListener("change", handleUpload);
document.getElementById("save").addEventListener("click", saveProgress);
document.getElementById("load").addEventListener("click", loadProgress);
document.getElementById("download").addEventListener("click", downloadImage);

// --- Step 1: Upload + Draw Image ---
function handleUpload(e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Convert to "posterized" fake paint-by-number style
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      posterizeImage();
      extractPalette();
    };
    img.src = event.target.result;
  };

  reader.readAsDataURL(file);
}

// --- Step 2: Posterize image (reduce colors) ---
function posterizeImage(levels = 6) {
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i] = Math.floor(imageData.data[i] / (256 / levels)) * (256 / levels);
    imageData.data[i+1] = Math.floor(imageData.data[i+1] / (256 / levels)) * (256 / levels);
    imageData.data[i+2] = Math.floor(imageData.data[i+2] / (256 / levels)) * (256 / levels);
  }
  ctx.putImageData(imageData, 0, 0);
}

// --- Step 3: Extract palette from image ---
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

// --- Step 4: Color regions ---
canvas.addEventListener("click", function(e) {
  if (!currentColor) return;
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(e.clientX - rect.left);
  const y = Math.floor(e.clientY - rect.top);

  const index = (y * canvas.width + x) * 4;
  const targetColor = `rgb(${imageData.data[index]},${imageData.data[index+1]},${imageData.data[index+2]})`;

  if (!userProgress[targetColor]) userProgress[targetColor] = [];
  userProgress[targetColor].push([x, y]);

  // Darken clicked pixel for visual feedback
  ctx.fillStyle = currentColor;
  ctx.fillRect(x, y, 1, 1);
});

// --- Step 5: Save/Load Progress ---
function saveProgress() {
  localStorage.setItem("colorByNumberProgress", JSON.stringify(userProgress));
  alert("Progress saved!");
}

function loadProgress() {
  const saved = localStorage.getItem("colorByNumberProgress");
  if (saved) {
    userProgress = JSON.parse(saved);
    redrawProgress();
    alert("Progress loaded!");
  }
}

function redrawProgress() {
  for (let color in userProgress) {
    ctx.fillStyle = color;
    userProgress[color].forEach(([x, y]) => {
      ctx.fillRect(x, y, 1, 1);
    });
  }
}

// --- Step 6: Download Final ---
function downloadImage() {
  const link = document.createElement("a");
  link.download = "color-by-number.png";
  link.href = canvas.toDataURL();
  link.click();
}
