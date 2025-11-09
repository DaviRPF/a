import { useState, useEffect } from 'react'
import ProspectForm from './components/ProspectForm'
import ProspectList from './components/ProspectList'
import StatusFilter from './components/StatusFilter'
import Toast from './components/Toast'
import { fetchProspects, createProspect, updateProspect, deleteProspect } from './services/api'
import './styles/App.css'

function App() {
  const [prospects, setProspects] = useState([])
  const [filteredProspects, setFilteredProspects] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  // Carregar prospects ao montar o componente
  useEffect(() => {
    loadProspects()
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

  const showToast = (message, type) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>📋 Organizador de Prospects</h1>
        <p className="subtitle">Gerencie seus prospects de forma profissional</p>
      </header>

      <div className="container">
        <section className="section">
          <h2 className="section-title">Adicionar Novo Prospect</h2>
          <ProspectForm onSubmit={handleAddProspect} />
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
            loading={loading}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDeleteProspect}
          />
        </section>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}

export default App
