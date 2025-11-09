import { useState } from 'react'
import '../styles/FieldsManager.css'

const FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'tel', label: 'Telefone' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Número' },
  { value: 'select', label: 'Seleção' },
  { value: 'textarea', label: 'Texto Longo' }
]

const ICON_OPTIONS = ['📝', '📞', '📱', '📧', '🌐', '🏪', '👤', '💼', '📍', '⏰', '💰', '🎯', '👥', '📊', '✨', '🚀']

const FieldsManager = ({ fields, onAddField, onUpdateField, onDeleteField }) => {
  const [showForm, setShowForm] = useState(false)
  const [editingField, setEditingField] = useState(null)
  const [formData, setFormData] = useState({
    id: '',
    label: '',
    type: 'text',
    required: false,
    icon: '📝',
    options: ''
  })

  const resetForm = () => {
    setFormData({
      id: '',
      label: '',
      type: 'text',
      required: false,
      icon: '📝',
      options: ''
    })
    setEditingField(null)
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const fieldData = {
      id: formData.id || formData.label.toLowerCase().replace(/\s+/g, '_'),
      label: formData.label,
      type: formData.type,
      required: formData.required,
      icon: formData.icon,
      options: formData.type === 'select' ? formData.options.split(',').map(o => o.trim()) : []
    }

    if (editingField) {
      await onUpdateField(editingField.id, fieldData)
    } else {
      await onAddField(fieldData)
    }

    resetForm()
  }

  const handleEdit = (field) => {
    setFormData({
      id: field.id,
      label: field.label,
      type: field.type,
      required: field.required,
      icon: field.icon,
      options: field.options ? field.options.join(', ') : ''
    })
    setEditingField(field)
    setShowForm(true)
  }

  const handleDelete = async (fieldId) => {
    if (window.confirm('Tem certeza que deseja remover este campo? Os dados dos prospects serão mantidos.')) {
      await onDeleteField(fieldId)
    }
  }

  return (
    <div className="fields-manager">
      <div className="manager-header">
        <h3>⚙️ Gerenciar Campos</h3>
        <button
          className="btn-add-field"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Cancelar' : '➕ Adicionar Campo'}
        </button>
      </div>

      {showForm && (
        <form className="field-form" onSubmit={handleSubmit}>
          <div className="field-form-grid">
            <div className="form-group">
              <label>Nome do Campo *</label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                required
                placeholder="Ex: WhatsApp"
              />
            </div>

            <div className="form-group">
              <label>Tipo de Campo *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
              >
                {FIELD_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Ícone</label>
              <select
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              >
                {ICON_OPTIONS.map(icon => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.required}
                  onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                />
                Campo Obrigatório
              </label>
            </div>

            {formData.type === 'select' && (
              <div className="form-group full-width">
                <label>Opções (separadas por vírgula) *</label>
                <input
                  type="text"
                  value={formData.options}
                  onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                  required
                  placeholder="Ex: Sim, Não"
                />
              </div>
            )}
          </div>

          <button type="submit" className="btn-submit-field">
            {editingField ? '💾 Atualizar Campo' : '➕ Adicionar Campo'}
          </button>
        </form>
      )}

      <div className="fields-list">
        {fields.map(field => (
          <div key={field.id} className="field-item">
            <div className="field-info">
              <span className="field-icon">{field.icon}</span>
              <div className="field-details">
                <span className="field-label">{field.label}</span>
                <span className="field-meta">
                  {field.type} {field.required && '• Obrigatório'}
                  {field.options && field.options.length > 0 && ` • ${field.options.length} opções`}
                </span>
              </div>
            </div>
            <div className="field-actions">
              <button
                className="btn-edit"
                onClick={() => handleEdit(field)}
                title="Editar campo"
              >
                ✏️
              </button>
              <button
                className="btn-delete-field"
                onClick={() => handleDelete(field.id)}
                title="Remover campo"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default FieldsManager
