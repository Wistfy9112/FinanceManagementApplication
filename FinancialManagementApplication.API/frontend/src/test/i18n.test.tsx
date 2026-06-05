import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { LanguageProvider, useLanguage, useT } from '../i18n'

function TestConsumer() {
  const { locale, setLocale, t } = useLanguage()
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="translated">{t('Đăng Nhập Hệ Thống')}</span>
      <span data-testid="missing">{t('non_existent_key')}</span>
      <button data-testid="switch-en" onClick={() => setLocale('en')}>EN</button>
      <button data-testid="switch-vi" onClick={() => setLocale('vi')}>VI</button>
    </div>
  )
}

function TestT() {
  const t = useT()
  return <span data-testid="hook-t">{t('Đăng Nhập Hệ Thống')}</span>
}

beforeEach(() => {
  localStorage.clear()
})

describe('LanguageProvider', () => {

  it('renders children', () => {
    render(
      <LanguageProvider>
        <div data-testid="child">Hello</div>
      </LanguageProvider>
    )
    expect(screen.getByTestId('child')).toHaveTextContent('Hello')
  })

  it('defaults to Vietnamese locale', () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    )
    expect(screen.getByTestId('locale')).toHaveTextContent('vi')
  })

  it('returns Vietnamese key when locale is vi', () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    )
    expect(screen.getByTestId('translated')).toHaveTextContent('Đăng Nhập Hệ Thống')
  })

  it('returns English translation when locale is en', () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    )
    fireEvent.click(screen.getByTestId('switch-en'))
    expect(screen.getByTestId('translated')).toHaveTextContent('System Login')
  })

  it('returns key as-is for missing translations', () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    )
    fireEvent.click(screen.getByTestId('switch-en'))
    expect(screen.getByTestId('missing')).toHaveTextContent('non_existent_key')
  })

  it('persists locale choice to localStorage', () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    )
    fireEvent.click(screen.getByTestId('switch-en'))
    expect(localStorage.getItem('locale')).toBe('en')
  })

  it('switches back to Vietnamese', () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    )
    fireEvent.click(screen.getByTestId('switch-en'))
    expect(screen.getByTestId('locale')).toHaveTextContent('en')
    fireEvent.click(screen.getByTestId('switch-vi'))
    expect(screen.getByTestId('locale')).toHaveTextContent('vi')
  })

  it('reads locale from localStorage on mount', () => {
    localStorage.setItem('locale', 'en')
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    )
    expect(screen.getByTestId('locale')).toHaveTextContent('en')
  })
})

describe('useT hook', () => {
  it('returns a translation function', () => {
    render(
      <LanguageProvider>
        <TestT />
      </LanguageProvider>
    )
    expect(screen.getByTestId('hook-t')).toHaveTextContent('Đăng Nhập Hệ Thống')
  })
})
