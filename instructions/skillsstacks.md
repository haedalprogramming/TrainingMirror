좋습니다\! 웹 애플리케이션으로 MVP(최소 기능 제품)를 개발하기로 결정하셨군요. AI 코딩 에이전트인 제가 코드를 생성하고 우리가 원활하게 협업하기 위해, 다음과 같은 기술 스택과 코딩 스타일 가이드를 제안합니다.

## 1\. 기술 스택 (Technology Stack)

우리의 목표는 **별도의 복잡한 설치나 백엔드 서버 없이**, 브라우저(크롬, 엣지 등)에서 바로 실행되는 웹 앱을 만드는 것입니다.

  * **핵심 (Core): `HTML5`, `CSS3`, `JavaScript (ES6+)`**

      * 웹페이지의 뼈대(HTML), 디자인(CSS), 그리고 모든 동작(JS)을 구현하는 기본 중의 기본입니다.
      * 우리는 현대적인 JavaScript 문법(ES6+)을 사용할 것입니다.

  * **AI 자세 추정: `Google MediaPipe (Pose)`**

      * 이 프로젝트의 핵심입니다. 별도 서버 없이 **브라우저에서 실시간으로** 카메라 영상을 분석해 인체 관절(스켈레톤)을 감지하는 강력한 라이브러리입니다.
      * 제가 `<script>` 태그로 간단히 로드하는 방법을 알려드릴 것입니다.

  * **백엔드 (Phase 5용): `Firebase` (선택 사항)**

      * 나중에 운동 기록을 저장하거나 사용자를 관리하는 기능이 필요할 때, 서버를 직접 만들지 않고도 쉽게 데이터를 저장할 수 있는 Google의 서비스입니다. 지금 당장은 필요 없습니다.

  * **개발 환경:**

      * 기본적으로는 **이 채팅창과 웹 브라우저**만 있으면 됩니다.
      * 다만, 웹캠(카메라)을 테스트하려면 `https:` 보안 프로토콜이나 `localhost` 환경이 필요합니다. VSCode의 **'Live Server'** 확장 프로그램을 사용하면 가장 쉽습니다.

-----

## 2\. 코딩 스타일 가이드 (Coding Style Guide)

일관된 코드 스타일은 버그를 줄이고, 제가 드리는 코드를 사용자가 더 쉽게 이해하도록 돕습니다.

### 핵심 원칙: 코드(변수, 함수명 등)는 영어로, 주석은 한글로

  * **이유:** 프로그래밍 언어와 라이브러리(MediaPipe 등)는 모두 영어를 기반으로 합니다. 변수나 함수명에 한글을 사용하면 예기치 않은 오류가 발생하거나 라이브러리와 호환되지 않을 수 있습니다.
  * **협업 방식:**
      * **제가 작성하는 코드 (변수, 함수, 파일명 등):** **영어**로 작성합니다.
      * **제가 작성하는 주석:** **한글**로 상세하게 설명을 달아드리겠습니다.

### 스타일 상세 규칙

| 구분 | 스타일 | 예시 |
| :--- | :--- | :--- |
| **JavaScript 변수** | `camelCase` (카멜 케이스) | `let videoElement;` <br> `let kneeAngle;` |
| **JavaScript 상수** | `UPPER_SNAKE_CASE` (대문자 스네이크) | `const VIDEO_WIDTH = 640;` |
| **JavaScript 함수** | `camelCase` (카멜 케이스) | `function calculateAngle() { ... }` <br> `function drawSkeleton() { ... }` |
| **JavaScript 클래스** | `PascalCase` (파스칼 케이스) | `class PoseDetector { ... }` |
| **HTML `id`, `class`** | `kebab-case` (케밥 케이스) | `<video id="video-feed"></video>` <br> `<div class="feedback-box"></div>` |
| **CSS 선택자** | `kebab-case` (케밥 케이스) | `.feedback-box { ... }` <br> `#video-feed { ... }` |
| **파일 이름** | `kebab-case` (케밥 케이스) | `index.html` <br> `style.css` <br> `main.js` |

**예시 코드 (이런 식으로 드릴 거예요):**

```javascript
// main.js

// 비디오 요소를 가져옵니다.
const videoElement = document.getElementById('video-feed');

// 스쿼트의 올바른 최소 각도를 정의합니다. (상수)
const SQUAT_ANGLE_THRESHOLD = 100;

/**
 * 두 점 사이의 각도를 계산하는 함수
 * @param {object} p1 - 첫 번째 점 (x, y, z)
 * @param {object} p2 - 두 번째 점 (x, y, z)
 * @param {object} p3 - 세 번째 점 (x, y, z)
 * @returns {number} 계산된 각도 (도)
 */
function calculateAngle(p1, p2, p3) {
  // (각도 계산 로직...)
  let angle = ...
  return angle;
}
```

이 기술 스택과 코딩 스타일 가이드에 동의하시나요?

동의하신다면, 바로 로드맵의 \*\*[Phase 1-1. HTML/CSS/JavaScript 기본 구조 생성]\*\*을 시작하겠습니다.