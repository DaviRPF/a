import { useState, useEffect } from 'react'
import axios from 'axios'
import '../styles/AutomationPanel.css'

const AutomationPanel = ({ isOpen, onClose, fields, onApproveProspects }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isCheckingLogin, setIsCheckingLogin] = useState(false)
  const [businessTypes, setBusinessTypes] = useState([])
  const [businessType, setBusinessType] = useState('')
  const [customBusinessType, setCustomBusinessType] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [city, setCity] = useState('')
  const [limit, setLimit] = useState(10)
  const [isSearching, setIsSearching] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [statusMessage, setStatusMessage] = useState('')
  const [foundProspects, setFoundProspects] = useState([])
  const [eventSource, setEventSource] = useState(null)

  // Verificar status de login e carregar tipos ao abrir
  useEffect(() => {
    if (isOpen) {
      checkLoginStatus()
      loadBusinessTypes()
      loadPendingProspects()
    }

    return () => {
      if (eventSource) {
        eventSource.close()
      }
      // Salvar prospects pendentes ao fechar
      savePendingProspects()
    }
  }, [isOpen])

  const checkLoginStatus = async () => {
    try {
      setIsCheckingLogin(true)
      setStatusMessage('Verificando login no Instagram...')

      const response = await axios.get('/api/automation/status')
      setIsLoggedIn(response.data.loggedIn)

      if (response.data.loggedIn) {
        setStatusMessage('✅ Você está logado no Instagram!')
        setTimeout(() => setStatusMessage(''), 3000)
      } else {
        setStatusMessage('')
      }
    } catch (error) {
      console.error('Erro ao verificar login:', error)
      setStatusMessage('')
    } finally {
      setIsCheckingLogin(false)
    }
  }

  const loadBusinessTypes = async () => {
    try {
      const response = await axios.get('/api/business-types')
      setBusinessTypes(response.data)
    } catch (error) {
      console.error('Erro ao carregar tipos:', error)
    }
  }

  const loadPendingProspects = async () => {
    try {
      const response = await axios.get('/api/pending-prospects')
      if (response.data && response.data.length > 0) {
        setFoundProspects(response.data)
        setStatusMessage(`${response.data.length} prospects pendentes carregados`)
        setTimeout(() => setStatusMessage(''), 3000)
      }
    } catch (error) {
      console.error('Erro ao carregar prospects pendentes:', error)
    }
  }

  const savePendingProspects = async () => {
    try {
      // Salvar apenas prospects que não foram aprovados nem recusados
      const pendingProspects = foundProspects.filter(p => !p.approved && !p.rejected)
      if (pendingProspects.length > 0) {
        await axios.post('/api/pending-prospects', { prospects: pendingProspects })
        console.log(`${pendingProspects.length} prospects pendentes salvos`)
      }
    } catch (error) {
      console.error('Erro ao salvar prospects pendentes:', error)
    }
  }

  const handleBusinessTypeChange = (e) => {
    const value = e.target.value
    if (value === '__custom__') {
      setShowCustomInput(true)
      setBusinessType('')
    } else {
      setShowCustomInput(false)
      setBusinessType(value)
      setCustomBusinessType('')
    }
  }

  const createNewBusinessType = async (type) => {
    try {
      const response = await axios.post('/api/business-types', { type })
      setBusinessTypes(response.data.allTypes)
      return true
    } catch (error) {
      console.error('Erro ao criar tipo:', error)
      return false
    }
  }

  const handleLogin = async () => {
    try {
      setStatusMessage('Abrindo navegador para login...')
      const response = await axios.post('/api/automation/login')

      if (response.data.success) {
        setStatusMessage(response.data.message)
      }
    } catch (error) {
      setStatusMessage(`Erro: ${error.message}`)
    }
  }

  const handleSaveSession = async () => {
    try {
      setStatusMessage('Salvando sessão...')
      const response = await axios.post('/api/automation/save-session')

      if (response.data.success) {
        setStatusMessage(response.data.message)
        setIsLoggedIn(true)
        // Limpar mensagem após 3 segundos
        setTimeout(() => {
          setStatusMessage('')
        }, 3000)
      } else {
        setStatusMessage(response.data.message)
      }
    } catch (error) {
      setStatusMessage(`Erro: ${error.message}`)
    }
  }

  const handleSearch = async () => {
    // Determinar qual tipo usar
    const typeToUse = showCustomInput ? customBusinessType : businessType

    if (!typeToUse || !city) {
      alert('Preencha o tipo de estabelecimento e a cidade')
      return
    }

    // Se for customizado, verificar se existe
    if (showCustomInput) {
      const typeExists = businessTypes.some(
        t => t.toLowerCase() === customBusinessType.toLowerCase()
      )

      if (!typeExists) {
        const confirmed = window.confirm(
          `O tipo "${customBusinessType}" não existe ainda.\n\nDeseja criar este novo tipo de estabelecimento?`
        )

        if (!confirmed) {
          return
        }

        // Criar novo tipo
        const created = await createNewBusinessType(customBusinessType)
        if (!created) {
          alert('Erro ao criar novo tipo de estabelecimento')
          return
        }

        setStatusMessage(`Tipo "${customBusinessType}" criado com sucesso!`)
        setTimeout(() => setStatusMessage(''), 2000)
      }
    }

    setIsSearching(true)
    setFoundProspects([])
    setProgress({ current: 0, total: 0 })
    setStatusMessage('Iniciando busca...')

    // Conectar ao SSE
    const es = new EventSource(
      `/api/automation/search?businessType=${encodeURIComponent(typeToUse)}&city=${encodeURIComponent(city)}&limit=${limit}`
    )

    setEventSource(es)

    es.onmessage = (event) => {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'status':
          setStatusMessage(data.message)
          break

        case 'progress':
          setProgress({ current: data.current, total: data.total })
          setStatusMessage(data.message)
          break

        case 'prospect_found':
          setFoundProspects(prev => [...prev, data.prospect])
          break

        case 'error':
          setStatusMessage(`Erro: ${data.message}`)
          break

        case 'complete':
          setStatusMessage(data.message)
          setIsSearching(false)
          es.close()
          break
      }
    }

    es.onerror = () => {
      setStatusMessage('Erro na conexão')
      setIsSearching(false)
      es.close()
    }
  }

  const handleToggleApprove = (id) => {
    setFoundProspects(prev =>
      prev.map(p =>
        p.id === id ? { ...p, approved: !p.approved, rejected: false } : p
      )
    )
  }

  const handleToggleReject = (id) => {
    setFoundProspects(prev =>
      prev.map(p =>
        p.id === id ? { ...p, rejected: !p.rejected, approved: false } : p
      )
    )
  }

  const handleFinalize = async () => {
    const approvedProspects = foundProspects.filter(p => p.approved)

    // Salvar prospects pendentes (não aprovados nem recusados) antes
    await savePendingProspects()

    if (approvedProspects.length === 0) {
      // Se não tem aprovados, só salva pendentes e mostra mensagem
      setStatusMessage('Nenhum prospect aprovado. Pendentes salvos.')
      setTimeout(() => setStatusMessage(''), 3000)
      return
    }

    // Enviar prospects aprovados para aperfeiçoamento (objeto completo com id, data, etc)
    onApproveProspects(approvedProspects)

    // Remover apenas os aprovados e recusados da lista
    const remainingProspects = foundProspects.filter(p => !p.approved && !p.rejected)
    setFoundProspects(remainingProspects)

    // Se não sobrou nenhum, limpar tudo
    if (remainingProspects.length === 0) {
      setBusinessType('')
      setCity('')
      setStatusMessage('')
    } else {
      setStatusMessage(`${remainingProspects.length} prospects pendentes salvos`)
      setTimeout(() => setStatusMessage(''), 3000)
    }
  }

  const handleClearRejected = () => {
    const nonRejected = foundProspects.filter(p => !p.rejected)
    setFoundProspects(nonRejected)
    setStatusMessage('Prospects recusados removidos')
    setTimeout(() => setStatusMessage(''), 2000)
  }

  const handleCloseBrowser = async () => {
    try {
      await axios.post('/api/automation/close')
      setStatusMessage('Navegador fechado')
    } catch (error) {
      console.error('Erro ao fechar navegador:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="automation-overlay">
      <div className="automation-panel">
        <div className="automation-header">
          <h2>🤖 Geração Automática de Prospects</h2>
          <button className="btn-close-automation" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="automation-body">
          {/* Status de Login */}
          <div className="login-section">
            <div className="login-status">
              <span className={`status-indicator ${isCheckingLogin ? 'checking' : isLoggedIn ? 'logged-in' : 'logged-out'}`}>
                {isCheckingLogin ? '🔄' : isLoggedIn ? '🟢' : '🔴'}
              </span>
              <span>
                {isCheckingLogin ? 'Verificando...' : isLoggedIn ? 'Instagram conectado' : 'Instagram desconectado'}
              </span>
            </div>
            <div className="login-buttons">
              {!isLoggedIn && !isCheckingLogin && (
                <button className="btn-login" onClick={handleLogin}>
                  🔓 Fazer Login no Instagram
                </button>
              )}
              {!isLoggedIn && !isCheckingLogin && (
                <button className="btn-save-session" onClick={handleSaveSession}>
                  💾 Salvar Sessão
                </button>
              )}
              <button className="btn-close-browser" onClick={handleCloseBrowser} disabled={isCheckingLogin}>
                🚫 Fechar Navegador
              </button>
            </div>
          </div>

          {/* Formulário de Busca */}
          <div className="search-section">
            <h3>Buscar Prospects</h3>
            <div className="search-form">
              <div className="form-group">
                <label>Tipo de Estabelecimento</label>
                <select
                  value={showCustomInput ? '__custom__' : businessType}
                  onChange={handleBusinessTypeChange}
                  disabled={isSearching}
                  className="business-type-select"
                >
                  <option value="">Selecione um tipo...</option>
                  {businessTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                  <option value="__custom__">✏️ Outro...</option>
                </select>
              </div>

              {showCustomInput && (
                <div className="form-group">
                  <label>Digite o novo tipo</label>
                  <input
                    type="text"
                    value={customBusinessType}
                    onChange={(e) => setCustomBusinessType(e.target.value)}
                    placeholder="Ex: Pastelaria, Açaiteria..."
                    disabled={isSearching}
                    autoFocus
                  />
                </div>
              )}
              <div className="form-group">
                <label>Cidade</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: São Paulo, Rio de Janeiro"
                  disabled={isSearching}
                />
              </div>
              <div className="form-group">
                <label>Quantidade de estabelecimentos</label>
                <input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  placeholder="Ex: 10"
                  min="1"
                  max="50"
                  disabled={isSearching}
                />
                <small style={{ color: '#666', fontSize: '12px' }}>Máximo: 50 estabelecimentos</small>
              </div>
              <button
                className="btn-search"
                onClick={handleSearch}
                disabled={isSearching || !isLoggedIn}
              >
                {isSearching ? '⏳ Buscando...' : '🔍 Buscar no Instagram'}
              </button>
            </div>
          </div>

          {/* Progresso */}
          {isSearching && progress.total > 0 && (
            <div className="progress-section">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p className="progress-text">
                {progress.current} de {progress.total} perfis processados
              </p>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && (
            <div className="status-message">
              {statusMessage}
            </div>
          )}

          {/* Lista de Prospects Encontrados */}
          {foundProspects.length > 0 && (
            <div className="prospects-section">
              <div className="prospects-header">
                <h3>Prospects Encontrados ({foundProspects.length})</h3>
                <div className="prospects-actions">
                  {!isSearching && (
                    <button className="btn-finalize" onClick={handleFinalize}>
                      ✨ Finalizar ({foundProspects.filter(p => p.approved).length} aprovados)
                    </button>
                  )}
                  {foundProspects.filter(p => p.rejected).length > 0 && (
                    <button className="btn-clear-rejected" onClick={handleClearRejected}>
                      🗑️ Limpar Recusados ({foundProspects.filter(p => p.rejected).length})
                    </button>
                  )}
                </div>
              </div>

              <div className="prospects-list">
                {foundProspects.map(prospect => {
                  const firstField = fields[0]
                  const title = firstField ? prospect.data[firstField.id] : 'Prospect'

                  return (
                    <div
                      key={prospect.id}
                      className={`prospect-preview ${prospect.approved ? 'approved' : ''} ${prospect.rejected ? 'rejected' : ''}`}
                    >
                      <div className="prospect-preview-header">
                        <h4>{title}</h4>
                        <div className="prospect-actions">
                          <button
                            className={`btn-toggle-approve ${prospect.approved ? 'approved' : ''}`}
                            onClick={() => handleToggleApprove(prospect.id)}
                          >
                            {prospect.approved ? '✓ Aprovado' : '○ Aprovar'}
                          </button>
                          <button
                            className={`btn-toggle-reject ${prospect.rejected ? 'rejected' : ''}`}
                            onClick={() => handleToggleReject(prospect.id)}
                          >
                            {prospect.rejected ? '✕ Recusado' : '○ Recusar'}
                          </button>
                        </div>
                      </div>

                      <div className="prospect-preview-data">
                        {fields.slice(0, 4).map(field => (
                          prospect.data[field.id] && (
                            <div key={field.id} className="preview-field">
                              <span className="field-label">{field.icon} {field.label}:</span>
                              {field.id === 'instagram' ? (
                                <a
                                  href={`https://www.instagram.com/${prospect.data[field.id].replace('@', '')}/`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="field-value instagram-link"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {prospect.data[field.id]}
                                </a>
                              ) : (
                                <span className="field-value">{prospect.data[field.id]}</span>
                              )}
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AutomationPanel
