import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useLanguage } from '../i18n'

function TestConsumer() {
  const { t } = useLanguage()
  return (
    <div>
      <span data-testid="translated">{t('Đăng Nhập Hệ Thống')}</span>
      <span data-testid="missing">{t('non_existent_key')}</span>
    </div>
  )
}

describe('useLanguage', () => {
  it('returns key as-is (Vietnamese)', () => {
    render(<TestConsumer />)
    expect(screen.getByTestId('translated')).toHaveTextContent('Đăng Nhập Hệ Thống')
  })

  it('returns key as-is for missing translations', () => {
    render(<TestConsumer />)
    expect(screen.getByTestId('missing')).toHaveTextContent('non_existent_key')
  })
})
