import { useState } from 'react'
import '../styles/ProspectForm.css'

const ProspectForm = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    instagram: '',
    googleMeuNegocio: '',
    presencaRedeSocial: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

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
      setFormData({
        nome: '',
        telefone: '',
        instagram: '',
        googleMeuNegocio: '',
        presencaRedeSocial: ''
      })
    }

    setIsSubmitting(false)
  }

  return (
    <form className="prospect-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="nome">
            Nome do Estabelecimento <span className="required">*</span>
          </label>
          <input
            type="text"
            id="nome"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            required
            placeholder="Ex: Restaurante do João"
          />
        </div>

        <div className="form-group">
          <label htmlFor="telefone">
            Telefone <span className="required">*</span>
          </label>
          <input
            type="tel"
            id="telefone"
            name="telefone"
            value={formData.telefone}
            onChange={handleChange}
            required
            placeholder="(11) 99999-9999"
          />
        </div>

        <div className="form-group">
          <label htmlFor="instagram">Instagram</label>
          <input
            type="text"
            id="instagram"
            name="instagram"
            value={formData.instagram}
            onChange={handleChange}
            placeholder="@usuario"
          />
        </div>

        <div className="form-group">
          <label htmlFor="googleMeuNegocio">Google Meu Negócio</label>
          <input
            type="text"
            id="googleMeuNegocio"
            name="googleMeuNegocio"
            value={formData.googleMeuNegocio}
            onChange={handleChange}
            placeholder="Link ou nome"
          />
        </div>

        <div className="form-group">
          <label htmlFor="presencaRedeSocial">
            Tem Presença na Rede Social? <span className="required">*</span>
          </label>
          <select
            id="presencaRedeSocial"
            name="presencaRedeSocial"
            value={formData.presencaRedeSocial}
            onChange={handleChange}
            required
          >
            <option value="">Selecione...</option>
            <option value="Sim">Sim</option>
            <option value="Não">Não</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="btn-primary"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Adicionando...' : '➕ Adicionar Prospect'}
      </button>
    </form>
  )
}

export default ProspectForm
