// MediaPipe Pose using globals (loaded via script tags in index.ejs)
// Avoid ESM imports here since this file is loaded as a classic script.

const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('overlay');
const canvasCtx = canvasElement.getContext('2d');
const feedbackDiv = document.getElementById('feedback');

// Helper: load a script tag and return a promise
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false; // preserve order
    s.onload = () => {
      console.log('Loaded script:', src);
      resolve(src);
    };
    s.onerror = () => {
      console.warn('Failed to load script:', src);
      reject(new Error('Failed to load ' + src));
    };
    document.head.appendChild(s);
  });
}

async function loadWithFallback(urls) {
  let lastErr;
  const tried = [];
  for (const url of urls) {
    try {
      tried.push(url);
      await loadScript(url);
      return true;
    } catch (e) {
      lastErr = e;
      console.warn(e.message);
    }
  }
  const err = lastErr || new Error('All sources failed');
  err.tried = tried;
  throw err;
}

// Support both Pose and window.Pose namespaces from different versions safely
async function ensureMediaPipeLoaded() {
  let PoseNS = (typeof window !== 'undefined' && (window.Pose || window.pose))
    || (typeof Pose !== 'undefined' ? Pose : null);
  if (PoseNS && (typeof PoseNS === 'function' || PoseNS.Pose)) return true;

  // Try loading from multiple CDNs
  try {
    await loadWithFallback([
      '/vendor/@mediapipe/camera_utils/camera_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
      'https://unpkg.com/@mediapipe/camera_utils/camera_utils.js'
    ]);
  } catch (e) {
    console.warn('camera_utils failed on all sources');
  }
  try {
    await loadWithFallback([
      '/vendor/@mediapipe/drawing_utils/drawing_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
      'https://unpkg.com/@mediapipe/drawing_utils/drawing_utils.js'
    ]);
  } catch (e) {
    console.warn('drawing_utils failed on all sources');
  }
  await loadWithFallback([
    '/vendor/@mediapipe/pose/pose.js',
    'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js',
    'https://unpkg.com/@mediapipe/pose/pose.js'
  ]);

  PoseNS = (typeof window !== 'undefined' && (window.Pose || window.pose))
    || (typeof Pose !== 'undefined' ? Pose : null);
  return !!(PoseNS && (typeof PoseNS === 'function' || PoseNS.Pose));
}

async function startPipeline() {
  const PoseNS = (typeof window !== 'undefined' && (window.Pose || window.pose))
    || (typeof Pose !== 'undefined' ? Pose : null);
  const DrawingNS = typeof window !== 'undefined' ? window : {};
  const CameraNS = (typeof window !== 'undefined' && window.Camera)
    || (typeof Camera !== 'undefined' ? Camera : null);

  if (!PoseNS) {
    console.error('MediaPipe Pose is not available on the page.');
    if (feedbackDiv) feedbackDiv.innerText = 'Pose library failed to load. Check your internet connection.';
    return;
  }

  const pose = new PoseNS({
    // Load all model assets from local node_modules via /vendor
    locateFile: (file) => `/vendor/@mediapipe/pose/${file}`
  });
  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  pose.onResults(onResults);

  // Prefer MediaPipe Camera util; fallback to native getUserMedia if missing
  if (CameraNS) {
    try {
      const camera = new CameraNS(videoElement, {
        onFrame: async () => {
          await pose.send({ image: videoElement });
        },
        width: 640,
        height: 480
      });
      await camera.start();
      console.log('Camera connected');
      if (feedbackDiv) feedbackDiv.innerText = 'Camera connected';
    } catch (err) {
      console.error('Failed to start camera:', err);
      if (feedbackDiv) feedbackDiv.innerText = 'Unable to access camera. Allow permissions and ensure no other app is using it.';
    }
  } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
      videoElement.srcObject = stream;
      await new Promise((res) => {
        videoElement.onloadedmetadata = res;
      });
      await videoElement.play();
      console.log('Camera connected');
      if (feedbackDiv) feedbackDiv.innerText = 'Camera connected';
      const tick = async () => {
        await pose.send({ image: videoElement });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch (err) {
      console.error('getUserMedia error:', err);
      if (feedbackDiv) feedbackDiv.innerText = 'Camera permission denied or unavailable.';
    }
  } else {
    console.error('No camera API available in this browser.');
    if (feedbackDiv) feedbackDiv.innerText = 'This browser does not support camera access.';
  }
}

window.addEventListener('load', async () => {
  const ok = await ensureMediaPipeLoaded().catch((e) => {
    console.error('ensureMediaPipeLoaded error:', e && e.message, e && e.tried);
    return false;
  });
  if (!ok) {
    console.error('MediaPipe Pose failed to load from all CDNs.');
    if (feedbackDiv) feedbackDiv.innerText = 'Pose library failed to load. Try hard refresh. If offline, check /vendor/@mediapipe/pose/pose.js in the browser.';
    return;
  }
  await startPipeline();
});

function onResults(results) {
  const PoseGlobals = (typeof window !== 'undefined' && window.Pose)
    || (typeof Pose !== 'undefined' ? Pose : null);
  const drawConnectorsFn = (typeof window !== 'undefined' && window.drawConnectors) ? window.drawConnectors : null;
  const drawLandmarksFn = (typeof window !== 'undefined' && window.drawLandmarks) ? window.drawLandmarks : null;

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(
    results.image,
    0,
    0,
    canvasElement.width,
    canvasElement.height
  );
  if (results.poseLandmarks) {
    const POSE_CONNECTIONS = (PoseGlobals && PoseGlobals.POSE_CONNECTIONS) || (typeof window !== 'undefined' ? window.POSE_CONNECTIONS : undefined);
    if (drawConnectorsFn) drawConnectorsFn(
      canvasCtx,
      results.poseLandmarks,
      POSE_CONNECTIONS,
      { color: '#00FF00', lineWidth: 4 }
    );
    if (drawLandmarksFn) drawLandmarksFn(canvasCtx, results.poseLandmarks, {
      color: '#FF0000',
      lineWidth: 2
    });

    // Example feedback on back straightness
    const leftShoulder = results.poseLandmarks[11];
    const rightShoulder = results.poseLandmarks[12];
    const backAngle = Math.abs((leftShoulder.y - rightShoulder.y) * 100);
    feedbackDiv.innerText = backAngle > 5 ? 'Straighten your back' : 'Good posture';
  }
  canvasCtx.restore();
}