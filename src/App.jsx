import { useState, useEffect } from 'react'
import ProspectForm from './components/ProspectForm'
import ProspectList from './components/ProspectList'
import StatusFilter from './components/StatusFilter'
import FieldsManager from './components/FieldsManager'
import AutomationPanel from './components/AutomationPanel'
import EnhancementPanel from './components/EnhancementPanel'
import SettingsPanel from './components/SettingsPanel'
import SchedulesPanel from './components/SchedulesPanel'
import Toast from './components/Toast'
import {
  fetchProspects, createProspect, updateProspect, deleteProspect,
  fetchFields, createField, updateField, deleteField
} from './services/api'
import './styles/App.css'

function App() {
  const [prospects, setProspects] = useState([])
  const [filteredProspects, setFilteredProspects] = useState([])
  const [fields, setFields] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [showFieldsManager, setShowFieldsManager] = useState(false)
  const [showAutomation, setShowAutomation] = useState(false)
  const [showEnhancement, setShowEnhancement] = useState(false)
  const [approvedProspects, setApprovedProspects] = useState([])
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState('organizador') // 'organizador', 'pendentes', 'aperfeicoar', 'agendamentos'

  // Carregar prospects e campos ao montar o componente
  useEffect(() => {
    loadProspects()
    loadFields()
  }, [])

  // Filtrar prospects quando o filtro ou lista mudar
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredProspects(prospects)
    } else {
      setFilteredProspects(prospects.filter(p => p.status === statusFilter))
    }
  }, [statusFilter, prospects])

  const loadProspects = async () => {
    try {
      setLoading(true)
      const data = await fetchProspects()
      setProspects(data)
    } catch (error) {
      showToast('Erro ao carregar prospects', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadFields = async () => {
    try {
      const data = await fetchFields()
      setFields(data)
    } catch (error) {
      showToast('Erro ao carregar campos', 'error')
    }
  }

  const handleAddProspect = async (prospectData) => {
    try {
      const newProspect = await createProspect(prospectData)
      setProspects(prev => [...prev, newProspect])
      showToast('Prospect adicionado com sucesso!', 'success')
      return true
    } catch (error) {
      showToast('Erro ao adicionar prospect', 'error')
      return false
    }
  }

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const updatedProspect = await updateProspect(id, { status: newStatus })
      setProspects(prev => prev.map(p => p.id === id ? updatedProspect : p))
      showToast('Status atualizado!', 'success')
    } catch (error) {
      showToast('Erro ao atualizar status', 'error')
    }
  }

  const handleDeleteProspect = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este prospect?')) {
      return
    }

    try {
      await deleteProspect(id)
      setProspects(prev => prev.filter(p => p.id !== id))
      showToast('Prospect removido!', 'success')
    } catch (error) {
      showToast('Erro ao remover prospect', 'error')
    }
  }

  // Funções de gerenciamento de campos
  const handleAddField = async (fieldData) => {
    try {
      const newField = await createField(fieldData)
      setFields(prev => [...prev, newField])
      showToast('Campo adicionado com sucesso!', 'success')
    } catch (error) {
      showToast('Erro ao adicionar campo', 'error')
    }
  }

  const handleUpdateField = async (id, updates) => {
    try {
      const updatedField = await updateField(id, updates)
      setFields(prev => prev.map(f => f.id === id ? updatedField : f))
      showToast('Campo atualizado!', 'success')
    } catch (error) {
      showToast('Erro ao atualizar campo', 'error')
    }
  }

  const handleDeleteField = async (id) => {
    try {
      await deleteField(id)
      setFields(prev => prev.filter(f => f.id !== id))
      showToast('Campo removido!', 'success')
    } catch (error) {
      showToast('Erro ao remover campo', 'error')
    }
  }

  // Aprovar prospects em lote (vindo da automação) - agora abre painel de aperfeiçoamento
  const handleApproveProspects = (prospectsData) => {
    // Fechar painel de automação
    setShowAutomation(false)

    // Guardar prospects aprovados e abrir aba de aperfeiçoamento
    setApprovedProspects(prospectsData)
    setActiveTab('aperfeicoar')
  }

  // Salvar prospects aperfeiçoados
  const handleSaveEnhancedProspects = async (enhancedProspects) => {
    try {
      console.log('💾 Salvando prospects aperfeiçoados:', enhancedProspects)
      for (const prospect of enhancedProspects) {
        console.log('📤 Enviando prospect.data:', prospect.data)
        const newProspect = await createProspect(prospect.data)
        console.log('✅ Prospect salvo:', newProspect)
        setProspects(prev => [...prev, newProspect])
      }
      showToast(`${enhancedProspects.length} prospects adicionados!`, 'success')
      setActiveTab('organizador')
      setApprovedProspects([])
    } catch (error) {
      console.error('❌ Erro ao salvar prospects:', error)
      showToast('Erro ao adicionar prospects', 'error')
    }
  }

  const showToast = (message, type) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>📋 Organizador de Prospects</h1>
        <p className="subtitle">Gerencie seus prospects de forma profissional</p>
        <div className="header-buttons">
          <button
            className="btn-automation"
            onClick={() => setShowAutomation(true)}
          >
            🤖 Geração Automática
          </button>
          <button
            className="btn-config"
            onClick={() => setShowFieldsManager(!showFieldsManager)}
          >
            ⚙️ {showFieldsManager ? 'Ocultar' : 'Gerenciar'} Campos
          </button>
          <button
            className="btn-config"
            onClick={() => setShowSettings(true)}
          >
            🔧 Configurações
          </button>
        </div>
      </header>

      {/* Abas de navegação */}
      <div className="tabs-container">
        <button
          className={`tab ${activeTab === 'organizador' ? 'active' : ''}`}
          onClick={() => setActiveTab('organizador')}
        >
          📋 Organizador
        </button>
        <button
          className={`tab ${activeTab === 'pendentes' ? 'active' : ''}`}
          onClick={() => setActiveTab('pendentes')}
        >
          ⏳ Pendentes
        </button>
        <button
          className={`tab ${activeTab === 'aperfeicoar' ? 'active' : ''}`}
          onClick={() => setActiveTab('aperfeicoar')}
        >
          ✨ Aperfeiçoar
        </button>
        <button
          className={`tab ${activeTab === 'agendamentos' ? 'active' : ''}`}
          onClick={() => setActiveTab('agendamentos')}
        >
          📅 Agendamentos
        </button>
      </div>

      <div className="container">
        {showFieldsManager && (
          <section className="section">
            <FieldsManager
              fields={fields}
              onAddField={handleAddField}
              onUpdateField={handleUpdateField}
              onDeleteField={handleDeleteField}
            />
          </section>
        )}

        {/* Aba Organizador */}
        {activeTab === 'organizador' && (
          <>
            <section className="section">
              <h2 className="section-title">Adicionar Novo Prospect</h2>
              <ProspectForm onSubmit={handleAddProspect} fields={fields} />
            </section>

            <section className="section">
              <div className="section-header">
                <h2 className="section-title">Lista de Prospects</h2>
                <StatusFilter
                  currentFilter={statusFilter}
                  onFilterChange={setStatusFilter}
                />
              </div>

              <ProspectList
                prospects={filteredProspects}
                fields={fields}
                loading={loading}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDeleteProspect}
              />
            </section>
          </>
        )}

        {/* Aba Pendentes */}
        {activeTab === 'pendentes' && (
          <section className="section">
            <h2 className="section-title">⏳ Prospects Pendentes</h2>
            <p className="section-subtitle">Prospects aguardando processamento ou aprovação</p>
            <div className="empty-state" style={{marginTop: '40px'}}>
              <p>Em desenvolvimento</p>
              <small>Esta funcionalidade será implementada em breve</small>
            </div>
          </section>
        )}

        {/* Aba Aperfeiçoar */}
        {activeTab === 'aperfeicoar' && (
          <section className="section">
            {approvedProspects.length > 0 ? (
              <EnhancementPanel
                isOpen={true}
                onClose={() => {
                  setActiveTab('organizador')
                  setApprovedProspects([])
                }}
                prospects={approvedProspects}
                fields={fields}
                onSaveEnhanced={handleSaveEnhancedProspects}
              />
            ) : (
              <>
                <h2 className="section-title">✨ Aperfeiçoar Prospects</h2>
                <p className="section-subtitle">Use a Geração Automática para trazer prospects aqui</p>
                <div className="empty-state" style={{marginTop: '40px'}}>
                  <p>📭 Nenhum prospect para aperfeiçoar</p>
                  <small>Clique em "🤖 Geração Automática" para começar</small>
                </div>
              </>
            )}
          </section>
        )}

        {/* Aba Agendamentos */}
        {activeTab === 'agendamentos' && (
          <SchedulesPanel
            prospects={prospects}
            fields={fields}
          />
        )}
      </div>

      <AutomationPanel
        isOpen={showAutomation}
        onClose={() => setShowAutomation(false)}
        fields={fields}
        onApproveProspects={handleApproveProspects}
      />

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}

export default App
