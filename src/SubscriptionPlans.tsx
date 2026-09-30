import { useState } from 'react'
import { Link } from 'react-router-dom'

export function SubscriptionPlans() {
  const [annual, setAnnual] = useState(false)
  return (
    <section className="subscription-plans" aria-labelledby="subscription-title">
      <div className="subscription-heading">
        <p>내 수업 준비에 맞는 방식</p>
        <h2 id="subscription-title">AI는 편한 쪽으로<br />해설지는 풀이담으로</h2>
      </div>
      <div className="subscription-billing" role="group" aria-label="결제 주기">
        <button type="button" aria-pressed={!annual} onClick={() => setAnnual(false)}>월간</button>
        <button type="button" aria-pressed={annual} onClick={() => setAnnual(true)}>연간 <span>20% 할인</span></button>
      </div>
      <div className="subscription-grid">
        <article className="subscription-card">
          <div className="subscription-card-top"><div><span className="subscription-label">내 AI로 시작</span><h3>개인 AI 연결 <small>MCP</small></h3></div><p className="subscription-price">0원 <span>/ 연결</span></p></div>
          <p className="subscription-description">이미 사용 중인 AI와 연결해서<br />시험지와 풀이를 한곳에 모으세요</p>
          <ul><li>개인 AI에서 풀이 작업 진행</li><li>문항별 풀이 확인과 한글 해설지 다운로드</li><li>개인 AI 구독 요금은 별도</li></ul>
          <Link to="/new?mode=mcp" className="subscription-action">개인 AI 연결하기 <span aria-hidden="true">→</span></Link>
        </article>
        <article className="subscription-card subscription-card-ai">
          <div className="subscription-card-top"><div><span className="subscription-label">풀이담에서 간편하게</span><h3>풀이담 AI</h3></div><p className="subscription-price">{annual ? '152,000원' : '19,000원'} <span>{annual ? '/ 연간 240회' : '/ 월 20회'}</span></p></div>
          <p className="subscription-description">별도의 AI 연결 없이<br />풀이담에서 수업 준비를 시작하세요</p>
          <ul><li>풀이담이 제공하는 AI 사용</li><li>문항별 풀이와 편집 가능한 한글 해설지</li><li>{annual ? <>연간 정가 <s>190,000원</s>에서 20% 할인 · 38,000원 절약</> : '매월 시험지 20회 · 파일 한 개당 1회'}</li>{annual && <li>연간 일시 결제 · 총 240회</li>}</ul>
          <Link to={`/login?intent=subscribe&billing=${annual ? 'annual' : 'monthly'}`} className="subscription-action">이용권 구매하기 <span aria-hidden="true">→</span></Link>
        </article>
      </div>
      <div className="subscription-topup">
        <div><strong>횟수가 부족할 때</strong><span>추가 크레딧 10회 <b>9,900원</b></span></div>
        <Link to="/login?intent=credits">추가 크레딧 구매 <span aria-hidden="true">→</span></Link>
      </div>
      <p className="subscription-note">임시 요금 안내 · 실제 결제는 아직 연결되지 않았으며 가격과 이용 조건은 변경될 수 있어요</p>
    </section>
  )
}

export function SubscriptionPage() {
  return (
    <div className="subscription-page">
      <header className="subscription-header">
        <Link to="/" className="subscription-brand"><img className="header-bear-icon" src="/favicon.svg" width="32" height="32" alt="" />풀이담</Link>
        <nav aria-label="구독 페이지 메뉴"><Link to="/jobs">작업 목록</Link><Link to="/">홈으로</Link><Link to="/login">로그인</Link></nav>
      </header>
      <main><SubscriptionPlans /></main>
    </div>
  )
}
