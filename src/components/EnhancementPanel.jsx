import { useState } from 'react'
import axios from 'axios'
import '../styles/EnhancementPanel.css'

const EnhancementPanel = ({ isOpen, onClose, prospects, fields, onSaveEnhanced }) => {
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [statusMessage, setStatusMessage] = useState('')
  const [enhancedProspects, setEnhancedProspects] = useState(prospects)
  const [eventSource, setEventSource] = useState(null)

  const handleEnhance = async () => {
    setIsEnhancing(true)
    setProgress({ current: 0, total: prospects.length })
    setStatusMessage('Iniciando aperfeiçoamento...')

    // Adicionar tempId aos prospects para rastreamento
    const prospectsWithIds = prospects.map((p, idx) => ({ ...p, tempId: idx }))
    setEnhancedProspects(prospectsWithIds)

    // Conectar ao SSE antes de fazer o POST
    const es = new EventSource('/api/automation/enhance-progress')
    setEventSource(es)

    es.onmessage = (event) => {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'progress':
          setProgress({ current: data.current, total: data.total })
          setStatusMessage(data.message)
          break

        case 'prospect_enhanced':
          // Atualizar prospect com dados aperfeiçoados
          setEnhancedProspects(prev =>
            prev.map(p =>
              p.tempId === data.tempId
                ? { ...p, data: { ...p.data, ...data.enhancement } }
                : p
            )
          )
          break

        case 'complete':
          setStatusMessage('✅ Aperfeiçoamento concluído!')
          setIsEnhancing(false)
          es.close()
          break

        case 'error':
          setStatusMessage(`❌ Erro: ${data.message}`)
          setIsEnhancing(false)
          es.close()
          break
      }
    }

    es.onerror = () => {
      setStatusMessage('❌ Erro na conexão')
      setIsEnhancing(false)
      es.close()
    }

    // Iniciar aperfeiçoamento
    try {
      await axios.post('/api/automation/enhance', { prospects: prospectsWithIds })
    } catch (error) {
      setStatusMessage(`❌ Erro: ${error.message}`)
      setIsEnhancing(false)
      es.close()
    }
  }

  const handleSave = () => {
    onSaveEnhanced(enhancedProspects)
    if (eventSource) {
      eventSource.close()
    }
    onClose()
  }

  const handleCancel = () => {
    if (eventSource) {
      eventSource.close()
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="enhancement-overlay" onClick={handleCancel}>
      <div className="enhancement-panel" onClick={(e) => e.stopPropagation()}>
        <div className="enhancement-header">
          <h2>✨ Aperfeiçoamento de Prospects</h2>
          <button className="btn-close-enhancement" onClick={handleCancel}>
            ✕
          </button>
        </div>

        <div className="enhancement-body">
          <div className="enhancement-info">
            <p>
              <strong>{prospects.length} prospects aprovados</strong> prontos para aperfeiçoamento.
            </p>
            <p>
              O sistema irá buscar automaticamente:
            </p>
            <ul>
              <li>💰 Capital Social</li>
              <li>📊 Enquadramento de Porte (MEI, ME, EPP, etc)</li>
              <li>👥 Administradores e Sócios</li>
              <li>📍 Página no Google Meu Negócio</li>
            </ul>
            <p className="enhancement-note">
              <strong>Fontes:</strong> Econodata → CNPJBiz (fallback) → Google Meu Negócio
            </p>
          </div>

          {/* Progresso */}
          {isEnhancing && progress.total > 0 && (
            <div className="progress-section">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p className="progress-text">
                {progress.current} de {progress.total} prospects aperfeiçoados
              </p>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && (
            <div className="status-message">
              {statusMessage}
            </div>
          )}

          {/* Lista de Prospects */}
          <div className="prospects-section">
            <h3>Prospects Aprovados ({enhancedProspects.length})</h3>
            <div className="prospects-list">
              {enhancedProspects.map((prospect, idx) => {
                const firstField = fields[0]
                const title = firstField ? prospect.data[firstField.id] : 'Prospect'

                return (
                  <div key={idx} className="prospect-preview">
                    <div className="prospect-preview-header">
                      <h4>{title}</h4>
                      {prospect.data.cnpj && (
                        <span className="cnpj-badge">CNPJ: {prospect.data.cnpj}</span>
                      )}
                    </div>

                    <div className="prospect-preview-data">
                      {fields.slice(0, 6).map(field => (
                        prospect.data[field.id] && (
                          <div key={field.id} className="preview-field">
                            <span className="field-label">{field.icon} {field.label}:</span>
                            <span className="field-value">{prospect.data[field.id]}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Botões */}
          <div className="enhancement-actions">
            <button
              className="btn-enhance"
              onClick={handleEnhance}
              disabled={isEnhancing}
            >
              {isEnhancing ? '⏳ Aperfeiçoando...' : '✨ Iniciar Aperfeiçoamento'}
            </button>
            <button
              className="btn-save-enhanced"
              onClick={handleSave}
              disabled={isEnhancing}
            >
              💾 Salvar Prospects
            </button>
            <button
              className="btn-cancel"
              onClick={handleCancel}
              disabled={isEnhancing}
            >
              ❌ Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EnhancementPanel
