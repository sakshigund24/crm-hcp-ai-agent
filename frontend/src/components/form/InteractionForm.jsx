import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Save, RotateCcw, ChevronDown, Sparkles } from 'lucide-react'
import { logInteractionForm } from '../../redux/slices/interactionsSlice'
import { addToast } from '../../redux/slices/uiSlice'

const INITIAL = {
  hcp_name: '',
  specialty: '',
  hospital: '',
  interaction_type: 'Visit',
  interaction_date: '',
  summary: '',
  topics_discussed: '',
  products_discussed: '',
  materials_shared: '',
  sentiment: 'Neutral',
  follow_up_required: false,
  follow_up_date: '',
  follow_up_notes: '',
  outcomes: '',
}

// ── These MUST live outside the component so they are never recreated on render,
//    which would cause React to unmount+remount the input and lose focus on every keystroke.

function Field({ label, fieldKey, highlighted, children }) {
  return (
    <div>
      <label className="label flex items-center gap-1.5">
        {label}
        {highlighted && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 font-semibold">
            <Sparkles size={9} /> AI
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

function SelectField({ value, onChange, options, fieldKey, highlighted }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`input-field appearance-none pr-9 ${
          highlighted ? 'ring-2 ring-green-400 ring-offset-1 transition-all duration-300' : ''
        }`}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function InteractionForm({ extractedData }) {
  const dispatch   = useDispatch()
  const submitting = useSelector((s) => s.interactions.submitting)
  const [form, setForm]                         = useState(INITIAL)
  const [highlightedFields, setHighlightedFields] = useState(new Set())

  // Auto-populate form whenever AI extracts new data
  useEffect(() => {
    if (!extractedData) return

    const mapping = {
      hcp_name:           extractedData.hcp_name,
      specialty:          extractedData.specialty,
      hospital:           extractedData.hospital,
      interaction_type:   extractedData.interaction_type,
      interaction_date:   extractedData.interaction_date,
      summary:            extractedData.summary,
      topics_discussed:   extractedData.topics_discussed,
      products_discussed: Array.isArray(extractedData.products_discussed)
                            ? extractedData.products_discussed.join(', ')
                            : extractedData.products_discussed,
      materials_shared:   extractedData.materials_shared,
      sentiment:          extractedData.sentiment,
      follow_up_required: extractedData.follow_up_required,
      follow_up_date:     extractedData.follow_up_date,
      follow_up_notes:    extractedData.follow_up_notes,
      outcomes:           extractedData.outcomes,
    }

    const filled = new Set()
    const updates = {}
    for (const [key, val] of Object.entries(mapping)) {
      if (val !== undefined && val !== null && val !== '') {
        updates[key] = val
        filled.add(key)
      }
    }

    setForm((prev) => ({ ...prev, ...updates }))
    setHighlightedFields(filled)

    const timer = setTimeout(() => setHighlightedFields(new Set()), 2500)
    return () => clearTimeout(timer)
  }, [extractedData])

  // FIX: use functional updater so each field change doesn't trigger extra renders
  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    // Remove highlight for the field the user is now manually editing
    setHighlightedFields((prev) => {
      if (!prev.has(k)) return prev   // no change → same reference → no re-render
      const n = new Set(prev)
      n.delete(k)
      return n
    })
  }

  const hl = (key) => highlightedFields.has(key)

  const hlClass = (key) =>
    hl(key) ? 'ring-2 ring-green-400 ring-offset-1 transition-all duration-300' : ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.hcp_name.trim()) {
      dispatch(addToast({ type: 'error', message: 'HCP name is required.' }))
      return
    }
    const payload = {
      ...form,
      interaction_date: form.interaction_date || undefined,
      follow_up_date:   form.follow_up_date   || undefined,
    }
    const res = await dispatch(logInteractionForm(payload))
    if (logInteractionForm.fulfilled.match(res)) {
      dispatch(addToast({ type: 'success', message: `Interaction with ${form.hcp_name} logged!` }))
      setForm(INITIAL)
      setHighlightedFields(new Set())
    } else {
      dispatch(addToast({ type: 'error', message: res.payload || 'Something went wrong.' }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Row 1 */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="HCP Name *" fieldKey="hcp_name" highlighted={hl('hcp_name')}>
          <input
            className={`input-field ${hlClass('hcp_name')}`}
            placeholder="e.g. Dr. Priya Sharma"
            value={form.hcp_name}
            onChange={(e) => set('hcp_name', e.target.value)}
            required
          />
        </Field>
        <Field label="Specialty" fieldKey="specialty" highlighted={hl('specialty')}>
          <input
            className={`input-field ${hlClass('specialty')}`}
            placeholder="e.g. Oncology"
            value={form.specialty}
            onChange={(e) => set('specialty', e.target.value)}
          />
        </Field>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Hospital / Clinic" fieldKey="hospital" highlighted={hl('hospital')}>
          <input
            className={`input-field ${hlClass('hospital')}`}
            placeholder="e.g. Apollo Hospital"
            value={form.hospital}
            onChange={(e) => set('hospital', e.target.value)}
          />
        </Field>
        <Field label="Interaction Type" fieldKey="interaction_type" highlighted={hl('interaction_type')}>
          <SelectField
            value={form.interaction_type}
            onChange={(v) => set('interaction_type', v)}
            options={['Visit', 'Call', 'Email', 'Conference', 'Webinar']}
            fieldKey="interaction_type"
            highlighted={hl('interaction_type')}
          />
        </Field>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date" fieldKey="interaction_date" highlighted={hl('interaction_date')}>
          <input
            type="date"
            className={`input-field ${hlClass('interaction_date')}`}
            value={form.interaction_date}
            onChange={(e) => set('interaction_date', e.target.value)}
          />
        </Field>
        <Field label="HCP Sentiment" fieldKey="sentiment" highlighted={hl('sentiment')}>
          <SelectField
            value={form.sentiment}
            onChange={(v) => set('sentiment', v)}
            options={['Positive', 'Neutral', 'Negative']}
            fieldKey="sentiment"
            highlighted={hl('sentiment')}
          />
        </Field>
      </div>

      {/* Summary */}
      <Field label="Discussion Summary" fieldKey="summary" highlighted={hl('summary')}>
        <textarea
          className={`input-field resize-none ${hlClass('summary')}`}
          rows={3}
          placeholder="What did you discuss?"
          value={form.summary}
          onChange={(e) => set('summary', e.target.value)}
        />
      </Field>

      {/* Topics + Products */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Topics Discussed" fieldKey="topics_discussed" highlighted={hl('topics_discussed')}>
          <input
            className={`input-field ${hlClass('topics_discussed')}`}
            placeholder="e.g. Efficacy, Side effects"
            value={form.topics_discussed}
            onChange={(e) => set('topics_discussed', e.target.value)}
          />
        </Field>
        <Field label="Products Discussed" fieldKey="products_discussed" highlighted={hl('products_discussed')}>
          <input
            className={`input-field ${hlClass('products_discussed')}`}
            placeholder="e.g. Metformin, Jardiance"
            value={form.products_discussed}
            onChange={(e) => set('products_discussed', e.target.value)}
          />
        </Field>
      </div>

      {/* Materials */}
      <Field label="Materials Shared" fieldKey="materials_shared" highlighted={hl('materials_shared')}>
        <input
          className={`input-field ${hlClass('materials_shared')}`}
          placeholder="e.g. Clinical summary PDF"
          value={form.materials_shared}
          onChange={(e) => set('materials_shared', e.target.value)}
        />
      </Field>

      {/* Outcomes */}
      <Field label="Outcomes / Agreements" fieldKey="outcomes" highlighted={hl('outcomes')}>
        <textarea
          className={`input-field resize-none ${hlClass('outcomes')}`}
          rows={2}
          placeholder="Commitments made, decisions reached..."
          value={form.outcomes}
          onChange={(e) => set('outcomes', e.target.value)}
        />
      </Field>

      {/* Follow-up */}
      <div className={`p-4 rounded-xl border border-dashed bg-slate-50/50 transition-all duration-300 ${
        hl('follow_up_required') || hl('follow_up_date')
          ? 'border-green-300 bg-green-50/40'
          : 'border-slate-200'
      }`}>
        <div className="flex items-center gap-3 mb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-green-500 rounded"
              checked={form.follow_up_required}
              onChange={(e) => set('follow_up_required', e.target.checked)}
            />
            <span className="text-sm font-semibold text-slate-700">Follow-up Required</span>
          </label>
          {hl('follow_up_required') && (
            <span className="text-[10px] text-green-600 font-semibold flex items-center gap-0.5">
              <Sparkles size={9} /> AI filled
            </span>
          )}
        </div>
        {form.follow_up_required && (
          <div className="grid grid-cols-2 gap-4 animate-slide-up">
            <Field label="Follow-up Date" fieldKey="follow_up_date" highlighted={hl('follow_up_date')}>
              <input
                type="date"
                className={`input-field ${hlClass('follow_up_date')}`}
                value={form.follow_up_date}
                onChange={(e) => set('follow_up_date', e.target.value)}
              />
            </Field>
            <Field label="Follow-up Notes" fieldKey="follow_up_notes" highlighted={hl('follow_up_notes')}>
              <input
                className={`input-field ${hlClass('follow_up_notes')}`}
                placeholder="What needs to happen?"
                value={form.follow_up_notes}
                onChange={(e) => set('follow_up_notes', e.target.value)}
              />
            </Field>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
          ) : (
            <><Save size={15} />Log Interaction</>
          )}
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={submitting}
          onClick={() => { setForm(INITIAL); setHighlightedFields(new Set()) }}
        >
          <RotateCcw size={14} />Reset
        </button>
      </div>
    </form>
  )
}