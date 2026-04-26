import { useEffect, useState } from 'react'

type IndicationLead = {
  id: string
  nome?: string
  phone?: string
  telefone?: string
  email?: string
  empresa?: string
  status?: string
  etapa?: string
  refusal_reason?: string | null
  indicator_commission_amount?: number | null
  indicator_payment_due_date?: string | null
  selected_message_template?: string | null
}

type Props = {
  open: boolean
  lead: IndicationLead | null
  onClose: () => void
  onSave: (payload: {
    refusal_reason: string
    indicator_commission_amount: number | null
    indicator_payment_due_date: string | null
    selected_message_template: string
  }) => Promise<void> | void
}

export default function IndicationDetailsModal({
  open,
  lead,
  onClose,
  onSave,
}: Props) {
  const [refusalReason, setRefusalReason] = useState('')
  const [commissionAmount, setCommissionAmount] = useState('')
  const [paymentDueDate, setPaymentDueDate] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (lead) {
      setRefusalReason(lead.refusal_reason || '')
      setCommissionAmount(
        lead.indicator_commission_amount != null
          ? String(lead.indicator_commission_amount)
          : ''
      )
      setPaymentDueDate(lead.indicator_payment_due_date || '')
      setSelectedTemplate(lead.selected_message_template || '')
    }
  }, [lead])

  if (!open || !lead) return null

  async function handleSave() {
    try {
      setSaving(true)

      await onSave({
        refusal_reason: refusalReason,
        indicator_commission_amount:
          commissionAmount.trim() === '' ? null : Number(commissionAmount),
        indicator_payment_due_date:
          paymentDueDate.trim() === '' ? null : paymentDueDate,
        selected_message_template: selectedTemplate,
      })

      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div>
            <h2 style={titleStyle}>Detalhes da indicação</h2>
            <p style={subtitleStyle}>
              {lead.nome || 'Lead sem nome'}
            </p>
          </div>

          <button onClick={onClose} style={closeButtonStyle}>
            ✕
          </button>
        </div>

        <div style={contentStyle}>
          <div style={infoGridStyle}>
            <div>
              <label style={labelStyle}>Telefone</label>
              <div style={infoBoxStyle}>{lead.telefone || lead.phone || '-'}</div>
            </div>

            <div>
              <label style={labelStyle}>Email</label>
              <div style={infoBoxStyle}>{lead.email || '-'}</div>
            </div>

            <div>
              <label style={labelStyle}>Empresa</label>
              <div style={infoBoxStyle}>{lead.empresa || '-'}</div>
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <div style={infoBoxStyle}>{lead.status || '-'}</div>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Motivo da recusa</label>
            <textarea
              value={refusalReason}
              onChange={(e) => setRefusalReason(e.target.value)}
              placeholder="Digite o motivo da recusa"
              style={textareaStyle}
            />
          </div>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Comissão prevista</label>
              <input
                type="number"
                step="0.01"
                value={commissionAmount}
                onChange={(e) => setCommissionAmount(e.target.value)}
                placeholder="Ex: 150.00"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Data prevista de pagamento</label>
              <input
                type="date"
                value={paymentDueDate}
                onChange={(e) => setPaymentDueDate(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Modelo de mensagem selecionado</label>
            <input
              type="text"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              placeholder="Ex: Follow-up 01"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={footerStyle}>
          <button onClick={onClose} style={secondaryButtonStyle}>
            Cancelar
          </button>

          <button onClick={handleSave} style={primaryButtonStyle} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.65)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '24px',
}

const modalStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '820px',
  background: '#111827',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px',
  boxShadow: '0 20px 80px rgba(0,0,0,0.45)',
  overflow: 'hidden',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  padding: '20px 24px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  color: '#fff',
  fontSize: '22px',
  fontWeight: 700,
}

const subtitleStyle: React.CSSProperties = {
  margin: '6px 0 0',
  color: 'rgba(255,255,255,0.7)',
  fontSize: '14px',
}

const closeButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#fff',
  fontSize: '20px',
  cursor: 'pointer',
}

const contentStyle: React.CSSProperties = {
  padding: '24px',
  display: 'grid',
  gap: '18px',
}

const infoGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '14px',
}

const formGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '14px',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '8px',
  color: 'rgba(255,255,255,0.82)',
  fontSize: '13px',
  fontWeight: 600,
}

const infoBoxStyle: React.CSSProperties = {
  minHeight: '44px',
  display: 'flex',
  alignItems: 'center',
  padding: '10px 12px',
  borderRadius: '12px',
  background: '#0f172a',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#fff',
  fontSize: '14px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '44px',
  padding: '0 12px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: '#0f172a',
  color: '#fff',
  fontSize: '14px',
  outline: 'none',
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '110px',
  padding: '12px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: '#0f172a',
  color: '#fff',
  fontSize: '14px',
  outline: 'none',
  resize: 'vertical',
}

const footerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  padding: '20px 24px',
  borderTop: '1px solid rgba(255,255,255,0.08)',
}

const secondaryButtonStyle: React.CSSProperties = {
  height: '44px',
  padding: '0 18px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'transparent',
  color: '#fff',
  cursor: 'pointer',
}

const primaryButtonStyle: React.CSSProperties = {
  height: '44px',
  padding: '0 18px',
  borderRadius: '12px',
  border: 'none',
  background: '#2563eb',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
}