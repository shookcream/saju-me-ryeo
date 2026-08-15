const POSES = {
  login: '/assets/령이_3.png',
  loading: '/assets/령이_2.png',
  result: '/assets/령이_5.png',
  missing: '/assets/령이_4.png',
  title: '/assets/령이_6.png',
}

const ALTS = {
  login: '편안하게 누워 있는 령이',
  loading: '명식을 풀어 적고 있는 령이',
  result: '기쁘게 뛰어가는 령이',
  missing: '두 손을 모은 령이',
  title: '책상 위에 앉아 있는 령이',
}

function Ryeongi({ pose, className = '' }) {
  return (
    <div className={`ryeongi-stage ryeongi-stage--${pose} ${className}`.trim()}>
      <img className="ryeongi" src={POSES[pose]} alt={ALTS[pose]} />
    </div>
  )
}

export default Ryeongi
