import { useState } from 'react'
import '../styles/NotesProcessor.css'

function NotesProcessor({ onProcessNotes, loading }) {
  const [notes, setNotes] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (notes.trim() && !loading) {
      onProcessNotes(notes)
    }
  }

  const handleClear = () => {
    setNotes('')
  }

  return (
    <div className="notes-processor">
      <div className="notes-processor-header">
        <h3>Processar Anotacoes</h3>
        <p className="notes-description">
          Cole suas anotacoes de prospecao aqui. A IA vai identificar os leads,
          extrair informacoes e verificar duplicados no CRM.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="notes-form">
        <textarea
          className="notes-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={`Cole suas anotacoes aqui...

Exemplo:
pizzaria do joao - ligou, falou pra retornar as 14h
restaurante bella italia - nao atendeu
lanchonete top burger, maria atendente, decisor chega as 18h
padaria central - reuniao marcada quinta 10h`}
          rows={12}
          disabled={loading}
        />

        <div className="notes-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleClear}
            disabled={loading || !notes.trim()}
          >
            Limpar
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !notes.trim()}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Processando...
              </>
            ) : (
              <>
                Processar com IA
              </>
            )}
          </button>
        </div>
      </form>

      <div className="notes-tips">
        <h4>Dicas para melhores resultados:</h4>
        <ul>
          <li>Separe cada empresa em uma linha diferente</li>
          <li>Inclua o nome da empresa e status do contato</li>
          <li>Mencione nomes de contatos quando souber</li>
          <li>Inclua horarios e datas relevantes</li>
          <li>A IA entende anotacoes informais!</li>
        </ul>
      </div>
    </div>
  )
}

export default NotesProcessor
