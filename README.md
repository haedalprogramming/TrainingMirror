# Training Mirror 🏋️

AI 기반 실시간 홈트레이닝 피드백 웹 애플리케이션

## 📋 프로젝트 소개

Training Mirror는 웹캠을 통해 사용자의 운동 자세를 실시간으로 분석하고 피드백을 제공하는 홈트레이닝 보조 애플리케이션입니다. Google MediaPipe Pose 기술을 활용하여 별도의 서버나 복잡한 설치 없이 브라우저에서 바로 실행됩니다.

## ✨ 주요 기능

- ✅ **실시간 자세 분석**: MediaPipe Pose를 통한 33개 신체 랜드마크 감지
- ✅ **스켈레톤 시각화**: 비디오 위에 실시간 스켈레톤 오버레이
- ✅ **스쿼트 피드백**: 무릎 각도 분석 및 실시간 자세 교정 피드백
- ✅ **자동 횟수 카운터**: 정확한 자세로 운동 시 자동 카운트
- ✅ **거울 모드**: 좌우 반전된 화면으로 자연스러운 운동 가능

## 🛠 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **AI/ML**: Google MediaPipe Pose
- **라이브러리**: MediaPipe Camera Utils, Drawing Utils

## 🚀 시작하기

### 필수 조건

- 최신 웹 브라우저 (Chrome, Edge, Firefox 권장)
- 웹캠 또는 카메라가 있는 기기
- `https://` 프로토콜 또는 `localhost` 환경 (웹캠 접근을 위해 필요)

### 설치 및 실행

1. **저장소 클론**
   ```bash
   git clone <repository-url>
   cd TrainingMirror
   ```

2. **로컬 서버 실행**
   
   방법 1: VSCode Live Server 확장 사용
   - VSCode에서 `index.html` 열기
   - 우클릭 → "Open with Live Server"

   방법 2: Python 내장 서버
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```

   방법 3: Node.js http-server
   ```bash
   npx http-server -p 8000
   ```

3. **브라우저에서 접속**
   ```
   http://localhost:8000
   ```

4. **사용 방법**
   - "시작하기" 버튼 클릭
   - 카메라 권한 허용
   - 전신이 보이도록 위치 조정
   - 스쿼트 운동 시작!

## 📖 사용 가이드

### 스쿼트 운동 팁

1. **올바른 자세**
   - 발을 어깨 너비로 벌리기
   - 무릎을 90도 정도까지 구부리기
   - 허리를 곧게 유지하기
   - 무릎이 발끝을 넘지 않도록 주의

2. **피드백 이해하기**
   - 🟢 녹색: 완벽한 자세
   - 🟠 주황색: 주의 필요
   - 🔴 빨간색: 자세 교정 필요

3. **화면 배치**
   - 카메라에서 2-3미터 거리 유지
   - 전신이 화면에 들어오도록 조정
   - 충분한 조명 확보

## 📁 프로젝트 구조

```
TrainingMirror/
├── index.html          # 메인 HTML 파일
├── style.css           # 스타일시트
├── main.js             # 메인 JavaScript 로직
├── README.md           # 프로젝트 문서
└── instructions/       # 개발 가이드 문서
    ├── roadmap.md
    └── skillsstacks.md
```

## 🎯 개발 로드맵

현재 **Phase 3**까지 완료:
- ✅ Phase 1: 기본 카메라 연동
- ✅ Phase 2: MediaPipe Pose 연동 및 스켈레톤 시각화
- ✅ Phase 3: 스쿼트 자세 분석 및 피드백 로직

계획 중:
- 🔄 Phase 4: 음성 피드백, 푸시업 등 다양한 운동 추가
- 🔄 Phase 5: 운동 기록 저장, 통계 분석

## 🔧 커스터마이징

### 각도 임계값 조정

`main.js` 파일에서 다음 상수를 수정할 수 있습니다:

```javascript
const SQUAT_DOWN_ANGLE = 100;  // 앉은 자세 판단 각도
const SQUAT_UP_ANGLE = 160;    // 선 자세 판단 각도
```

### 새로운 운동 추가

1. `index.html`의 `exercise-select`에 옵션 추가
2. `main.js`에 새로운 분석 함수 작성
3. `onResults` 함수에서 분기 처리

## 🐛 문제 해결

### 카메라가 작동하지 않을 때
- 브라우저 카메라 권한 확인
- HTTPS 또는 localhost 환경에서 실행 확인
- 다른 프로그램에서 카메라 사용 중인지 확인

### 포즈가 감지되지 않을 때
- 전신이 화면에 들어오는지 확인
- 조명이 충분한지 확인
- 카메라와의 거리 조정

## 📄 라이선스

이 프로젝트는 교육 및 개인 사용 목적으로 제작되었습니다.

## 🙏 감사의 말

- [Google MediaPipe](https://google.github.io/mediapipe/) - 포즈 감지 기술 제공

---

**주의사항**: 이 애플리케이션은 보조 도구이며 전문 트레이너의 지도를 대체할 수 없습니다. 운동 전 충분한 스트레칭을 하고 본인의 체력 수준에 맞게 운동하세요.