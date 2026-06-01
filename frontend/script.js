// Global state and configurations
let currentUser = null;
let currentLanguage = 'EN';
let selectedFile = null;
let activeWebcamStream = null;
let cameraInferenceInterval = null;

// ==========================================
// 1. Particle Canvas Background Animation
// ==========================================
function initParticleCanvas() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2 + 0.5;
      this.speedX = Math.random() * 0.3 - 0.15;
      this.speedY = Math.random() * 0.3 - 0.15;
      this.alpha = Math.random() * 0.4 + 0.1;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
      if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function init() {
    particles = [];
    const count = Math.floor((canvas.width * canvas.height) / 25000);
    for (let i = 0; i < Math.min(80, count); i++) {
      particles.push(new Particle());
    }
  }
  init();
  window.addEventListener('resize', init);

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(animate);
  }
  animate();
}

// ==========================================
// 2. Sidebar Navigation & Tab Swapping
// ==========================================
function setupNavigation() {
  const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
  const pages = document.querySelectorAll('.page-view');

  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = item.getAttribute('data-tab');
      
      // Stop webcam if moving away from live camera
      if (targetTab !== 'camera') {
        stopWebcam();
      }

      // Update sidebar state
      menuItems.forEach(mi => mi.classList.remove('active'));
      item.classList.add('active');

      // Update view panels with animations
      pages.forEach(page => {
        page.classList.remove('active-panel');
      });
      const targetPanel = document.getElementById(`${targetTab}-panel`);
      if (targetPanel) {
        targetPanel.classList.add('active-panel');
      }

      // Close mobile sidebar if open
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.classList.remove('mobile-open');
      }
    });
  });

  // Hamburger toggler for tablet/mobile
  const hamburgerBtn = document.getElementById('hamburger-menu-btn');
  const sidebar = document.querySelector('.sidebar');
  if (hamburgerBtn && sidebar) {
    hamburgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('mobile-open');
    });

    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('mobile-open') && !sidebar.contains(e.target) && e.target !== hamburgerBtn) {
        sidebar.classList.remove('mobile-open');
      }
    });
  }
}

// ==========================================
// 3. User Session Manager (Auth Flow)
// ==========================================
function checkSession() {
  const storedUser = localStorage.getItem('user');
  const authContainer = document.getElementById('auth-header-container');
  
  if (!authContainer) return;

  if (storedUser) {
    try {
      currentUser = JSON.parse(storedUser);
      // Update top header with welcome message and logout button
      authContainer.innerHTML = `
        <div class="nav-user-info">
          <span class="user-welcome-text">Welcome, <strong style="color:#7c3aed;">${currentUser.name}</strong></span>
        </div>
        <button id="logout-header-btn" class="btn-auth btn-auth-login">
          <svg viewBox="0 0 24 24" style="stroke:#ef4444;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          <span style="color:#ef4444;">Logout</span>
        </button>
      `;

      // Attach logout trigger
      document.getElementById('logout-header-btn').addEventListener('click', performLogout);
    } catch (e) {
      console.error('Error parsing session user', e);
      localStorage.removeItem('user');
      showGuestHeader();
    }
  } else {
    showGuestHeader();
  }
}

function showGuestHeader() {
  const authContainer = document.getElementById('auth-header-container');
  authContainer.innerHTML = `
    <a href="login.html" class="btn-auth btn-auth-login">
      <svg viewBox="0 0 24 24">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
      <span>Login</span>
    </a>
    <a href="signup.html" class="btn-auth btn-auth-signup">
      <svg viewBox="0 0 24 24">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span>Sign Up</span>
    </a>
  `;
}

function performLogout(e) {
  if (e) e.preventDefault();
  localStorage.removeItem('user');
  currentUser = null;
  alert('Logged out successfully.');
  window.location.reload();
}

// ==========================================
// 4. Drag and Drop File Upload Processing
// ==========================================
function setupImageUpload() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-hidden-input');
  const uploadBarBtn = document.getElementById('upload-bar-btn');
  const cancelUploadBtn = document.getElementById('cancel-upload-btn');
  const detectNowBtn = document.getElementById('detect-now-btn');
  
  const uploadPrompt = document.getElementById('upload-prompt');
  const previewContainer = document.getElementById('upload-preview-container');
  const previewImg = document.getElementById('preview-img-el');
  const previewCanvas = document.getElementById('preview-canvas-overlay');
  
  const fileNameLabel = document.getElementById('preview-file-name');
  const fileSizeLabel = document.getElementById('preview-file-size');

  if (!dropZone || !fileInput) return;

  // Open file selector
  const triggerFileSelection = (e) => {
    e.stopPropagation();
    fileInput.click();
  };
  
  uploadBarBtn.addEventListener('click', triggerFileSelection);
  uploadPrompt.addEventListener('click', triggerFileSelection);

  // File selected via dialog
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  });

  // Drag and drop listeners
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  // Cancel upload selection
  cancelUploadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetUploadState();
  });

  // Handle selected file details
  function handleFileSelected(file) {
    // Validate is image
    if (!file.type.startsWith('image/')) {
      alert('Unsupported file type. Please upload a PNG, JPG, or JPEG image.');
      return;
    }

    selectedFile = file;
    fileNameLabel.textContent = file.name;
    
    // Format size
    const sizeInKb = (file.size / 1024).toFixed(1);
    fileSizeLabel.textContent = sizeInKb > 1024 
      ? `${(sizeInKb / 1024).toFixed(2)} MB` 
      : `${sizeInKb} KB`;

    // Load Preview Image
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      
      // Hide upload prompts and show preview
      uploadPrompt.style.display = 'none';
      previewContainer.style.display = 'flex';
      
      // Clear overlay canvas
      const ctx = previewCanvas.getContext('2d');
      ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      
      // Reset detection outputs
      document.getElementById('result-placeholder').style.display = 'block';
      document.getElementById('result-content').style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  // Trigger simulated image analysis
  detectNowBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!selectedFile) return;
    performImageDetection();
  });
}

function resetUploadState() {
  selectedFile = null;
  document.getElementById('file-hidden-input').value = '';
  document.getElementById('upload-prompt').style.display = 'block';
  document.getElementById('upload-preview-container').style.display = 'none';
  document.getElementById('detection-loading-state').style.display = 'none';
  
  // Clear BBoxes canvas overlay
  const previewCanvas = document.getElementById('preview-canvas-overlay');
  if (previewCanvas) {
    const ctx = previewCanvas.getContext('2d');
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  }

  // Reset metrics
  document.getElementById('result-placeholder').style.display = 'block';
  document.getElementById('result-content').style.display = 'none';
}

// ==========================================
// 5. Simulated YOLOv8 Bounding Box overlay
// ==========================================
async function performImageDetection() {
  const previewContainer = document.getElementById('upload-preview-container');
  const loadingState = document.getElementById('detection-loading-state');
  const loaderStatus = document.getElementById('loader-status-text');
  
  const resultPlaceholder = document.getElementById('result-placeholder');
  const resultContent = document.getElementById('result-content');
  const resultText = document.getElementById('result-translation');
  const resultConfidence = document.getElementById('result-confidence');
  const resultSpeed = document.getElementById('result-speed');

  // Show loader, hide preview
  previewContainer.style.display = 'none';
  loadingState.style.display = 'flex';

  // Cycle loader prompts
  let step = 0;
  const statusTexts = [
    'Initializing YOLOv8n Network...',
    'Loading Braille Weights Matrix...',
    'Running OpenCV Dot Cluster Grid Filters...',
    'Decoding Braille Bounding Boxes...',
    'Translating cells to language alphabet...'
  ];

  const intervalId = setInterval(() => {
    if (step < statusTexts.length) {
      loaderStatus.textContent = statusTexts[step];
      step++;
    }
  }, 300);

  try {
    const langSelect = document.getElementById('lang-select');
    const selectedLang = langSelect ? langSelect.value : 'EN';

    const response = await fetch('/api/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageName: selectedFile.name,
        language: selectedLang
      })
    });

    const data = await response.json();
    clearInterval(intervalId);

    if (data.success) {
      // Show result values
      resultText.textContent = data.detectedText;
      resultConfidence.textContent = data.confidence;
      resultSpeed.textContent = data.processingTime;

      // Draw bounding box graphics on canvas overlay
      drawBoundingBoxes(data.bboxes);

      // Transition panels
      loadingState.style.display = 'none';
      previewContainer.style.display = 'flex';
      resultPlaceholder.style.display = 'none';
      resultContent.style.display = 'flex';

      // Auto-TTS feedback trigger if session is active
      speakText(data.detectedText);

    } else {
      alert('Translation process failed. Please try again.');
      resetUploadState();
    }
  } catch (err) {
    clearInterval(intervalId);
    console.error('Detection request failed:', err);
    alert('Failed to connect to the backend translation service.');
    resetUploadState();
  }
}

function drawBoundingBoxes(bboxes) {
  const canvas = document.getElementById('preview-canvas-overlay');
  const img = document.getElementById('preview-img-el');
  if (!canvas || !img) return;

  // Make canvas coordinates align with natural image render sizing
  canvas.width = img.clientWidth;
  canvas.height = img.clientHeight;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  bboxes.forEach(box => {
    // Convert percentage scale to client pixels
    const x = (box.x / 100) * canvas.width;
    const y = (box.y / 100) * canvas.height;
    const w = (box.width / 100) * canvas.width;
    const h = (box.height / 100) * canvas.height;

    // Draw Box
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Bounding Box glow border shadow
    ctx.save();
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
    ctx.lineWidth = 6;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();

    // Box label
    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 9px monospace';
    const txt = `${box.confidence}%`;
    const txtWidth = ctx.measureText(txt).width;
    
    // Draw tiny pill above box
    ctx.fillRect(x - 1, y - 12, txtWidth + 6, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(txt, x + 2, y - 3);
  });
}

// ==========================================
// 6. Live Camera Viewfinder & Scans
// ==========================================
function setupWebcam() {
  const startBtn = document.getElementById('start-camera-btn');
  const stopBtn = document.getElementById('stop-camera-btn');
  const webcamEl = document.getElementById('webcam-stream');
  const camPlaceholder = document.getElementById('camera-placeholder');
  
  const camPill = document.getElementById('camera-pill');
  const camLabel = document.getElementById('camera-status-label');
  const camLaser = document.getElementById('camera-laser');
  const camReticle = document.getElementById('camera-reticle');
  const camResultBox = document.getElementById('camera-translation-result');
  const camResultText = document.getElementById('camera-result-text');
  
  const cameraCanvas = document.getElementById('camera-canvas-overlay');
  const cameraTtsBtn = document.getElementById('camera-tts-btn');

  if (!startBtn || !webcamEl) return;

  startBtn.addEventListener('click', async () => {
    try {
      // Toggle placeholders
      camPlaceholder.style.display = 'none';
      webcamEl.style.display = 'block';
      cameraCanvas.style.display = 'block';
      camLaser.style.display = 'block';
      camReticle.style.display = 'block';
      camResultBox.style.display = 'flex';
      stopBtn.style.display = 'block';

      // Request stream access
      const constraints = {
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      };

      activeWebcamStream = await navigator.mediaDevices.getUserMedia(constraints);
      webcamEl.srcObject = activeWebcamStream;

      // Update indicators
      camPill.classList.add('recording');
      camLabel.textContent = 'Camera LIVE';
      camResultText.textContent = 'SCANNING FOR DOTS...';

      // Setup simulated camera inference loop
      startCameraInferenceLoop();

    } catch (err) {
      console.warn('Webcam permission denied/unavailable:', err);
      // Fallback: mock stream for user demo
      camPlaceholder.style.display = 'none';
      webcamEl.style.display = 'none';
      
      // Render simulated static scanning canvas
      cameraCanvas.style.display = 'block';
      drawDemoCameraCanvas();

      camLaser.style.display = 'block';
      camReticle.style.display = 'block';
      camResultBox.style.display = 'flex';
      stopBtn.style.display = 'block';

      camPill.classList.add('recording');
      camLabel.textContent = 'Demo Mode (Camera Access Blocked)';
      camResultText.textContent = 'SCANNING SIMULATED MATRIX...';

      startCameraInferenceLoop(true); // Demo mode loop
    }
  });

  stopBtn.addEventListener('click', stopWebcam);
  
  if (cameraTtsBtn) {
    cameraTtsBtn.addEventListener('click', () => {
      speakText(camResultText.textContent);
    });
  }
}

function stopWebcam() {
  const webcamEl = document.getElementById('webcam-stream');
  const stopBtn = document.getElementById('stop-camera-btn');
  const camPlaceholder = document.getElementById('camera-placeholder');
  const camPill = document.getElementById('camera-pill');
  const camLabel = document.getElementById('camera-status-label');
  const camLaser = document.getElementById('camera-laser');
  const camReticle = document.getElementById('camera-reticle');
  const camResultBox = document.getElementById('camera-translation-result');
  const cameraCanvas = document.getElementById('camera-canvas-overlay');

  // Stop camera tracks
  if (activeWebcamStream) {
    activeWebcamStream.getTracks().forEach(track => track.stop());
    activeWebcamStream = null;
  }

  // Clear inference timers
  if (cameraInferenceInterval) {
    clearInterval(cameraInferenceInterval);
    cameraInferenceInterval = null;
  }

  if (webcamEl) webcamEl.srcObject = null;

  // Restore dashboard state
  if (camPlaceholder) camPlaceholder.style.display = 'flex';
  if (webcamEl) webcamEl.style.display = 'none';
  if (cameraCanvas) cameraCanvas.style.display = 'none';
  if (camLaser) camLaser.style.display = 'none';
  if (camReticle) camReticle.style.display = 'none';
  if (camResultBox) camResultBox.style.display = 'none';
  if (stopBtn) stopBtn.style.display = 'none';

  if (camPill) camPill.classList.remove('recording');
  if (camLabel) camLabel.textContent = 'Camera Offline';
}

function drawDemoCameraCanvas() {
  const canvas = document.getElementById('camera-canvas-overlay');
  if (!canvas) return;
  canvas.width = 640;
  canvas.height = 480;
  
  const ctx = canvas.getContext('2d');
  
  // Render high-tech digital scanning grid
  ctx.fillStyle = '#0f0b24';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw green gridlines
  ctx.strokeStyle = 'rgba(124, 58, 237, 0.15)';
  ctx.lineWidth = 1;
  
  const gridSpacing = 40;
  for (let x = 0; x < canvas.width; x += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Draw some simulated Braille dots on screen
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 8; col++) {
      const dotX = 120 + col * 50;
      const dotY = 140 + row * 60;
      // Draw 6 dot cell groups
      drawDemoBrailleCell(ctx, dotX, dotY);
    }
  }
}

function drawDemoBrailleCell(ctx, startX, startY) {
  const dotSpacingX = 14;
  const dotSpacingY = 18;
  const radius = 3.5;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 2; c++) {
      ctx.beginPath();
      ctx.arc(startX + c * dotSpacingX, startY + r * dotSpacingY, radius, 0, Math.PI * 2);
      // Randomly fill dots to look like characters
      if (Math.random() > 0.6) {
        ctx.fillStyle = 'rgba(168, 85, 247, 0.8)';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fill();
      }
    }
  }
}

function startCameraInferenceLoop(isDemo = false) {
  const camResultText = document.getElementById('camera-result-text');
  const cameraCanvas = document.getElementById('camera-canvas-overlay');
  
  if (cameraInferenceInterval) clearInterval(cameraInferenceInterval);

  const words = ['WELCOME', 'ACCESSIBILITY', 'BRAILLE', 'VISION', 'STARTUP', 'INNOVATION', 'YOLOv8', 'OPENCV'];
  const hindiWords = ['स्वागतम', 'पहुंच', 'ब्रेल', 'दृष्टि', 'स्टार्टअप', 'नवाचार', 'तकनीक', 'जय हिन्द'];
  
  let frameCount = 0;

  cameraInferenceInterval = setInterval(() => {
    frameCount++;
    
    // Choose word based on language selection
    const langSelect = document.getElementById('lang-select');
    const selectedLang = langSelect ? langSelect.value : 'EN';
    const list = (selectedLang === 'HI') ? hindiWords : words;
    const word = list[frameCount % list.length];
    
    camResultText.textContent = word;

    // Draw scan boxes
    if (cameraCanvas) {
      const ctx = cameraCanvas.getContext('2d');
      // If live feed, clear frame and match video size
      const video = document.getElementById('webcam-stream');
      if (!isDemo && video && video.videoWidth) {
        cameraCanvas.width = video.clientWidth;
        cameraCanvas.height = video.clientHeight;
        ctx.clearRect(0, 0, cameraCanvas.width, cameraCanvas.height);
      } else if (isDemo) {
        // Redraw fallback demo screen dot patterns
        drawDemoCameraCanvas();
      }

      // Draw 3-4 random scanner focus squares
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1.5;
      
      for (let i = 0; i < 4; i++) {
        const x = 100 + Math.random() * (cameraCanvas.width - 250);
        const y = 80 + Math.random() * (cameraCanvas.height - 200);
        const size = 30 + Math.random() * 40;
        
        ctx.strokeRect(x, y, size, size + 15);
        ctx.fillStyle = '#ec4899';
        ctx.font = '8px monospace';
        ctx.fillText(`C: ${(92 + Math.random() * 7.5).toFixed(1)}%`, x, y - 4);
      }
    }
  }, 2200);
}

// ==========================================
// 7. Dynamic Learn Braille Grid Rendering
// ==========================================
function buildLearnBrailleGrid() {
  const gridContainer = document.getElementById('braille-alphabet-grid');
  if (!gridContainer) return;

  // Grade-1 Braille A-Z character set mapped to indices 0-5 representing standard dots
  // Col 1: 0, 1, 2  (Dots 1, 2, 3)
  // Col 2: 3, 4, 5  (Dots 4, 5, 6)
  const alphabet = [
    { char: 'A', pattern: [true, false, false, false, false, false] },
    { char: 'B', pattern: [true, true, false, false, false, false] },
    { char: 'C', pattern: [true, false, false, true, false, false] },
    { char: 'D', pattern: [true, false, false, true, true, false] },
    { char: 'E', pattern: [true, false, false, false, true, false] },
    { char: 'F', pattern: [true, true, false, true, false, false] },
    { char: 'G', pattern: [true, true, false, true, true, false] },
    { char: 'H', pattern: [true, true, false, false, true, false] },
    { char: 'I', pattern: [false, true, false, true, false, false] },
    { char: 'J', pattern: [false, true, false, true, true, false] },
    { char: 'K', pattern: [true, false, true, false, false, false] },
    { char: 'L', pattern: [true, true, true, false, false, false] },
    { char: 'M', pattern: [true, false, true, true, false, false] },
    { char: 'N', pattern: [true, false, true, true, true, false] },
    { char: 'O', pattern: [true, false, true, false, true, false] },
    { char: 'P', pattern: [true, true, true, true, false, false] },
    { char: 'Q', pattern: [true, true, true, true, true, false] },
    { char: 'R', pattern: [true, true, true, false, true, false] },
    { char: 'S', pattern: [false, true, true, true, false, false] },
    { char: 'T', pattern: [false, true, true, true, true, false] },
    { char: 'U', pattern: [true, false, true, false, false, true] },
    { char: 'V', pattern: [true, true, true, false, false, true] },
    { char: 'W', pattern: [false, true, false, true, true, true] },
    { char: 'X', pattern: [true, false, true, true, false, true] },
    { char: 'Y', pattern: [true, false, true, true, true, true] },
    { char: 'Z', pattern: [true, false, true, false, true, true] }
  ];

  gridContainer.innerHTML = ''; // clear

  alphabet.forEach(item => {
    // Generate card element
    const card = document.createElement('div');
    card.className = 'braille-card';
    card.title = `Letter: ${item.char}`;

    const dots = item.pattern;
    // Map order in grid rows (top-to-bottom, left-to-right columns)
    // Row 1: Dot 1 (idx 0), Dot 4 (idx 3)
    // Row 2: Dot 2 (idx 1), Dot 5 (idx 4)
    // Row 3: Dot 3 (idx 2), Dot 6 (idx 5)
    const dotClasses = [
      dots[0] ? 'filled' : 'empty', // dot 1
      dots[3] ? 'filled' : 'empty', // dot 4
      dots[1] ? 'filled' : 'empty', // dot 2
      dots[4] ? 'filled' : 'empty', // dot 5
      dots[2] ? 'filled' : 'empty', // dot 3
      dots[5] ? 'filled' : 'empty'  // dot 6
    ];

    card.innerHTML = `
      <div class="braille-letter-header">${item.char}</div>
      <div class="braille-dots-display">
        <div class="braille-dot ${dotClasses[0]}"></div>
        <div class="braille-dot ${dotClasses[1]}"></div>
        <div class="braille-dot ${dotClasses[2]}"></div>
        <div class="braille-dot ${dotClasses[3]}"></div>
        <div class="braille-dot ${dotClasses[4]}"></div>
        <div class="braille-dot ${dotClasses[5]}"></div>
      </div>
    `;

    // Click to speak the letter
    card.addEventListener('click', () => {
      speakText(`Letter ${item.char}`);
    });

    gridContainer.appendChild(card);
  });
}

// ==========================================
// 8. Native Speech Synthesis (Accessibility Readout)
// ==========================================
function speakText(text) {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this browser.');
    return;
  }

  // Cancel running synthesis speech
  window.speechSynthesis.cancel();

  if (!text) return;

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Set language properties
  const langSelect = document.getElementById('lang-select');
  const selectedLang = langSelect ? langSelect.value : 'EN';
  
  if (selectedLang === 'HI') {
    utterance.lang = 'hi-IN'; // Hindi voice
  } else {
    utterance.lang = 'en-US'; // English voice
  }

  // Customize speed and tone
  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  window.speechSynthesis.speak(utterance);
}

function setupSpeechReadout() {
  const ttsPlayBtn = document.getElementById('tts-play-btn');
  const resultTranslation = document.getElementById('result-translation');

  if (ttsPlayBtn && resultTranslation) {
    ttsPlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      speakText(resultTranslation.textContent);
    });
  }
}

// ==========================================
// 9. Toast Notification Setup
// ==========================================
function setupEdgeToast() {
  const toast = document.getElementById('edge-toast');
  const closeBtn = document.getElementById('toast-close-x');
  
  if (!toast || !closeBtn) return;

  // Auto-dismiss or let user click 'x'
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toast.style.animation = 'none';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(120%)';
    setTimeout(() => toast.style.display = 'none', 300);
  });
}

// ==========================================
// 10. Language Pill Selector Event
// ==========================================
function setupLangSelector() {
  const select = document.getElementById('lang-select');
  if (select) {
    select.addEventListener('change', (e) => {
      currentLanguage = e.target.value;
      
      // If there is an active translation result, let's re-run or warn user
      const resultContent = document.getElementById('result-content');
      if (resultContent && resultContent.style.display === 'flex' && selectedFile) {
        // Redetect using the new language selection!
        performImageDetection();
      }
    });
  }
}

// ==========================================
// Initialization DOMContentLoaded Entry Point
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initParticleCanvas();
  setupNavigation();
  checkSession();
  setupImageUpload();
  setupSpeechReadout();
  setupWebcam();
  buildLearnBrailleGrid();
  setupEdgeToast();
  setupLangSelector();
});
