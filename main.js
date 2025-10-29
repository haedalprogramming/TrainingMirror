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
    
    if (angle > 180.0) {
        angle = 360 - angle;
    }
    
    return angle;
}

/**
 * 피드백 메시지를 화면에 표시하는 함수
 * @param {string} message - 표시할 메시지
 * @param {string} type - 메시지 타입 ('good', 'warning', 'error')
 */
function displayFeedback(message, type = 'normal') {
    feedbackMessage.textContent = message;
    
    // 기존 클래스 제거
    feedbackMessage.classList.remove('feedback-good', 'feedback-warning', 'feedback-error');
    
    // 타입에 따라 클래스 추가
    if (type === 'good') {
        feedbackMessage.classList.add('feedback-good');
    } else if (type === 'warning') {
        feedbackMessage.classList.add('feedback-warning');
    } else if (type === 'error') {
        feedbackMessage.classList.add('feedback-error');
    }
}

/**
 * 횟수 카운터 업데이트 함수
 * @param {number} count - 현재 횟수
 */
function updateRepCount(count) {
    repCountElement.textContent = count;
}

/**
 * 운동 상태 업데이트 함수
 * @param {string} state - 현재 상태
 */
function updateExerciseState(state) {
    const stateText = state === 'up' ? '상승' : '하강';
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
        exerciseSelect.disabled = true;
        
        // 카운터 초기화
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
