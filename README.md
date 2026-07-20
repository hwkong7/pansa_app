# PANSA (판사님 여기입니다)

PANSA는 익명으로 갈등 사연을 공유하고, 다른 사용자들의 의견과 투표를 통해 공정한 판결을 내리는 커뮤니티 서비스입니다.  
사용자는 원고 또는 피고가 되어 재판에 참여할 수 있으며, 참관인은 투표와 P-COIN 베팅을 통해 판결 과정에 참여할 수 있습니다.

---

## 주요 기능

### 로그인
- 이메일 로그인 및 회원가입
- 카카오 로그인
- 네이버 로그인

### 재판 생성
- 사연 작성
- 상대방(피고) 이메일 검색 및 지정
- 마감 시간 설정
- 사진 첨부

### 재판 참여
- 피고의 재판 수락 또는 거절
- 댓글 작성
- P-COIN 베팅
- 실시간 재판 상태 확인

### 판결
- 마감 후 자동 판결
- 승패 및 결과 확인
- 코인 정산

### 기타
- 출석체크 보상
- 알림 기능
- 마이페이지
- 신고 및 문의

---

## 기술 스택

### Frontend
- Expo
- React Native
- TypeScript
- React Navigation

### Backend
- Supabase
- Supabase Authentication
- Supabase Database
- Supabase Realtime
- Supabase Edge Functions

---

## 프로젝트 구조

```
src/
├── api/            # API 호출
├── components/     # 공통 컴포넌트
├── context/        # 전역 상태 관리
├── lib/            # Supabase 설정 및 공통 유틸
├── navigation/     # 네비게이션
├── screens/        # 화면
├── theme/          # 테마 및 스타일

supabase/
└── functions/      # Edge Functions

public/
└── auth-callback.html
```

---

## 실행 방법

패키지를 설치한 후 Expo 개발 서버를 실행합니다.

```bash
npm install
npx expo start
```

Expo Go 또는 Android/iOS 에뮬레이터에서 실행할 수 있습니다.

웹으로 실행하려면

```bash
npx expo export -p web
```

---

## 서비스 흐름

```
회원가입 / 로그인
        │
        ▼
    사연 작성
        │
        ▼
 피고 수락 또는 거절
        │
        ▼
  투표 및 P-COIN 베팅
        │
        ▼
      자동 판결
        │
        ▼
   결과 확인 및 코인 정산
```

---

## 프로젝트 특징

- 익명 기반 갈등 조정 서비스
- 이메일 검색을 통한 재판 상대 지정
- 카카오 및 네이버 소셜 로그인 지원
- 실시간 재판 상태 업데이트
- 서버 기반 출석체크 및 보상 관리
- 자동 판결 및 코인 정산

---

## 개발 환경

- Node.js
- npm
- Expo SDK
- React Native
- TypeScript

