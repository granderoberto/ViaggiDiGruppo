export interface ApiErrorPayload {
  code: string
  message: string
  details?: unknown
}

export interface ApiSuccessEnvelope<T> {
  ok: true
  data: T
}

export interface ApiErrorEnvelope {
  ok: false
  error: ApiErrorPayload
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope
