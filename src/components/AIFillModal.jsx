import { useState } from 'react'
import { extractWithAI } from '../services/api'
import '../styles/AIFillModal.css'

const AIFillModal = ({ isOpen, onClose, onFillData }) => {
  const [text, setText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!text.trim()) {
      setError('Por favor, insira algum texto para processar')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const result = await extractWithAI(text)

      if (result.success && result.data) {
        onFillData(result.data)
        setText('')
        onClose()
      } else {
        setError('Não foi possível extrair informações do texto')
      }
    } catch (err) {
      console.error('Erro ao processar com IA:', err)
      if (err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError('Erro ao processar texto com IA. Verifique se a API key está configurada.')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setText('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🤖 Preencher com IA</h2>
          <button className="btn-close-modal" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            Cole ou digite informações sobre o prospect (pode ser uma mensagem,
            anotações, texto de conversa, etc.) e a IA irá extrair automaticamente
            as informações para preencher o formulário.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="aiText">
                Informações do Prospect
              </label>
              <textarea
                id="aiText"
                className="ai-textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Exemplo:&#10;&#10;Pizzaria do João&#10;Tel: (11) 98765-4321&#10;Instagram: @pizzariadojoao&#10;Eles têm presença nas redes sociais"
                rows="10"
                disabled={isProcessing}
              />
            </div>

            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleClose}
                disabled={isProcessing}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-ai-process"
                disabled={isProcessing || !text.trim()}
              >
                {isProcessing ? (
                  <>
                    <span className="spinner-small"></span>
                    Processando...
                  </>
                ) : (
                  <>
                    🤖 Processar com IA
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AIFillModal
