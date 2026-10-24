import { memo, useLayoutEffect, useRef } from 'react'
import { RichText } from '../../../shared/RichText'
import { eqTransform, type PageEq } from '../hwpEquations'

// 결과 문서 쪽 그림 위에 수식을 해설지 탭과 같은 웹 수식(RichText display)으로 겹쳐 그린다 (rhwp 수식은 쪽 그림에서 뺐다, ../Backend 오류 기록 051).
// 글자 크기는 문서의 수식 크기(baseUnit), 왼쪽은 rhwp 수식 상자, 기준선은 그 줄 기준선. 상자보다 넓으면 상자 폭으로 줄인다. 누르기는 위 문항 네모가 받는다.
// 목록에 마우스를 올릴 때마다 쪽이 다시 그려지므로 같은 수식이면 다시 그리지 않는다 (memo)
export const EquationLayer = memo(function EquationLayer({ eqs }: { eqs: PageEq[] }) {
  const layer = useRef<HTMLDivElement>(null)

  // 그린 폭과 기준선(높이 0 표시의 위치)을 재서 자리를 맞춘다. 수식 글꼴을 다 받으면 다시 잰다
  useLayoutEffect(() => {
    const fit = () =>
      layer.current?.querySelectorAll<HTMLElement>(':scope > .academy-eq').forEach((el, i) => {
        const base = (el.firstElementChild as HTMLElement).offsetTop
        el.style.transform = eqTransform(eqs[i].w, el.offsetWidth, base)
      })
    fit()
    document.fonts?.addEventListener('loadingdone', fit)
    return () => document.fonts?.removeEventListener('loadingdone', fit)
  }, [eqs])

  return (
    <div className="academy-eqs" ref={layer} aria-hidden="true">
      {eqs.map((e, i) => (
        <span key={i} className="academy-eq" style={{ left: e.x, top: e.baseline, fontSize: e.size }}>
          <span className="academy-eq-base" />
          <RichText text={`<<EQ>>${e.script}<</EQ>>`} display />
        </span>
      ))}
    </div>
  )
})
