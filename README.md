# 사주미麗

생년월일을 적으면 명식을 풀어 드리는 AI 사주 해석 웹 서비스입니다.

이름, 생년월일, 성별, 양력/음력을 입력하면 Gemini가 성격·기질·재능을 한국어로 해석합니다. 태어난 시간은 선택 사항입니다.

**배포:** [https://saju-me-ryeo.vercel.app/](https://saju-me-ryeo.vercel.app/)

## 주요 기능

- 게스트로 바로 사주 해석 (저장·공유 시에만 Google 로그인)
- 이름, 생년월일, 성별, 양력/음력 입력 (태어난 시간은 선택)
- Gemini(`gemini-3.6-flash`)로 사주 기본 차트 해석
- 성격, 기질, 재능, 약점과 돋보이는 특징을 쉬운 말로 설명
- 해석 결과 타이핑 연출 및 저장 기록 다시 보기
- Google 로그인 후 사주 기록 저장·수정·삭제, 사이드바 히스토리
- 프로필(내 생년월일 등) 설정
- 공개 공유 링크로 결과 페이지 열람
- 마스코트 령이, 한지·먹색 톤 UI
- Google Analytics(GA4) 주요 이벤트 추적
- 모바일에서 생년월일 연·월·일 선택 UI

## 시작하기

```bash
git clone https://github.com/shookcream/saju-me-ryeo.git
cd saju-me-ryeo
npm install
```

프로젝트 루트에 `.env` 파일을 만듭니다. 참고용 템플릿은 `.env.example`입니다.

```env
VITE_GEMINI_API_KEY=여기에_발급받은_키
VITE_SUPABASE_URL=여기에_Supabase_프로젝트_URL
VITE_SUPABASE_ANON_KEY=여기에_Supabase_anon_key
```

- Gemini API 키: [Google AI Studio](https://aistudio.google.com/apikey)
- Supabase URL / anon key: Dashboard → Project Settings → API
- Google 로그인: Supabase Authentication → URL Configuration의 Redirect URLs에 `http://localhost:5173`(개발)과 배포 도메인을 등록합니다.

`.env`는 git에 올라가지 않습니다.

개발 서버를 실행합니다.

```bash
npm run dev
```

브라우저에서 안내에 나온 주소(보통 `http://localhost:5173`)로 접속하면 됩니다. `.env`를 새로 만들었거나 키를 바꿨다면 개발 서버를 한 번 재시작하세요.

## 기술 스택

- React 19
- Vite 8
- Supabase (Auth, DB, 공유 RPC)
- Gemini Interactions API
- Vercel 배포
- Google Analytics 4

## 라이선스

아직 정해지지 않았습니다.
