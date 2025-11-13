// ========================================
// TrainingMirror - main logic (pose analysis)
// ========================================

// DOM elements
const videoElement = document.getElementById('video-feed');
const canvasElement = document.getElementById('pose-canvas');
const canvasCtx = canvasElement.getContext('2d');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const exerciseSelect = document.getElementById('exercise-select');
const feedbackMessage = document.getElementById('feedback-message');
const repCountElement = document.getElementById('rep-count');
const exerciseStateElement = document.getElementById('exercise-state');

// MediaPipe objects
let camera = null;
let pose = null;

// Session state
let isRunning = false;
let currentExercise = 'squat';
let repCount = 0;
let exerciseState = 'up'; // 'up' or 'down'
let lastState = 'up';

// Thresholds and constants
const SQUAT_DOWN_ANGLE = 100; // knee angle considered "down"
const SQUAT_UP_ANGLE = 160;   // knee angle considered "up"
const PUSHUP_DOWN_ANGLE = 70; // elbow angle considered "down" for pushup
const PUSHUP_UP_ANGLE = 160;  // elbow angle considered "up" for pushup
const TORSO_TILT_THRESHOLD = 20; // degrees - warn if torso tilt exceeds this

// =========================
// Helpers
// =========================

/**
 * Calculate the angle (in degrees) formed at p2 by the points p1-p2-p3.
 * Standard approach using atan2 of vectors.
 */
function calculateAngle(p1, p2, p3) {
    const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) -
                    Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
}

/**
 * Calculate torso tilt in degrees between hip->shoulder vector and vertical up.
 * Returns 0 when torso is perfectly vertical. Larger value => more tilt.
 */
function calculateTiltDegrees(leftShoulder, rightShoulder, leftHip, rightHip) {
    const avgShoulder = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 };
    const avgHip = { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 };

    // vector hip -> shoulder
    const vx = avgShoulder.x - avgHip.x;
    const vy = avgShoulder.y - avgHip.y;

    // vertical up vector in image coordinates (y grows downward) is (0, -1)
    const ux = 0, uy = -1;
    const dot = vx * ux + vy * uy;
    const vmag = Math.sqrt(vx * vx + vy * vy);
    if (vmag === 0) return 0;
    let cos = dot / vmag; // umag is 1
    cos = Math.max(-1, Math.min(1, cos));
    const angleRad = Math.acos(cos);
    return angleRad * 180 / Math.PI;
}

function displayFeedback(message, type = 'normal') {
    feedbackMessage.textContent = message;
    feedbackMessage.classList.remove('feedback-good', 'feedback-warning', 'feedback-error');
    if (type === 'good') feedbackMessage.classList.add('feedback-good');
    else if (type === 'warning') feedbackMessage.classList.add('feedback-warning');
    else if (type === 'error') feedbackMessage.classList.add('feedback-error');
}

function updateRepCount(count) {
    repCountElement.textContent = count;
}

function updateExerciseState(state) {
    const stateText = state === 'up' ? '올라감' : '내려감';
    exerciseStateElement.textContent = stateText;
}

function displayAngleOnCanvas(landmark, text) {
    const x = landmark.x * canvasElement.width;
    const y = landmark.y * canvasElement.height;
    canvasCtx.fillStyle = '#00FF00';
    canvasCtx.font = '16px Arial';
    canvasCtx.fillText(text + '°', x + 10, y + 10);
}

// =========================
// Analyzers
// =========================

function analyzeSquat(landmarks) {
    const leftHip = landmarks[23], leftKnee = landmarks[25], leftAnkle = landmarks[27];
    const rightHip = landmarks[24], rightKnee = landmarks[26], rightAnkle = landmarks[28];
    const leftShoulder = landmarks[11], rightShoulder = landmarks[12];

    const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

    const torsoTiltDeg = calculateTiltDegrees(leftShoulder, rightShoulder, leftHip, rightHip);

    let feedback = '';
    let feedbackType = 'normal';

    if (avgKneeAngle < SQUAT_DOWN_ANGLE) {
        exerciseState = 'down';
        updateExerciseState('down');
        if (avgKneeAngle < 70) {
            feedback = '깊게 내려왔습니다 — 무릎/허리에 무리가 가지 않도록 주의하세요.';
            feedbackType = 'warning';
        } else {
            feedback = '좋은 깊이입니다! 자세를 유지하세요.';
            feedbackType = 'good';
        }
    } else if (avgKneeAngle > SQUAT_UP_ANGLE) {
        exerciseState = 'up';
        updateExerciseState('up');
        feedback = '상체가 잘 펴졌습니다.';
        feedbackType = 'normal';
    } else {
        feedback = '천천히 자세를 유지하세요.';
        feedbackType = 'normal';
    }

    if (torsoTiltDeg > TORSO_TILT_THRESHOLD) {
        feedback += ' 몸통이 ' + torsoTiltDeg.toFixed(1) + '° 기울어져 있습니다. 상체를 곧게 유지하세요.';
        feedbackType = 'error';
    }

    if (lastState === 'down' && exerciseState === 'up') {
        repCount++;
        updateRepCount(repCount);
        displayFeedback('한 회 완료! ' + feedback, 'good');
    } else {
        displayFeedback(feedback, feedbackType);
    }

    lastState = exerciseState;

    displayAngleOnCanvas(leftKnee, leftKneeAngle.toFixed(1));
    displayAngleOnCanvas(rightKnee, rightKneeAngle.toFixed(1));
}

function analyzePushup(landmarks) {
    const leftShoulder = landmarks[11], rightShoulder = landmarks[12];
    const leftElbow = landmarks[13], rightElbow = landmarks[14];
    const leftWrist = landmarks[15], rightWrist = landmarks[16];
    const leftHip = landmarks[23], rightHip = landmarks[24];

    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

    const torsoTiltDeg = calculateTiltDegrees(leftShoulder, rightShoulder, leftHip, rightHip);

    let feedback = '';
    let feedbackType = 'normal';

    if (avgElbowAngle < PUSHUP_DOWN_ANGLE) {
        exerciseState = 'down';
        updateExerciseState('down');
        feedback = '내려갔습니다. 팔꿈치를 잘 접었는지 확인하세요.';
    } else if (avgElbowAngle > PUSHUP_UP_ANGLE) {
        exerciseState = 'up';
        updateExerciseState('up');
        feedback = '올라왔습니다. 팔을 곧게 펴주세요.';
    } else {
        feedback = '중간 동작입니다.';
    }

    if (torsoTiltDeg > TORSO_TILT_THRESHOLD) {
        feedback += ' 몸통이 ' + torsoTiltDeg.toFixed(1) + '° 기울어졌습니다. 엉덩이의 위치를 유지하세요.';
        feedbackType = 'warning';
    }

    if (lastState === 'down' && exerciseState === 'up') {
        repCount++;
        updateRepCount(repCount);
        displayFeedback('한 회 완료! ' + feedback, 'good');
    } else {
        displayFeedback(feedback, feedbackType);
    }

    lastState = exerciseState;

    displayAngleOnCanvas(leftElbow, leftElbowAngle.toFixed(1));
    displayAngleOnCanvas(rightElbow, rightElbowAngle.toFixed(1));
}

// =========================
// MediaPipe integration
// =========================

function onResults(results) {
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
        drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2, radius: 6 });

        if (currentExercise === 'squat') analyzeSquat(results.poseLandmarks);
        else if (currentExercise === 'pushup') analyzePushup(results.poseLandmarks);
    } else {
        displayFeedback('자세를 인식할 수 없습니다. 전신이 보이도록 해주세요.', 'warning');
    }

    canvasCtx.restore();
}

async function initializePoseDetection() {
    try {
        pose = new Pose({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        });

        pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        pose.onResults(onResults);

        camera = new Camera(videoElement, {
            onFrame: async () => {
                if (isRunning) await pose.send({ image: videoElement });
            },
            width: 640,
            height: 480
        });

        await camera.start();
        displayFeedback('카메라 연결됨. 시작 버튼을 눌러 운동을 시작하세요.', 'good');
    } catch (err) {
        console.error('Error initializing MediaPipe Pose:', err);
        displayFeedback('카메라 또는 MediaPipe 초기화에 실패했습니다.', 'error');
    }
}

// =========================
// UI events
// =========================

startBtn.addEventListener('click', async () => {
    if (!isRunning) {
        isRunning = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        exerciseSelect.disabled = true;

        repCount = 0;
        updateRepCount(repCount);
        lastState = 'up';
        exerciseState = 'up';
        updateExerciseState('up');

        currentExercise = exerciseSelect.value;

        if (!camera) await initializePoseDetection();

        displayFeedback('운동이 시작되었습니다.', 'good');
    }
});

stopBtn.addEventListener('click', () => {
    if (isRunning) {
        isRunning = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        exerciseSelect.disabled = false;
        displayFeedback(`운동 종료 — 총 ${repCount}회`, 'normal');
    }
});

exerciseSelect.addEventListener('change', (e) => {
    currentExercise = e.target.value;
    displayFeedback(`${e.target.options[e.target.selectedIndex].text} 선택됨.`, 'normal');
});

// initial message
displayFeedback('카메라를 준비한 후 시작 버튼을 눌러주세요.', 'normal');
// ========================================
// 전역 변수 및 상수
// ========================================

// HTML 요소
const videoElement = document.getElementById('video-feed');
const canvasElement = document.getElementById('pose-canvas');
const canvasCtx = canvasElement.getContext('2d');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const exerciseSelect = document.getElementById('exercise-select');
const feedbackMessage = document.getElementById('feedback-message');
const repCountElement = document.getElementById('rep-count');
const exerciseStateElement = document.getElementById('exercise-state');

// MediaPipe 관련
let camera = null;
let pose = null;

// 운동 상태 추적
let isRunning = false;
let currentExercise = 'squat';
let repCount = 0;
let exerciseState = 'up'; // 스쿼트: 'up' 또는 'down'
let lastState = 'up';

// 스쿼트 각도 임계값 (상수)
const SQUAT_DOWN_ANGLE = 100; // 앉은 자세로 판단하는 각도
const SQUAT_UP_ANGLE = 160; // 선 자세로 판단하는 각도
// Push-up thresholds (angle at the elbow)
const PUSHUP_DOWN_ANGLE = 70;  // 몸을 내릴 때(팔꿈치 각도가 작아짐)
const PUSHUP_UP_ANGLE = 160;   // 몸을 밀어올려 팔꿈치가 펴진 상태

// Torso tilt threshold (degrees). If torso tilt from vertical exceeds this, warn the user.
const TORSO_TILT_THRESHOLD = 20;

// ========================================
// 유틸리티 함수
// ========================================

/**
 * 세 점을 이용하여 각도를 계산하는 함수
 * @param {object} p1 - 첫 번째 점 {x, y}
 * @param {object} p2 - 중간 점 (각도의 꼭지점) {x, y}
 * @param {object} p3 - 세 번째 점 {x, y}
 * @returns {number} 각도 (도 단위)
 */
function calculateAngle(p1, p2, p3) {
    const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - 
                    Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    
    function analyzeSquat(landmarks) {
        // Landmarks used (MediaPipe Pose): hips/knees/ankles and shoulders
        const leftHip = landmarks[23];
        const leftKnee = landmarks[25];
        const leftAnkle = landmarks[27];

        const rightHip = landmarks[24];
        const rightKnee = landmarks[26];
        const rightAnkle = landmarks[28];

        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];

        // Knee angles (left/right) and average
        const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
        const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
        const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

        // Torso tilt in degrees (0 = vertical). We check this for forward/backward lean.
        const torsoTiltDeg = calculateTiltDegrees(leftShoulder, rightShoulder, leftHip, rightHip);

        let feedback = '';
        let feedbackType = 'normal';

        // Squat depth logic
        if (avgKneeAngle < SQUAT_DOWN_ANGLE) {
            exerciseState = 'down';
            updateExerciseState('down');

            if (avgKneeAngle < 70) {
                feedback = '굉장히 깊게 내려왔어요 — 허리/무릎에 무리가 가지 않도록 주의하세요.';
                feedbackType = 'warning';
            } else {
                feedback = '좋아요! 적절한 깊이로 내려오셨습니다.';
                feedbackType = 'good';
            }
        } else if (avgKneeAngle > SQUAT_UP_ANGLE) {
            exerciseState = 'up';
            updateExerciseState('up');
            feedback = '상체가 잘 펴졌습니다. 다음 반복을 준비하세요.';
            feedbackType = 'normal';
        } else {
            feedback = '중간 동작입니다 — 천천히 자세를 유지하세요.';
            feedbackType = 'normal';
        }

        // Torso tilt check: warn if torso leans too far from vertical
        if (torsoTiltDeg > TORSO_TILT_THRESHOLD) {
            feedback += ' 몸통이 많이 기울어져 있습니다(약 ' + torsoTiltDeg.toFixed(1) + '°). 상체를 곧게 유지하세요.';
            feedbackType = 'error';
        }

        // Rep counting: count when moving from down -> up
        if (lastState === 'down' && exerciseState === 'up') {
            repCount++;
            updateRepCount(repCount);
            displayFeedback('한 번 완료! ' + feedback, 'good');
        } else {
            displayFeedback(feedback, feedbackType);
        }

        lastState = exerciseState;

        // Draw knee angles on canvas
        displayAngleOnCanvas(leftKnee, leftKneeAngle.toFixed(1));
        displayAngleOnCanvas(rightKnee, rightKneeAngle.toFixed(1));
    }

    /**
     * Analyze push-up using elbow angles (shoulder-elbow-wrist).
     * Counts reps when user goes from down -> up and gives posture feedback (hip/torso alignment).
     */
    function analyzePushup(landmarks) {
        // MediaPipe indexes: shoulders 11/12, elbows 13/14, wrists 15/16, hips 23/24
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftElbow = landmarks[13];
        const rightElbow = landmarks[14];
        const leftWrist = landmarks[15];
        const rightWrist = landmarks[16];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];

        // Elbow angles
        const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
        const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
        const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

        // Torso tilt (to detect sagging hips or piking)
        const torsoTiltDeg = calculateTiltDegrees(leftShoulder, rightShoulder, leftHip, rightHip);

        let feedback = '';
        let feedbackType = 'normal';

        // Push-up depth logic based on elbow angle
        if (avgElbowAngle < PUSHUP_DOWN_ANGLE) {
            exerciseState = 'down';
            updateExerciseState('down');
            feedback = '내렸습니다 — 팔꿈치를 잘 접었는지 확인하세요.';
            feedbackType = 'normal';
        } else if (avgElbowAngle > PUSHUP_UP_ANGLE) {
            exerciseState = 'up';
            updateExerciseState('up');
            feedback = '올라왔습니다 — 팔을 완전히 펴주세요.';
            feedbackType = 'normal';
        } else {
            feedback = '중간 동작입니다.';
            feedbackType = 'normal';
        }

        // Torso posture check: if tilt is large, suggest correcting hips (sagging or piking)
        if (torsoTiltDeg > TORSO_TILT_THRESHOLD) {
            feedback += ' 몸통 정렬이 좋지 않습니다(약 ' + torsoTiltDeg.toFixed(1) + '°). 엉덩이가 처지거나 올라가지 않도록 유지하세요.';
            feedbackType = 'warning';
        }

        // Count rep when moving from down -> up
        if (lastState === 'down' && exerciseState === 'up') {
            repCount++;
            updateRepCount(repCount);
            displayFeedback('한 번 완료! ' + feedback, 'good');
        } else {
            displayFeedback(feedback, feedbackType);
        }

        lastState = exerciseState;

        // Draw elbow angles on canvas for user feedback
        displayAngleOnCanvas(leftElbow, leftElbowAngle.toFixed(1));
        displayAngleOnCanvas(rightElbow, rightElbowAngle.toFixed(1));
    }
    exerciseStateElement.textContent = stateText;
}

// ========================================
// 스쿼트 분석 함수
// ========================================

/**
 * 스쿼트 자세를 분석하고 피드백을 제공하는 함수
 * @param {object} landmarks - MediaPipe가 감지한 신체 랜드마크
 */
function analyzeSquat(landmarks) {
    // MediaPipe Pose 랜드마크 인덱스
    // 23: 왼쪽 엉덩이, 25: 왼쪽 무릎, 27: 왼쪽 발목
    // 24: 오른쪽 엉덩이, 26: 오른쪽 무릎, 28: 오른쪽 발목
    // 11: 왼쪽 어깨, 12: 오른쪽 어깨
    
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    
    const rightHip = landmarks[24];
    const rightKnee = landmarks[26];
    const rightAnkle = landmarks[28];
    
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    // 왼쪽 무릎 각도 계산
    const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    
    // 오른쪽 무릎 각도 계산
    const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    
    // 평균 무릎 각도
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
    
    // 허리 각도 계산 (엉덩이-어깨 수직선)
    const avgHipY = (leftHip.y + rightHip.y) / 2;
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const torsoAngle = Math.abs(avgShoulderY - avgHipY);
    
    // 상태 판단 및 피드백
    let feedback = '';
    let feedbackType = 'normal';
    
    // 스쿼트 단계 판단
    if (avgKneeAngle < SQUAT_DOWN_ANGLE) {
        exerciseState = 'down';
        updateExerciseState('down');
        
        if (avgKneeAngle < 70) {
            feedback = '너무 깊이 앉았습니다. 무릎 각도를 90도 정도로 유지하세요.';
            feedbackType = 'warning';
        } else {
            feedback = '좋습니다! 자세를 유지하고 천천히 올라오세요.';
            feedbackType = 'good';
        }
    } else if (avgKneeAngle > SQUAT_UP_ANGLE) {
        exerciseState = 'up';
        updateExerciseState('up');
        feedback = '다시 천천히 앉으세요. 무릎을 90도까지 구부리세요.';
        feedbackType = 'normal';
    } else {
        feedback = '중간 단계입니다. 계속 진행하세요.';
        feedbackType = 'normal';
    }
    
    // 허리 자세 체크
    if (torsoAngle < 0.15) {
        feedback += ' ⚠️ 허리를 너무 숙이지 마세요!';
        feedbackType = 'error';
    }
    
    // 횟수 카운트 (상태 변화 감지)
    if (lastState === 'down' && exerciseState === 'up') {
        repCount++;
        updateRepCount(repCount);
        displayFeedback('✅ 1회 완료! ' + feedback, 'good');
    } else {
        displayFeedback(feedback, feedbackType);
    }
    
    lastState = exerciseState;
    
    // 각도 정보를 캔버스에 표시
    displayAngleOnCanvas(leftKnee, leftKneeAngle.toFixed(1));
    displayAngleOnCanvas(rightKnee, rightKneeAngle.toFixed(1));
}

/**
 * 캔버스에 각도 정보를 표시하는 함수
 * @param {object} landmark - 랜드마크 위치
 * @param {string} text - 표시할 텍스트
 */
function displayAngleOnCanvas(landmark, text) {
    const x = landmark.x * canvasElement.width;
    const y = landmark.y * canvasElement.height;
    
    canvasCtx.fillStyle = '#00FF00';
    canvasCtx.font = '16px Arial';
    canvasCtx.fillText(text + '°', x + 10, y + 10);
}

// ========================================
// MediaPipe 콜백 함수
// ========================================

/**
 * MediaPipe Pose가 결과를 반환할 때 호출되는 콜백 함수
 * @param {object} results - MediaPipe 결과 객체
 */
function onResults(results) {
    // 캔버스 크기를 비디오에 맞춤
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    
    // 캔버스 초기화
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // 포즈가 감지되었을 때
    if (results.poseLandmarks) {
        // 스켈레톤 그리기
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, 
                       {color: '#00FF00', lineWidth: 4});
        drawLandmarks(canvasCtx, results.poseLandmarks,
                     {color: '#FF0000', lineWidth: 2, radius: 6});
        
        // 현재 선택된 운동에 따라 분석 실행
        if (currentExercise === 'squat') {
            analyzeSquat(results.poseLandmarks);
        }
    } else {
        displayFeedback('자세를 인식할 수 없습니다. 전신이 보이도록 해주세요.', 'warning');
    }
    
    canvasCtx.restore();
}

// ========================================
// 카메라 및 MediaPipe 초기화
// ========================================

/**
 * MediaPipe Pose와 카메라를 초기화하는 함수
 */
async function initializePoseDetection() {
    try {
        // MediaPipe Pose 초기화
        pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            }
        });
        
        pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        pose.onResults(onResults);
        
        // 카메라 초기화
        camera = new Camera(videoElement, {
            onFrame: async () => {
                if (isRunning) {
                    await pose.send({image: videoElement});
                }
            },
            width: 640,
            height: 480
        });
        
        await camera.start();
        
        displayFeedback('카메라가 시작되었습니다. 운동을 시작하세요!', 'good');
        
    } catch (error) {
        console.error('카메라 또는 MediaPipe 초기화 오류:', error);
        displayFeedback('카메라를 시작할 수 없습니다. 권한을 확인해주세요.', 'error');
    }
}

// ========================================
// 이벤트 핸들러
// ========================================

/**
 * 시작 버튼 클릭 이벤트 핸들러
 */
startBtn.addEventListener('click', async () => {
    if (!isRunning) {
        isRunning = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        // 현재 선택된 운동에 따라 분석 실행
        if (currentExercise === 'squat') {
            analyzeSquat(results.poseLandmarks);
        } else if (currentExercise === 'pushup') {
            analyzePushup(results.poseLandmarks);
        repCount = 0;
        updateRepCount(repCount);
        lastState = 'up';
        exerciseState = 'up';
        updateExerciseState('up');
        
        // 현재 선택된 운동 저장
        currentExercise = exerciseSelect.value;
        
        // MediaPipe 초기화 (처음 실행 시)
        if (!camera) {
            await initializePoseDetection();
        }
        
        displayFeedback('운동을 시작합니다!', 'good');
    }
});

/**
 * 정지 버튼 클릭 이벤트 핸들러
 */
stopBtn.addEventListener('click', () => {
    if (isRunning) {
        isRunning = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        exerciseSelect.disabled = false;
        
        displayFeedback(`운동을 종료했습니다. 총 ${repCount}회 완료!`, 'normal');
    }
});

/**
 * 운동 선택 변경 이벤트 핸들러
 */
exerciseSelect.addEventListener('change', (e) => {
    currentExercise = e.target.value;
    displayFeedback(`${e.target.options[e.target.selectedIndex].text}를 선택했습니다.`, 'normal');
});

// ========================================
// 초기화
// ========================================

// 페이지 로드 시 초기 메시지 표시
displayFeedback('시작하기 버튼을 눌러 운동을 시작하세요', 'normal');
