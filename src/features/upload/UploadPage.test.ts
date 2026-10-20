import { expect, it } from 'vitest'
import { ACCEPTED } from './UploadPage'

it('hml 시험지를 받는다', () => {
  expect(ACCEPTED).toContain('.hml')
})
