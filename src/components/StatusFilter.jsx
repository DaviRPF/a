import '../styles/StatusFilter.css'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'Não contatado ainda', label: 'Não contatado ainda' },
  { value: 'Contato com atendente', label: 'Contato com atendente' },
  { value: 'Contato com decisor', label: 'Contato com decisor' },
  { value: 'Continuidade do whatsapp', label: 'Continuidade do whatsapp' },
  { value: 'Reunião marcada', label: 'Reunião marcada' },
  { value: 'Objeção da atendente', label: 'Objeção da atendente' },
  { value: 'Objeção do decisor', label: 'Objeção do decisor' }
]

const StatusFilter = ({ currentFilter, onFilterChange }) => {
  return (
    <div className="status-filter">
      <label htmlFor="statusFilter">
        🔍 Filtrar por Status:
      </label>
      <select
        id="statusFilter"
        className="filter-select"
        value={currentFilter}
        onChange={(e) => onFilterChange(e.target.value)}
      >
        {STATUS_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default StatusFilter
