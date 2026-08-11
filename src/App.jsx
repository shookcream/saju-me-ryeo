import { useState } from 'react'
import './App.css'

// Gemini에게 역할을 알려 주는 시스템 프롬프트입니다.
// 실제 생년월일 데이터는 아래 handleAskSaju에서 따로 붙여 보냅니다.
const SAJU_SYSTEM_PROMPT = `return only Korean.

당신은 세계 최고의 사주 해석 전문가다. 논리와 구조 중심으로 사주를 해석하며, 수천 명의 인생을 분석해 온 경험이 있다. 분석은 매우 냉정하고 직설적으로 진행되며, 감정에 휘둘리지 않는다. 그러나 의외로 인간 내면에 대한 깊은 통찰을 지니고 있고 장점과 단점을 냉정하게 말한다.

질문: 사주를 통해 이 사람의 전반적인 성격, 기질, 재능을 분석해 주세요.
사용자가 사주 용어에 익숙하지 않다고 가정하고, 쉽고 명확한 말로 설명하며 중요한 포인트에서는 핵심 사주 근거를 밝혀주세요.
1) 사주 명식을 바탕으로 차분하지만 흥미롭게 설명해 주세요.
2) 사주에서 특이하거나 눈에 띄는 점이 있으면 알려주세요.
3) 약점도 솔직하게 말해 주세요.
4) 돋보이는 특징을 최소 한 가지 뽑아 명확히 설명해 주세요.
5) 마지막은 사용자가 가장 궁금한 점을 묻는 질문으로 끝내주세요.
6) 판단 근거는 사용자가 제공한 모든 정보와 해석 가능한 모든 사주 정보를 종합해 제시해 주세요.
7) 긍정적 해석과 부정적 해석을 모두 고려해 주세요.
이외에도 특이한점 한가지를 찾아서 언급해 주세요.

먼저 제공된 생년월일·시간·성별·양력/음력을 바탕으로 사주 명식(년주, 월주, 일주, 시주), 오행 분포, 십신, 지장간, 십이운성, 12신살, 공망, 대운·세운을 세운 뒤 위 규칙대로 해석하세요.
답변은 한국어로만 작성하세요.`

function App() {
  // name: 사용자가 입력한 이름을 저장하는 상태
  // setName: name 값을 바꿔 주는 함수
  // 처음에는 아무것도 입력하지 않았으므로 빈 문자열('')로 시작합니다.
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('') // 생년월일 (date input 값)
  const [birthTime, setBirthTime] = useState('') // 태어난 시간 (time input 값)
  const [gender, setGender] = useState('') // 성별 (라디오 버튼 값)
  const [calendarType, setCalendarType] = useState('') // 양력/음력 (라디오 버튼 값)
  const [result, setResult] = useState('') // Gemini가 돌려준 사주 해석 글
  const [isLoading, setIsLoading] = useState(false) // API를 기다리는 중인지
  const [errorMessage, setErrorMessage] = useState('') // 실패했을 때 보여줄 메시지

  // # 제목 줄은 굵게, **글자**도 굵게 보여 주고, #과 * 기호는 화면에 남기지 않습니다.
  function renderSajuResult(text) {
    return text.split('\n').map((line, index) => {
      const headingMatch = line.match(/^\s*#{1,6}\s*(.*)$/)

      if (headingMatch) {
        return (
          <p key={index} className="result-heading">
            {headingMatch[1].replace(/\*/g, '')}
          </p>
        )
      }

      if (line.trim() === '') {
        return <br key={index} />
      }

      // **이 글자**처럼 별표 두 개로 감싼 부분만 굵게 만듭니다.
      const parts = line.split(/(\*\*[^*]+\*\*)/g)
      return (
        <p key={index} className="result-line">
          {parts.map((part, partIndex) => {
            const boldMatch = part.match(/^\*\*([^*]+)\*\*$/)
            if (boldMatch) {
              return <strong key={partIndex}>{boldMatch[1]}</strong>
            }
            return part.replace(/\*/g, '')
          })}
        </p>
      )
    })
  }

  // 생년월일로 만 나이를 계산합니다.
  function getKoreanAge(dateString) {
    const today = new Date()
    const birth = new Date(dateString)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1
    }
    return age
  }

  // 버튼 클릭 시 Gemini Interactions API를 호출합니다.
  async function handleAskSaju() {
    // 비어 있는 칸이 있으면 API를 부르지 않습니다.
    if (!name || !birthDate || !birthTime || !gender || !calendarType) {
      setErrorMessage('이름, 생년월일, 태어난 시간, 성별, 양력/음력을 모두 입력해 주세요.')
      return
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) {
      setErrorMessage('API 키가 없습니다. 프로젝트 폴더의 .env 파일을 확인해 주세요.')
      return
    }

    const age = getKoreanAge(birthDate)

    // 사용자가 입력한 정보를 Gemini에게 보내는 본문입니다.
    const userInput = `이름: ${name}
성별: ${gender}
나이: 만 ${age}세
생년월일: ${birthDate}
태어난 시간: ${birthTime}
달력: ${calendarType}

위 정보를 바탕으로 사주 기본 차트를 세우고 해석해 주세요.`

    setIsLoading(true)
    setErrorMessage('')
    setResult('')

    try {
      // Interactions API: POST /v1beta/interactions
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/interactions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            model: 'gemini-3.6-flash',
            system_instruction: SAJU_SYSTEM_PROMPT,
            input: userInput,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        // Gemini가 에러를 주면 message를 꺼내서 보여 줍니다.
        throw new Error(data.error?.message || '사주 해석 요청에 실패했습니다.')
      }

      // output_text는 @google/genai SDK가 만들어 주는 값입니다.
      // fetch로 직접 호출하면 보통 없고, 실제 글은 steps 안에 들어 있습니다.
      const texts = (data.steps || [])
        .filter((step) => step.type === 'model_output')
        .flatMap((step) => step.content || [])
        .filter((part) => part.type === 'text' && part.text)
        .map((part) => part.text)

      const outputText = data.output_text || texts.join('\n')
      setResult(outputText || '해석 결과를 받지 못했습니다.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      // 성공이든 실패든, 로딩은 끝냅니다.
      setIsLoading(false)
    }
  }

  return (
    <main className="page">
      <section className="sheet">
        <header className="sheet-header">
          <p className="sheet-eyebrow">四柱</p>
          <h1>사주미麗</h1>
          <p className="sheet-lead">생년월일을 적으면 명식을 풀어 드립니다</p>
        </header>

        <div className="field">
          {/* htmlFor와 input의 id를 같게 하면, 라벨을 눌러도 입력창에 포커스가 갑니다. */}
          <label className="field-label" htmlFor="name">이름</label>
          <input
            id="name"
            type="text"
            placeholder="이름을 입력하세요"
            // value={name}: input에 보이는 글자를 name 상태와 연결합니다.
            value={name}
            // onChange: 사용자가 글자를 칠 때마다 실행됩니다.
            // e.target.value는 지금 입력창에 적힌 글자입니다.
            // setName으로 name 상태를 바꾸면, 아래 <p>도 함께 다시 그려집니다.
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="birthDate">생년월일</label>
          <input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="birthTime">태어난 시간</label>
          <input
            id="birthTime"
            type="time"
            value={birthTime}
            onChange={(e) => setBirthTime(e.target.value)}
          />
        </div>

        <div className="field">
          <span className="field-label">성별</span>
          {/* name이 같으면 둘 중 하나만 선택할 수 있습니다. */}
          {/* checked: 지금 gender 상태와 이 버튼의 value가 같으면 체크됩니다. */}
          <div className="choices">
            <label className="choice" htmlFor="gender-male">
              <input
                id="gender-male"
                type="radio"
                name="gender"
                value="남성"
                checked={gender === '남성'}
                onChange={(e) => setGender(e.target.value)}
              />
              남성
            </label>
            <label className="choice" htmlFor="gender-female">
              <input
                id="gender-female"
                type="radio"
                name="gender"
                value="여성"
                checked={gender === '여성'}
                onChange={(e) => setGender(e.target.value)}
              />
              여성
            </label>
          </div>
        </div>

        <div className="field">
          <span className="field-label">양력/음력</span>
          <div className="choices">
            <label className="choice" htmlFor="calendar-solar">
              <input
                id="calendar-solar"
                type="radio"
                name="calendarType"
                value="양력"
                checked={calendarType === '양력'}
                onChange={(e) => setCalendarType(e.target.value)}
              />
              양력
            </label>
            <label className="choice" htmlFor="calendar-lunar">
              <input
                id="calendar-lunar"
                type="radio"
                name="calendarType"
                value="음력"
                checked={calendarType === '음력'}
                onChange={(e) => setCalendarType(e.target.value)}
              />
              음력
            </label>
          </div>
        </div>

        {/* name이 바뀔 때마다 이 문장도 실시간으로 바뀝니다. */}
        <p className="preview">{name}님의 사주</p>

        <button className="submit" type="button" onClick={handleAskSaju} disabled={isLoading}>
          {isLoading ? '해석 중...' : '사주 해석하기'}
        </button>

        {errorMessage && <p className="error">{errorMessage}</p>}

        {result && <div className="result">{renderSajuResult(result)}</div>}
      </section>
    </main>
  )
}

export default App
