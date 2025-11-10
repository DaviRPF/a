import { useState } from 'react'
import ProspectCard from './ProspectCard'
import ProspectCallModal from './ProspectCallModal'
import '../styles/ProspectList.css'

const ProspectList = ({ prospects, fields = [], loading, onUpdateStatus, onDelete }) => {
  const [prospectingId, setProspectingId] = useState(null)

  const handleUpdateProspect = (updatedData) => {
    // Atualizar prospect via API
    onUpdateStatus(prospectingId, updatedData.status)
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Carregando prospects...</p>
      </div>
    )
  }

  if (prospects.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📭</div>
        <h3>Nenhum prospect encontrado</h3>
        <p>Adicione um novo prospect usando o formulário acima ou ajuste os filtros.</p>
      </div>
    )
  }

  return (
    <div className="prospect-list">
      <div className="prospect-count">
        <span className="count-badge">{prospects.length}</span>
        <span className="count-text">
          {prospects.length === 1 ? 'prospect encontrado' : 'prospects encontrados'}
        </span>
      </div>

      <div className="prospect-grid">
        {prospects.map(prospect => (
          <ProspectCard
            key={prospect.id}
            prospect={prospect}
            fields={fields}
            onUpdateStatus={onUpdateStatus}
            onDelete={onDelete}
            onProspect={setProspectingId}
          />
        ))}
      </div>

      {/* Modal de Prospecção */}
      <ProspectCallModal
        isOpen={prospectingId !== null}
        onClose={() => setProspectingId(null)}
        prospect={prospectingId !== null ? prospects.find(p => p.id === prospectingId) : null}
        fields={fields}
        onUpdate={handleUpdateProspect}
      />
    </div>
  )
}

export default ProspectList
