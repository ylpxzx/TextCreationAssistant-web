import { CheckCircle, Info, WarningCircle, X } from '@phosphor-icons/react'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type ToastInput = { message: string; tone?: 'success' | 'error' | 'info' }
type ConfirmInput = { title: string; message: string; confirmLabel?: string; danger?: boolean }
type Toast = ToastInput & { id: number }
const ToastContext = createContext<(input: ToastInput) => void>(() => undefined)
const ConfirmContext = createContext<(input: ConfirmInput) => Promise<boolean>>(input => Promise.resolve(window.confirm(`${input.title}\n\n${input.message}`)))

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmation, setConfirmation] = useState<(ConfirmInput & { resolve: (value: boolean) => void }) | null>(null)
  const nextId = useRef(0)
  const toast = useCallback((input: ToastInput) => { const id = ++nextId.current; setToasts(current => [...current, { id, tone: 'info', ...input }]); window.setTimeout(() => setToasts(current => current.filter(item => item.id !== id)), 3600) }, [])
  const confirm = useCallback((input: ConfirmInput) => new Promise<boolean>(resolve => setConfirmation({ ...input, resolve })), [])
  const finish = (value: boolean) => { confirmation?.resolve(value); setConfirmation(null) }
  return <ToastContext.Provider value={toast}><ConfirmContext.Provider value={confirm}>{children}
    <div className="toast-region" aria-live="polite">{toasts.map(item => <div className={`toast ${item.tone}`} key={item.id}>{item.tone === 'success' ? <CheckCircle weight="fill" /> : item.tone === 'error' ? <WarningCircle weight="fill" /> : <Info weight="fill" />}<span>{item.message}</span><button onClick={() => setToasts(current => current.filter(value => value.id !== item.id))} aria-label="关闭提示"><X /></button></div>)}</div>
    {confirmation && <div className="modal-backdrop confirm-backdrop" onMouseDown={() => finish(false)}><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onMouseDown={event => event.stopPropagation()}><h2 id="confirm-title">{confirmation.title}</h2><p>{confirmation.message}</p><footer><button className="button" onClick={() => finish(false)}>取消</button><button className={`button ${confirmation.danger ? 'danger-solid' : 'primary'}`} autoFocus onClick={() => finish(true)}>{confirmation.confirmLabel || '确认'}</button></footer></section></div>}
  </ConfirmContext.Provider></ToastContext.Provider>
}

export const useToast = () => useContext(ToastContext)
export const useConfirm = () => useContext(ConfirmContext)
