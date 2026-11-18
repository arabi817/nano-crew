# 설치 안내 (처음 한 번만)

이 게임은 두 가지가 필요해요.
- **Firebase**: 학생 패드끼리 실시간으로 주고받게 해 주는 구글의 무료 서버
- **GitHub Pages**: 게임 파일을 인터넷 주소로 올려 주는 무료 공간 (학생이 QR로 접속하는 곳)

준비물: 구글 계정 1개, GitHub 계정 1개. 카드 등록은 필요 없어요 (무료 Spark 요금제).
화면의 버튼 이름은 구글이 가끔 바꿔요. 비슷한 이름을 찾으면 돼요.

---

## 1부. Firebase 만들기 (약 10분)

### 1. 프로젝트 만들기
1. https://console.firebase.google.com 에 구글 계정으로 들어가요.
2. **프로젝트 만들기**(또는 '프로젝트 추가')를 눌러요.
3. 프로젝트 이름: 예) `nano-crew-science` → 계속
4. **Google 애널리틱스는 끄세요** (학생 정보를 모을 필요가 없어요) → 프로젝트 만들기

### 2. 익명 로그인 켜기
학생이 이름·이메일 없이 들어오게 하는 기능이에요.
1. 왼쪽 메뉴 **빌드(Build) → Authentication** → **시작하기**
2. **로그인 방법(Sign-in method)** 탭 → **익명(Anonymous)** → **사용 설정** 켜기 → 저장

### 3. 실시간 데이터베이스 만들기
1. 왼쪽 메뉴 **빌드 → Realtime Database** → **데이터베이스 만들기**
2. 위치: **싱가포르 (asia-southeast1)** 를 고르세요 (한국에서 가장 가까워요)
3. 보안 규칙: **잠금 모드로 시작** → 사용 설정

### 4. 보안 규칙 붙여 넣기 (중요)
학생이 개발자 도구로 들여다봐도 임포스터를 알 수 없게 막는 규칙이에요.
1. Realtime Database 화면 위쪽의 **규칙(Rules)** 탭
2. 안에 있는 글을 **모두 지우고**, `nano-crew/database.rules.json` 파일 내용을 통째로 복사해 붙여 넣어요.
   (파일은 메모장으로 열면 돼요)
3. **게시(Publish)**

### 5. 웹 앱 등록하고 설정값 복사
1. 왼쪽 위 **톱니바퀴 → 프로젝트 설정**
2. 아래쪽 '내 앱'에서 **웹 아이콘 `</>`** 을 눌러요.
3. 앱 닉네임: `nano-crew` → **Firebase Hosting은 체크하지 마세요** → 앱 등록
4. 화면에 `const firebaseConfig = { apiKey: "...", ... }` 가 나와요. 이 부분을 복사해요.
5. `nano-crew/config.js`를 메모장으로 열고, 빈칸 따옴표 안에 값을 하나씩 붙여 넣어요.

```js
export const firebaseConfig = {
  apiKey: "AIza....",
  authDomain: "nano-crew-science.firebaseapp.com",
  databaseURL: "https://nano-crew-science-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nano-crew-science",
  appId: "1:1234:web:abcd",
};
```

- **databaseURL**이 안 보이면: Realtime Database 화면 맨 위에 있는 `https://....firebasedatabase.app` 주소를 복사해 넣어요.
- 이 값들은 비밀번호가 아니에요. 웹페이지에 들어가는 '주소' 같은 거라 공개돼도 괜찮아요. 보안은 4번의 규칙이 지켜요.

### 6. 이 컴퓨터에서 먼저 확인
1. `시험서버_켜기.bat` 실행 → 교사 화면이 열려요.
2. 아래쪽 주황 표시가 **'혼자 시험 모드'가 아니라 초록 '온라인 서버'** 로 바뀌면 연결 성공이에요.
3. 새 방 만들기 → 큰 QR이 보이면 성공. (이 단계에서는 아직 패드로 못 들어와요. 2부를 하세요.)

---

## 2부. GitHub Pages에 올리기 (약 10분)

### 1. 저장소 만들기
1. https://github.com 로그인 → 오른쪽 위 **+ → New repository**
2. 이름: 예) `nano-crew` / **Public** 선택 → Create repository

### 2. 파일 올리기
1. 새 저장소 화면에서 **uploading an existing file** 링크를 눌러요.
2. `nano-crew` 폴더 **안의 내용물 전부**(index.html, host.html, js 폴더 등)를 끌어다 놓아요.
   - 폴더째가 아니라 **안의 파일들**을 올려야 해요. 그래야 주소가 짧아져요.
3. 아래 **Commit changes**

### 3. Pages 켜기
1. 저장소의 **Settings → Pages**
2. Source: **Deploy from a branch**, Branch: **main**, 폴더 **/(root)** → Save
3. 1~2분 뒤 위쪽에 주소가 나와요: `https://아이디.github.io/nano-crew/`

### 4. Firebase에 이 주소 허락하기 (꼭 해야 해요)
1. Firebase 콘솔 → **Authentication → 설정(Settings) → 승인된 도메인(Authorized domains)**
2. **도메인 추가** → `아이디.github.io` 입력 (https:// 와 뒤의 /nano-crew 는 빼고)

### 5. 수업에서 쓰기
- 교사 노트북: `https://아이디.github.io/nano-crew/host.html` → 새 방 만들기 → TV에 QR
- 학생 패드: QR 찍기 → 색깔·번호 고르기

### 파일을 고친 뒤에는
GitHub 저장소에서 고친 파일만 다시 올리면(Add file → Upload files) 1~2분 뒤 반영돼요.
브라우저가 옛 파일을 기억할 수 있으니, 교사 노트북은 **Ctrl + Shift + R**(강력 새로고침)을 한 번 눌러 주세요.
패드는 최대 10분쯤 옛 파일이 보일 수 있어요.

---

## 무료 사용량 지키기
- 무료 요금제 한도: 한 달 내려받기 **10GB**, 동시 접속 **100명**
- 지금 설계로 한 반 10분 ≈ 60MB(추정) → 한도 안에서 넉넉해요.
- 확인 방법: Firebase 콘솔 → Realtime Database → **사용량(Usage)** 탭
- 판이 끝나면 꼭 **판 종료**를 눌러 방 데이터를 지워 주세요 (개인정보·저장 공간 정리).
- 같은 학교 인터넷에서 **처음 쓰는 기기**가 한 시간에 100대 넘게 들어오면 잠시 막힐 수 있어요. 같은 패드를 계속 쓰면 괜찮아요.
