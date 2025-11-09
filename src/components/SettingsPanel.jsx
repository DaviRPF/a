import { useState, useEffect } from 'react'
import axios from 'axios'
import '../styles/SettingsPanel.css'

const SettingsPanel = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState({
    geminiModel: 'gemini-2.5-flash'
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const geminiModels = [
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      description: 'Rápido e eficiente - Recomendado para uso geral'
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      description: 'Mais poderoso - Melhor qualidade de resposta'
    },
    {
      id: 'gemini-2.5-flash-lite',
      name: 'Gemini 2.5 Flash Lite',
      description: 'Mais rápido e econômico - Para tarefas simples'
    },
    {
      id: 'gemini-2.5-flash-preview-05-20',
      name: 'Gemini 2.5 Flash Preview',
      description: 'Preview - Melhor raciocínio e qualidade'
    }
  ]

  // Carregar configurações ao abrir
  useEffect(() => {
    if (isOpen) {
      loadSettings()
    }
  }, [isOpen])

  const loadSettings = async () => {
    try {
      const response = await axios.get('/api/settings')
      setSettings(response.data)
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      // Se não existir configuração, usa valores padrão
      setSettings({
        geminiModel: 'gemini-2.5-flash'
      })
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage('')

    try {
      await axios.post('/api/settings', settings)
      setSaveMessage('✓ Configurações salvas com sucesso!')

      setTimeout(() => {
        setSaveMessage('')
        onClose()
      }, 2000)
    } catch (error) {
      setSaveMessage(`✗ Erro ao salvar: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleModelChange = (e) => {
    setSettings({
      ...settings,
      geminiModel: e.target.value
    })
  }

  if (!isOpen) return null

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>⚙️ Configurações</h2>
          <button className="btn-close-settings" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="settings-body">
          {/* Modelo do Gemini */}
          <div className="settings-section">
            <h3>🤖 Modelo de IA (Gemini)</h3>
            <p className="section-description">
              Escolha qual modelo do Google Gemini usar para preenchimento automático e extração de dados.
            </p>

            <div className="model-selector">
              <label htmlFor="gemini-model">Modelo Atual:</label>
              <select
                id="gemini-model"
                value={settings.geminiModel}
                onChange={handleModelChange}
                className="model-select"
              >
                {geminiModels.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>

              {/* Descrição do modelo selecionado */}
              <div className="model-description">
                {geminiModels.find(m => m.id === settings.geminiModel)?.description}
              </div>
            </div>

            {/* Lista de modelos com descrições */}
            <div className="models-info">
              <h4>Modelos Disponíveis:</h4>
              <div className="models-list">
                {geminiModels.map(model => (
                  <div
                    key={model.id}
                    className={`model-card ${settings.geminiModel === model.id ? 'selected' : ''}`}
                  >
                    <div className="model-name">{model.name}</div>
                    <div className="model-desc">{model.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mensagem de salvamento */}
          {saveMessage && (
            <div className={`save-message ${saveMessage.startsWith('✓') ? 'success' : 'error'}`}>
              {saveMessage}
            </div>
          )}

          {/* Botões de ação */}
          <div className="settings-actions">
            <button className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="btn-save"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? '💾 Salvando...' : '💾 Salvar Configurações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
