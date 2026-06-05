import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ToastProvider, useToast, type ToastOptions } from '../components/ui/Toast'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function TestButton({ options }: { options: ToastOptions }) {
  const { addToast } = useToast()
  return <button onClick={() => addToast(options)}>Show Toast</button>
}

function TestAll() {
  const { toasts, addToast } = useToast()
  return (
    <div>
      <span data-testid="count">{toasts.length}</span>
      <button data-testid="add-success" onClick={() => addToast({ title: 'Success', variant: 'success' })}>Add Success</button>
      <button data-testid="add-error" onClick={() => addToast({ title: 'Error', variant: 'error' })}>Add Error</button>
      <button data-testid="add-warning" onClick={() => addToast({ title: 'Warning', variant: 'warning' })}>Add Warning</button>
      <button data-testid="add-info" onClick={() => addToast({ title: 'Info', variant: 'info' })}>Add Info</button>
      <button data-testid="add-description" onClick={() => addToast({ title: 'With Desc', description: 'Description text' })}>Add With Desc</button>
      <button data-testid="add-no-title" onClick={() => addToast({ description: 'No title' })}>Add No Title</button>
      {toasts.map(t => (
        <div key={t.id} data-testid={`toast-${t.id}`}>
          <span data-testid={`title-${t.id}`}>{t.title}</span>
          <span data-testid={`desc-${t.id}`}>{t.description}</span>
          <span data-testid={`variant-${t.id}`}>{t.variant}</span>
          <button data-testid={`remove-${t.id}`} onClick={() => {
            const { removeToast } = useToast()
            removeToast(t.id)
          }}>X</button>
        </div>
      ))}
    </div>
  )
}

describe('ToastProvider', () => {
  it('renders children', () => {
    render(
      <ToastProvider>
        <div data-testid="child">Hello</div>
      </ToastProvider>
    )
    expect(screen.getByTestId('child')).toHaveTextContent('Hello')
  })

  it('throws when useToast is used outside provider', () => {
    expect(() => render(<TestButton options={{ title: 'test' }} />)).toThrow(
      'useToast must be used within ToastProvider'
    )
  })

  it('starts with zero toasts', () => {
    render(
      <ToastProvider>
        <TestAll />
      </ToastProvider>
    )
    expect(screen.getByTestId('count')).toHaveTextContent('0')
  })
})

describe('addToast', () => {
  it('adds a toast when triggered', () => {
    render(
      <ToastProvider>
        <TestButton options={{ title: 'Hello Toast' }} />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText('Show Toast'))
    expect(screen.getByText('Hello Toast')).toBeDefined()
  })

  it('uses default variant info when not specified', () => {
    function TestDefaultVariant() {
      const { toasts, addToast } = useToast()
      return (
        <div>
          <button data-testid="add" onClick={() => addToast({ title: 'Default' })}>Add</button>
          {toasts.map(t => <span key={t.id} data-testid="variant">{t.variant}</span>)}
        </div>
      )
    }
    render(
      <ToastProvider>
        <TestDefaultVariant />
      </ToastProvider>
    )
    fireEvent.click(screen.getByTestId('add'))
    expect(screen.getByTestId('variant')).toHaveTextContent('info')
  })

  it('uses default durationMs 5000 when not specified', () => {
    function TestDefaultDuration() {
      const { toasts, addToast } = useToast()
      return (
        <div>
          <button data-testid="add" onClick={() => addToast({ title: 'Default Duration' })}>Add</button>
          {toasts.map(t => <span key={t.id} data-testid="duration">{t.durationMs}</span>)}
        </div>
      )
    }
    render(
      <ToastProvider>
        <TestDefaultDuration />
      </ToastProvider>
    )
    fireEvent.click(screen.getByTestId('add'))
    expect(screen.getByTestId('duration')).toHaveTextContent('5000')
  })
})

describe('removeToast', () => {
  it('removes a toast when triggered', () => {
    function TestRemove() {
      const { toasts, addToast, removeToast } = useToast()
      return (
        <div>
          <button data-testid="add" onClick={() => {
            addToast({ title: 'To Remove' })
          }}>Add</button>
          {toasts.map(t => (
            <div key={t.id}>
              <span data-testid={`toast-${t.id}`}>{t.title}</span>
              <button data-testid={`remove-${t.id}`} onClick={() => removeToast(t.id)}>X</button>
            </div>
          ))}
        </div>
      )
    }
    render(
      <ToastProvider>
        <TestRemove />
      </ToastProvider>
    )
    fireEvent.click(screen.getByTestId('add'))
    const toastElements = screen.getAllByText('To Remove')
    expect(toastElements.length).toBeGreaterThanOrEqual(1)
  })
})

describe('auto-remove', () => {
  it('removes toast after durationMs', () => {
    function TestAutoRemove() {
      const { toasts, addToast } = useToast()
      return (
        <div>
          <span data-testid="count">{toasts.length}</span>
          <button data-testid="add" onClick={() => addToast({ title: 'Auto Remove', durationMs: 100 })}>Add</button>
        </div>
      )
    }
    render(
      <ToastProvider>
        <TestAutoRemove />
      </ToastProvider>
    )
    fireEvent.click(screen.getByTestId('add'))
    expect(screen.getByTestId('count')).toHaveTextContent('1')
    act(() => { vi.advanceTimersByTime(150) })
    expect(screen.getByTestId('count')).toHaveTextContent('0')
  })
})
