import { useState, useEffect } from 'react'
import ProspectForm from './components/ProspectForm'
import ProspectList from './components/ProspectList'
import StatusFilter from './components/StatusFilter'
import FieldsManager from './components/FieldsManager'
import SettingsPanel from './components/SettingsPanel'
import SchedulesPanel from './components/SchedulesPanel'
import NotesProcessor from './components/NotesProcessor'
import PendingLeadsReview from './components/PendingLeadsReview'
import Toast from './components/Toast'
import {
  fetchProspects, createProspect, updateProspect, deleteProspect,
  fetchFields, createField, updateField, deleteField,
  processNotesWithAI, fetchPendingLeads, approvePendingLead,
  rejectPendingLead, approveAllPendingLeads
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
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState('organizador') // 'organizador', 'pendentes', 'agendamentos'
  const [pendingLeads, setPendingLeads] = useState([])
  const [processingNotes, setProcessingNotes] = useState(false)
  const [pendingLoading, setPendingLoading] = useState(false)

  // Carregar prospects, campos e leads pendentes ao montar o componente
  useEffect(() => {
    loadProspects()
    loadFields()
    loadPendingLeads()
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

  const loadPendingLeads = async () => {
    try {
      const data = await fetchPendingLeads()
      setPendingLeads(data)
    } catch (error) {
      console.error('Erro ao carregar leads pendentes:', error)
    }
  }

  // Processar anotacoes com IA
  const handleProcessNotes = async (notes) => {
    try {
      setProcessingNotes(true)
      const result = await processNotesWithAI(notes)

      if (result.success) {
        await loadPendingLeads()
        showToast(`${result.summary?.total || 0} leads processados!`, 'success')
        setActiveTab('pendentes')
      } else {
        showToast('Erro ao processar anotacoes', 'error')
      }
    } catch (error) {
      console.error('Erro ao processar anotacoes:', error)
      showToast('Erro ao processar anotacoes com IA', 'error')
    } finally {
      setProcessingNotes(false)
    }
  }

  // Aprovar lead pendente
  const handleApproveLead = async (index) => {
    try {
      setPendingLoading(true)
      const result = await approvePendingLead(index)

      if (result.success) {
        await loadPendingLeads()
        await loadProspects()
        showToast(
          result.wasUpdate ? 'Lead atualizado!' : 'Lead criado!',
          'success'
        )
      }
    } catch (error) {
      console.error('Erro ao aprovar lead:', error)
      showToast('Erro ao aprovar lead', 'error')
    } finally {
      setPendingLoading(false)
    }
  }

  // Rejeitar lead pendente
  const handleRejectLead = async (index) => {
    try {
      setPendingLoading(true)
      await rejectPendingLead(index)
      await loadPendingLeads()
      showToast('Lead rejeitado', 'info')
    } catch (error) {
      console.error('Erro ao rejeitar lead:', error)
      showToast('Erro ao rejeitar lead', 'error')
    } finally {
      setPendingLoading(false)
    }
  }

  // Aprovar todos os leads pendentes
  const handleApproveAllLeads = async () => {
    if (!window.confirm(`Aprovar todos os ${pendingLeads.length} leads pendentes?`)) {
      return
    }

    try {
      setPendingLoading(true)
      const result = await approveAllPendingLeads()

      if (result.success) {
        await loadPendingLeads()
        await loadProspects()
        showToast(
          `${result.created} criados, ${result.updated} atualizados!`,
          'success'
        )
      }
    } catch (error) {
      console.error('Erro ao aprovar todos:', error)
      showToast('Erro ao aprovar todos os leads', 'error')
    } finally {
      setPendingLoading(false)
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
          Pendentes
          {pendingLeads.length > 0 && (
            <span className="tab-badge">{pendingLeads.length}</span>
          )}
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
            <h2 className="section-title">Processar Anotacoes</h2>
            <p className="section-subtitle">Cole suas anotacoes de prospecao e deixe a IA organizar para voce</p>

            <NotesProcessor
              onProcessNotes={handleProcessNotes}
              loading={processingNotes}
            />

            <div className="pending-divider">
              <span>Leads para Revisao</span>
            </div>

            <PendingLeadsReview
              pendingLeads={pendingLeads}
              fields={fields}
              onApprove={handleApproveLead}
              onReject={handleRejectLead}
              onApproveAll={handleApproveAllLeads}
              loading={pendingLoading}
            />
          </section>
        )}

        {/* Aba Agendamentos */}
        {activeTab === 'agendamentos' && (
          <SchedulesPanel
            prospects={prospects}
            fields={fields}
            onProspectUpdate={(updatedProspect) => {
              setProspects(prev => prev.map(p => p.id === updatedProspect.id ? updatedProspect : p))
            }}
          />
        )}
      </div>

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}

export default App
