import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  requiredLabel?: boolean
}

export function Field({ id, label, requiredLabel = false, ...props }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {requiredLabel ? ' *' : ''}
      </label>
      <input id={id} className="input" aria-required={requiredLabel} {...props} />
    </div>
  )
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string
  label: string
}

export function TextareaField({ id, label, ...props }: TextareaFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} className="textarea" {...props} />
    </div>
  )
}
