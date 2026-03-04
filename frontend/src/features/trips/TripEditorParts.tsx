import { Button } from '../../ui/components/Button'
import { Field } from '../../ui/components/Field'
import type { Activity, Expense, Participant } from './types'

export interface EditableParticipant extends Participant {
  rowId: string
}

export interface EditableActivity extends Activity {
  rowId: string
}

export interface EditableExpense extends Expense {
  rowId: string
}

interface ParticipantsEditorProps {
  participants: EditableParticipant[]
  onChange: (next: EditableParticipant[]) => void
}

export function ParticipantsEditor({ participants, onChange }: ParticipantsEditorProps) {
  return (
    <div className="stack">
      {participants.map((participant, index) => (
        <div key={participant.rowId} className="row-item">
          <Field
            id={`participant-${participant.rowId}`}
            label={`Partecipante ${index + 1}`}
            value={participant.name ?? ''}
            onChange={(event) => {
              onChange(
                participants.map((current) =>
                  current.rowId === participant.rowId ? { ...current, name: event.target.value } : current,
                ),
              )
            }}
          />
          <Button variant="danger" type="button" onClick={() => onChange(participants.filter((item) => item.rowId !== participant.rowId))}>
            Rimuovi
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={() => onChange([...participants, { rowId: crypto.randomUUID(), name: '' }])}>
        Aggiungi partecipante
      </Button>
    </div>
  )
}

interface ActivitiesEditorProps {
  activities: EditableActivity[]
  onChange: (next: EditableActivity[]) => void
}

export function ActivitiesEditor({ activities, onChange }: ActivitiesEditorProps) {
  return (
    <div className="stack">
      {activities.map((activity) => (
        <div key={activity.rowId} className="subcard stack">
          <div className="row" style={{ alignItems: 'center' }}>
            <label>
              <input
                type="checkbox"
                checked={Boolean(activity.done)}
                onChange={(event) => {
                  onChange(
                    activities.map((current) =>
                      current.rowId === activity.rowId ? { ...current, done: event.target.checked } : current,
                    ),
                  )
                }}
              />{' '}
              Completata
            </label>
            <Button variant="danger" type="button" onClick={() => onChange(activities.filter((item) => item.rowId !== activity.rowId))}>
              Rimuovi attività
            </Button>
          </div>
          <div className="row">
            <Field
              id={`activity-title-${activity.rowId}`}
              label="Titolo"
              value={activity.title ?? ''}
              onChange={(event) => {
                onChange(
                  activities.map((current) =>
                    current.rowId === activity.rowId ? { ...current, title: event.target.value } : current,
                  ),
                )
              }}
            />
            <Field
              id={`activity-date-${activity.rowId}`}
              label="Data"
              type="date"
              value={activity.date ?? ''}
              onChange={(event) => {
                onChange(
                  activities.map((current) =>
                    current.rowId === activity.rowId ? { ...current, date: event.target.value || undefined } : current,
                  ),
                )
              }}
            />
            <div className="field" style={{ maxWidth: 220 }}>
              <label htmlFor={`activity-type-${activity.rowId}`}>Tipo</label>
              <select
                id={`activity-type-${activity.rowId}`}
                className="select"
                value={activity.type ?? 'OTHER'}
                onChange={(event) => {
                  onChange(
                    activities.map((current) =>
                      current.rowId === activity.rowId ? { ...current, type: event.target.value } : current,
                    ),
                  )
                }}
              >
                <option value="VISIT">VISIT</option>
                <option value="FOOD">FOOD</option>
                <option value="TRANSFER">TRANSFER</option>
                <option value="WALK">WALK</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() => onChange([...activities, { rowId: crypto.randomUUID(), title: '', type: 'OTHER', done: false }])}
      >
        Aggiungi attività
      </Button>
    </div>
  )
}

interface ExpensesEditorProps {
  expenses: EditableExpense[]
  onChange: (next: EditableExpense[]) => void
}

export function ExpensesEditor({ expenses, onChange }: ExpensesEditorProps) {
  const total = expenses.reduce((sum, expense) => sum + (Number.isFinite(expense.amount) ? expense.amount : 0), 0)

  return (
    <div className="stack">
      <p>Totale: {total.toFixed(2)} €</p>
      {expenses.map((expense) => (
        <div key={expense.rowId} className="subcard stack">
          <div className="row">
            <Field
              id={`expense-label-${expense.rowId}`}
              label="Voce"
              value={expense.label ?? ''}
              onChange={(event) => {
                onChange(
                  expenses.map((current) =>
                    current.rowId === expense.rowId ? { ...current, label: event.target.value } : current,
                  ),
                )
              }}
            />
            <Field
              id={`expense-amount-${expense.rowId}`}
              label="Importo"
              type="number"
              step="0.01"
              value={Number.isFinite(expense.amount) ? String(expense.amount) : ''}
              onChange={(event) => {
                const amount = Number(event.target.value)
                onChange(
                  expenses.map((current) =>
                    current.rowId === expense.rowId ? { ...current, amount: Number.isFinite(amount) ? amount : 0 } : current,
                  ),
                )
              }}
            />
            <Field
              id={`expense-paid-by-${expense.rowId}`}
              label="Pagato da"
              value={expense.paidBy ?? ''}
              onChange={(event) => {
                onChange(
                  expenses.map((current) =>
                    current.rowId === expense.rowId
                      ? { ...current, paidBy: event.target.value || undefined }
                      : current,
                  ),
                )
              }}
            />
          </div>
          <div className="row">
            <div className="field" style={{ maxWidth: 220 }}>
              <label htmlFor={`expense-category-${expense.rowId}`}>Categoria</label>
              <select
                id={`expense-category-${expense.rowId}`}
                className="select"
                value={expense.category ?? ''}
                onChange={(event) => {
                  onChange(
                    expenses.map((current) =>
                      current.rowId === expense.rowId
                        ? { ...current, category: event.target.value || undefined }
                        : current,
                    ),
                  )
                }}
              >
                <option value="">Seleziona</option>
                <option value="TRANSPORT">TRANSPORT</option>
                <option value="FOOD">FOOD</option>
                <option value="STAY">STAY</option>
                <option value="ACTIVITY">ACTIVITY</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
            <Field
              id={`expense-currency-${expense.rowId}`}
              label="Valuta"
              value={expense.currency ?? 'EUR'}
              onChange={(event) => {
                onChange(
                  expenses.map((current) =>
                    current.rowId === expense.rowId
                      ? { ...current, currency: (event.target.value || 'EUR').toUpperCase() }
                      : current,
                  ),
                )
              }}
            />
          </div>
          <Button variant="danger" type="button" onClick={() => onChange(expenses.filter((item) => item.rowId !== expense.rowId))}>
            Rimuovi spesa
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() => onChange([...expenses, { rowId: crypto.randomUUID(), label: '', amount: 0, currency: 'EUR' }])}
      >
        Aggiungi spesa
      </Button>
    </div>
  )
}
