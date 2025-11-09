import { useState, useEffect } from 'react'
import ProspectForm from './components/ProspectForm'
import ProspectList from './components/ProspectList'
import StatusFilter from './components/StatusFilter'
import FieldsManager from './components/FieldsManager'
import AutomationPanel from './components/AutomationPanel'
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

  // Aprovar prospects em lote (vindo da automação)
  const handleApproveProspects = async (prospectsData) => {
    try {
      for (const prospectData of prospectsData) {
        const newProspect = await createProspect(prospectData)
        setProspects(prev => [...prev, newProspect])
      }
      showToast(`${prospectsData.length} prospects adicionados!`, 'success')
    } catch (error) {
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
        </div>
      </header>

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
      </div>

      <AutomationPanel
        isOpen={showAutomation}
        onClose={() => setShowAutomation(false)}
        fields={fields}
        onApproveProspects={handleApproveProspects}
      />

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}

export default App
