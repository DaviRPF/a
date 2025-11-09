import { useState, useEffect } from 'react'
import AIFillModal from './AIFillModal'
import '../styles/ProspectForm.css'

const ProspectForm = ({ onSubmit, fields = [] }) => {
  const [formData, setFormData] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)

  // Inicializar formData baseado nos campos configurados
  useEffect(() => {
    const initialData = {}
    fields.forEach(field => {
      initialData[field.id] = ''
    })
    setFormData(initialData)
  }, [fields])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    const success = await onSubmit(formData)

    if (success) {
      // Resetar formulário
      const resetData = {}
      fields.forEach(field => {
        resetData[field.id] = ''
      })
      setFormData(resetData)
    }

    setIsSubmitting(false)
  }

  const handleAIFill = (extractedData) => {
    // Preencher formulário com dados extraídos pela IA
    setFormData(prev => ({
      ...prev,
      ...extractedData
    }))
  }

  const renderField = (field) => {
    const commonProps = {
      id: field.id,
      name: field.id,
      value: formData[field.id] || '',
      onChange: handleChange,
      required: field.required
    }

    switch (field.type) {
      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Selecione...</option>
            {field.options?.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows="3"
            placeholder={`Digite ${field.label.toLowerCase()}`}
          />
        )

      default:
        return (
          <input
            {...commonProps}
            type={field.type}
            placeholder={`Digite ${field.label.toLowerCase()}`}
          />
        )
    }
  }

  if (fields.length === 0) {
    return (
      <div className="no-fields-message">
        <p>📝 Nenhum campo configurado. Clique em "Gerenciar Campos" para adicionar campos ao formulário.</p>
      </div>
    )
  }

  return (
    <>
      <div className="form-header-actions">
        <button
          type="button"
          className="btn-ai-fill"
          onClick={() => setShowAIModal(true)}
        >
          🤖 Preencher com IA
        </button>
      </div>

      <form className="prospect-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          {fields.map(field => (
            <div key={field.id} className="form-group">
              <label htmlFor={field.id}>
                {field.icon && <span className="field-icon-label">{field.icon}</span>}
                {field.label}
                {field.required && <span className="required"> *</span>}
              </label>
              {renderField(field)}
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Adicionando...' : '➕ Adicionar Prospect'}
        </button>
      </form>

      <AIFillModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onFillData={handleAIFill}
      />
    </>
  )
}

export default ProspectForm
