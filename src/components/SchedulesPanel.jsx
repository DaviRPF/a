import { useState, useEffect } from 'react'
import axios from 'axios'
import '../styles/SchedulesPanel.css'

const SchedulesPanel = ({ isOpen, onClose, prospects = [], fields = [] }) => {
  const [schedules, setSchedules] = useState({ returns: [], meetings: [] })

  useEffect(() => {
    if (isOpen) {
      loadSchedules()
    }
  }, [isOpen, prospects])

  const loadSchedules = () => {
    // Filtrar prospects que têm agendamentos
    const returns = prospects.filter(p => p.horarioDiaDecisorPresente && p.horarioDiaDecisorPresente.trim())
    const meetings = prospects.filter(p => p.diaHorarioReuniao && p.diaHorarioReuniao.trim())

    setSchedules({ returns, meetings })
  }

  const getFieldValue = (prospect, fieldId) => {
    return prospect[fieldId] || ''
  }

  const getFieldLabel = (fieldId) => {
    const field = fields.find(f => f.id === fieldId)
    return field ? field.label : fieldId
  }

  const getFieldIcon = (fieldId) => {
    const field = fields.find(f => f.id === fieldId)
    return field ? field.icon : ''
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="schedules-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>📅 Agendamentos</h2>
          <button className="btn-close-panel" onClick={onClose}>✕</button>
        </div>

        <div className="panel-body">
          {/* Retornos Agendados */}
          <section className="schedules-section">
            <h3>⏰ Retornos Agendados ({schedules.returns.length})</h3>
            <p className="section-subtitle">
              Prospects em que a atendente informou quando o decisor está presente
            </p>

            {schedules.returns.length === 0 ? (
              <div className="empty-state">
                <p>📭 Nenhum retorno agendado</p>
                <small>Os horários informados pelos atendentes aparecerão aqui</small>
              </div>
            ) : (
              <div className="schedules-list">
                {schedules.returns.map(prospect => (
                  <div key={prospect.id} className="schedule-card return-card">
                    <div className="schedule-header">
                      <h4>{getFieldIcon('nome')} {getFieldValue(prospect, 'nome')}</h4>
                      {prospect.status && (
                        <span className="schedule-status">{prospect.status}</span>
                      )}
                    </div>

                    <div className="schedule-info">
                      <div className="info-item">
                        <span className="info-label">⏰ Horário/Dia:</span>
                        <span className="info-value">{prospect.horarioDiaDecisorPresente}</span>
                      </div>

                      {getFieldValue(prospect, 'telefone') && (
                        <div className="info-item">
                          <span className="info-label">📞 Telefone:</span>
                          <span className="info-value">{getFieldValue(prospect, 'telefone')}</span>
                        </div>
                      )}

                      {getFieldValue(prospect, 'cidade') && (
                        <div className="info-item">
                          <span className="info-label">🏙️ Cidade:</span>
                          <span className="info-value">{getFieldValue(prospect, 'cidade')}</span>
                        </div>
                      )}

                      {getFieldValue(prospect, 'contatoPessoalDecisor') && (
                        <div className="info-item">
                          <span className="info-label">📱 Contato Decisor:</span>
                          <span className="info-value">{getFieldValue(prospect, 'contatoPessoalDecisor')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Reuniões Marcadas */}
          <section className="schedules-section">
            <h3>🤝 Reuniões Marcadas ({schedules.meetings.length})</h3>
            <p className="section-subtitle">
              Prospects que agendaram reunião com você
            </p>

            {schedules.meetings.length === 0 ? (
              <div className="empty-state">
                <p>📭 Nenhuma reunião marcada</p>
                <small>As reuniões agendadas aparecerão aqui</small>
              </div>
            ) : (
              <div className="schedules-list">
                {schedules.meetings.map(prospect => (
                  <div key={prospect.id} className="schedule-card meeting-card">
                    <div className="schedule-header">
                      <h4>{getFieldIcon('nome')} {getFieldValue(prospect, 'nome')}</h4>
                      <span className="schedule-status meeting-status">Reunião marcada</span>
                    </div>

                    <div className="schedule-info">
                      <div className="info-item highlight">
                        <span className="info-label">📅 Data/Horário:</span>
                        <span className="info-value">{prospect.diaHorarioReuniao}</span>
                      </div>

                      {getFieldValue(prospect, 'telefone') && (
                        <div className="info-item">
                          <span className="info-label">📞 Telefone:</span>
                          <span className="info-value">{getFieldValue(prospect, 'telefone')}</span>
                        </div>
                      )}

                      {getFieldValue(prospect, 'contatoPessoalDecisor') && (
                        <div className="info-item">
                          <span className="info-label">📱 Contato Decisor:</span>
                          <span className="info-value">{getFieldValue(prospect, 'contatoPessoalDecisor')}</span>
                        </div>
                      )}

                      {getFieldValue(prospect, 'cidade') && (
                        <div className="info-item">
                          <span className="info-label">🏙️ Cidade:</span>
                          <span className="info-value">{getFieldValue(prospect, 'cidade')}</span>
                        </div>
                      )}

                      {getFieldValue(prospect, 'tipoEstabelecimento') && (
                        <div className="info-item">
                          <span className="info-label">🏢 Tipo:</span>
                          <span className="info-value">{getFieldValue(prospect, 'tipoEstabelecimento')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default SchedulesPanel
