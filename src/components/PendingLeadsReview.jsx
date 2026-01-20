import { useState } from 'react'
import '../styles/PendingLeadsReview.css'

function PendingLeadsReview({
  pendingLeads,
  fields,
  onApprove,
  onReject,
  onApproveAll,
  loading
}) {
  const [expandedLead, setExpandedLead] = useState(null)

  if (!pendingLeads || pendingLeads.length === 0) {
    return (
      <div className="pending-leads-empty">
        <div className="empty-icon">📭</div>
        <p>Nenhum lead pendente de revisao</p>
        <small>Cole suas anotacoes acima para gerar leads</small>
      </div>
    )
  }

  const getStatusColor = (status) => {
    const colors = {
      'Nao contatado ainda': '#6b7280',
      'Contato com atendente': '#3b82f6',
      'Contato com decisor': '#8b5cf6',
      'Objecao do atendente': '#f59e0b',
      'Objecao do decisor': '#ef4444',
      'Reuniao marcada': '#10b981',
      'Continuidade do whatsapp': '#06b6d4'
    }
    return colors[status] || '#6b7280'
  }

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.9) return { text: 'Alta', color: '#10b981' }
    if (confidence >= 0.7) return { text: 'Media', color: '#f59e0b' }
    return { text: 'Baixa', color: '#ef4444' }
  }

  const toggleExpand = (index) => {
    setExpandedLead(expandedLead === index ? null : index)
  }

  return (
    <div className="pending-leads-review">
      <div className="pending-leads-header">
        <div className="pending-count">
          <span className="count-number">{pendingLeads.length}</span>
          <span className="count-label">leads para revisar</span>
        </div>
        <button
          className="btn-approve-all"
          onClick={onApproveAll}
          disabled={loading}
        >
          Aprovar Todos
        </button>
      </div>

      <div className="pending-leads-list">
        {pendingLeads.map((lead, index) => {
          const confidence = getConfidenceLabel(lead.confidence || 0.5)
          const isExpanded = expandedLead === index

          return (
            <div
              key={index}
              className={`pending-lead-card ${lead.isDuplicate ? 'is-update' : 'is-new'} ${isExpanded ? 'expanded' : ''}`}
            >
              <div className="lead-card-header" onClick={() => toggleExpand(index)}>
                <div className="lead-main-info">
                  <span className={`lead-badge ${lead.isDuplicate ? 'update' : 'new'}`}>
                    {lead.isDuplicate ? 'ATUALIZAR' : 'NOVO'}
                  </span>
                  <h4 className="lead-name">{lead.data?.nome || 'Sem nome'}</h4>
                </div>

                <div className="lead-meta">
                  <span
                    className="lead-status"
                    style={{ backgroundColor: getStatusColor(lead.data?.status) }}
                  >
                    {lead.data?.status || 'Sem status'}
                  </span>
                  <span
                    className="lead-confidence"
                    style={{ color: confidence.color }}
                  >
                    {confidence.text}
                  </span>
                  <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                </div>
              </div>

              {lead.notes && (
                <p className="lead-notes">{lead.notes}</p>
              )}

              {isExpanded && (
                <div className="lead-details">
                  <h5>Dados extraidos:</h5>
                  <div className="lead-fields">
                    {fields.map(field => {
                      const value = lead.data?.[field.id]
                      if (!value) return null

                      const isChanged = lead.changes?.includes(field.id)

                      return (
                        <div key={field.id} className={`lead-field ${isChanged ? 'changed' : ''}`}>
                          <span className="field-icon">{field.icon}</span>
                          <span className="field-label">{field.label}:</span>
                          <span className="field-value">{value}</span>
                          {isChanged && <span className="changed-badge">Alterado</span>}
                        </div>
                      )
                    })}
                  </div>

                  {lead.isDuplicate && lead.existingId && (
                    <div className="duplicate-info">
                      <span className="duplicate-icon">🔄</span>
                      <span>Este lead sera mesclado com um prospect existente</span>
                    </div>
                  )}
                </div>
              )}

              <div className="lead-actions">
                <button
                  className="btn-reject"
                  onClick={() => onReject(index)}
                  disabled={loading}
                >
                  Rejeitar
                </button>
                <button
                  className="btn-approve"
                  onClick={() => onApprove(index)}
                  disabled={loading}
                >
                  {lead.isDuplicate ? 'Atualizar' : 'Criar Lead'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PendingLeadsReview
