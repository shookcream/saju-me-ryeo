# 사주미려

생년월일을 적으면 명식을 풀어 드리는 사주 해석 웹 서비스입니다.

이름, 생년월일, 태어난 시간, 성별, 양력/음력을 입력하면 Gemini가 성격·기질·재능을 한국어로 해석합니다.

## 주요 기능

- 이름, 생년월일, 태어난 시간, 성별, 양력/음력 입력
- Gemini(`gemini-3.6-flash`)로 사주 기본 차트 해석
- 성격, 기질, 재능, 약점과 돋보이는 특징을 쉬운 말로 설명
- 제목은 굵게 표시하고 `#`, `*` 같은 마크다운 기호는 숨김
- 한지·먹색 톤의 가운데 정렬 UI

## 시작하기

```bash
git clone https://github.com/shookcream/saju-me-ryeo.git
cd saju-me-ryeo
npm install
```

프로젝트 루트에 `.env` 파일을 만들고 Gemini API 키를 넣습니다.

```env
VITE_GEMINI_API_KEY=여기에_발급받은_키
```

API 키는 [Google AI Studio](https://aistudio.google.com/apikey)에서 발급받을 수 있습니다. `.env`는 git에 올라가지 않습니다.

개발 서버를 실행합니다.

```bash
npm run dev
```

브라우저에서 안내에 나온 주소(보통 `http://localhost:5173`)로 접속하면 됩니다. `.env`를 새로 만들었거나 키를 바꿨다면 개발 서버를 한 번 재시작하세요.

## 기술 스택

- React
- Vite
- Gemini Interactions API

## 라이선스

아직 정해지지 않았습니다.
