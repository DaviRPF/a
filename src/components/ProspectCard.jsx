import { useState } from 'react'
import '../styles/ProspectCard.css'

const STATUS_OPTIONS = [
  'Não contatado ainda',
  'Contato com atendente',
  'Contato com decisor',
  'Continuidade do whatsapp',
  'Reunião marcada',
  'Objeção da atendente',
  'Objeção do decisor'
]

const STATUS_COLORS = {
  'Não contatado ainda': '#6c757d',
  'Contato com atendente': '#ffc107',
  'Contato com decisor': '#17a2b8',
  'Continuidade do whatsapp': '#28a745',
  'Reunião marcada': '#20c997',
  'Objeção da atendente': '#dc3545',
  'Objeção do decisor': '#e74c3c'
}

const ProspectCard = ({ prospect, fields = [], onUpdateStatus, onDelete, onProspect }) => {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (e) => {
    setIsUpdating(true)
    await onUpdateStatus(prospect.id, e.target.value)
    setIsUpdating(false)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Pegar o primeiro campo como título (geralmente "nome")
  const titleField = fields[0]
  const titleValue = titleField ? prospect[titleField.id] : 'Prospect'

  return (
    <div className="prospect-card">
      <div className="prospect-header">
        <div>
          <h3 className="prospect-name">{titleValue}</h3>
          <span className="prospect-date">
            📅 Criado em {formatDate(prospect.criadoEm)}
          </span>
        </div>
        <button
          className="btn-delete"
          onClick={() => onDelete(prospect.id)}
          title="Remover prospect"
        >
          🗑️
        </button>
      </div>

      <div className="prospect-info">
        {fields.map((field) => {
          const value = prospect[field.id]

          // Não mostrar o primeiro campo novamente (já está no título)
          if (field === titleField) return null

          // Não mostrar campos vazios
          if (!value) return null

          return (
            <div key={field.id} className="info-item">
              <span className="info-icon">{field.icon || '📝'}</span>
              <div>
                <span className="info-label">{field.label}</span>
                <span className="info-value">{value}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="prospect-status">
        <label className="status-label">
          <span className="status-icon">🎯</span>
          Status do Contato
        </label>
        <select
          className="status-select"
          value={prospect.status}
          onChange={handleStatusChange}
          disabled={isUpdating}
          style={{ borderColor: STATUS_COLORS[prospect.status] }}
        >
          {STATUS_OPTIONS.map(status => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {/* Botão de Prospecção */}
      {onProspect && (
        <button
          className="btn-prospect-card"
          onClick={() => onProspect(prospect.id)}
        >
          📞 Iniciar Prospecção
        </button>
      )}
    </div>
  )
}

export default ProspectCard
