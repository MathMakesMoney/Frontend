import { useQuery } from '@tanstack/react-query'
import { fetchMe } from './api'

// 로그인한 회원 (['me'] 쿼리 하나를 모두 같이 쓴다). me 가 null 이면 로그아웃 상태
export function useMe() {
  const { data, isLoading } = useQuery({ queryKey: ['me'], queryFn: fetchMe, retry: false, staleTime: Infinity })
  return { me: data ?? null, isLoading }
}
