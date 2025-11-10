import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { updateProspect } from '../services/api'
import '../styles/ProspectCallModal.css'

const ProspectCallModal = ({ isOpen, onClose, prospect, fields = [], onUpdate }) => {
  // Estados existentes
  const [formData, setFormData] = useState({})
  const [audioDevices, setAudioDevices] = useState([])
  const [selectedMic, setSelectedMic] = useState('')
  const [micVolume, setMicVolume] = useState(0)
  const [systemVolume, setSystemVolume] = useState(0)

  // Novos estados para gravação de áudio
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [transcription, setTranscription] = useState('')

  // Estados do fluxo
  const [flowState, setFlowState] = useState('idle') // 'idle', 'recording', 'approving_transcript', 'approving_analysis', 'viewing_history'
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [editedAnalysis, setEditedAnalysis] = useState(null)
  const [callHistory, setCallHistory] = useState([])
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false)
  const [isSavingCall, setIsSavingCall] = useState(false)

  // Refs
  const micStreamRef = useRef(null)
  const systemStreamRef = useRef(null)
  const micAnalyserRef = useRef(null)
  const systemAnalyserRef = useRef(null)
  const recognitionRef = useRef(null)
  const micAnimationFrameRef = useRef(null)
  const systemAnimationFrameRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  useEffect(() => {
    if (prospect) {
      setFormData({ ...prospect })
      loadCallHistory()
    }
  }, [prospect])

  useEffect(() => {
    if (isOpen) {
      loadAudioDevices()
      setFlowState('idle')
      setTranscription('')
      setAudioBlob(null)
      setAiAnalysis(null)
      setEditedAnalysis(null)
    }
    return () => {
      stopRecording()
    }
  }, [isOpen])

  const loadCallHistory = async () => {
    if (!prospect?.id) return
    try {
      const response = await axios.get(`/api/prospects/${prospect.id}/call-history`)
      setCallHistory(response.data || [])
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
    }
  }

  const loadAudioDevices = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop())
        })

      const devices = await navigator.mediaDevices.enumerateDevices()
      const mics = devices.filter(device => device.kind === 'audioinput')
      setAudioDevices(mics)
      if (mics.length > 0 && !selectedMic) {
        setSelectedMic(mics[0].deviceId)
      }
    } catch (error) {
      console.error('Erro ao carregar dispositivos de áudio:', error)
      alert('Erro ao acessar microfone. Verifique as permissões do navegador.')
    }
  }

  const setupVolumeAnalyzer = (stream, setVolume, animationFrameRef) => {
    const audioContext = new AudioContext()
    const analyser = audioContext.createAnalyser()
    const microphone = audioContext.createMediaStreamSource(stream)

    analyser.smoothingTimeConstant = 0.8
    analyser.fftSize = 1024

    microphone.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const updateVolume = () => {
      analyser.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length
      const volumePercent = Math.min(100, (average / 255) * 100)
      setVolume(volumePercent)
      animationFrameRef.current = requestAnimationFrame(updateVolume)
    }

    updateVolume()
    return { analyser, audioContext }
  }

  const startRecording = async () => {
    try {
      audioChunksRef.current = []

      // Capturar microfone
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: selectedMic ? { deviceId: { exact: selectedMic } } : true
      })
      micStreamRef.current = micStream
      const micAnalyzerData = setupVolumeAnalyzer(micStream, setMicVolume, micAnimationFrameRef)
      micAnalyserRef.current = micAnalyzerData

      // Tentar capturar áudio do sistema
      try {
        const systemStream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: "monitor" },
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          },
          preferCurrentTab: false,
          selfBrowserSurface: "exclude",
          systemAudio: "include"
        })

        const audioTracks = systemStream.getAudioTracks()
        if (audioTracks.length > 0) {
          systemStreamRef.current = systemStream
          const systemAnalyzerData = setupVolumeAnalyzer(systemStream, setSystemVolume, systemAnimationFrameRef)
          systemAnalyserRef.current = systemAnalyzerData
          console.log('✅ Áudio do sistema capturado')
        } else {
          systemStream.getTracks().forEach(track => track.stop())
        }
      } catch (err) {
        console.log('❌ Áudio do sistema não capturado:', err.message)
      }

      // Criar MediaRecorder para gravar áudio
      const audioTracks = [
        ...micStream.getAudioTracks(),
        ...(systemStreamRef.current?.getAudioTracks() || [])
      ]
      const combinedStream = new MediaStream(audioTracks)

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'audio/webm'
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
        console.log('✅ Gravação de áudio salva, tamanho:', audioBlob.size)
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder

      // Iniciar reconhecimento de voz
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        const recognition = new SpeechRecognition()

        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'pt-BR'

        recognition.onresult = (event) => {
          let finalTranscript = ''

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' '
            }
          }

          if (finalTranscript) {
            setTranscription(prev => prev + finalTranscript)
          }
        }

        recognition.onerror = (event) => {
          console.error('Erro no reconhecimento de voz:', event.error)
        }

        recognition.onend = () => {
          if (isRecording && recognitionRef.current) {
            console.log('Reiniciando reconhecimento de voz...')
            recognition.start()
          }
        }

        recognition.start()
        recognitionRef.current = recognition
      }

      setIsRecording(true)
      setFlowState('recording')
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error)
      alert('Erro ao iniciar gravação. Verifique as permissões de microfone.')
    }
  }

  const stopRecording = () => {
    // Parar MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }

    // Parar streams
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop())
      micStreamRef.current = null
    }

    if (systemStreamRef.current) {
      systemStreamRef.current.getTracks().forEach(track => track.stop())
      systemStreamRef.current = null
    }

    // Parar reconhecimento de voz
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    // Parar animações de volume
    if (micAnimationFrameRef.current) {
      cancelAnimationFrame(micAnimationFrameRef.current)
      micAnimationFrameRef.current = null
    }

    if (systemAnimationFrameRef.current) {
      cancelAnimationFrame(systemAnimationFrameRef.current)
      systemAnimationFrameRef.current = null
    }

    // Fechar audio contexts
    if (micAnalyserRef.current?.audioContext) {
      micAnalyserRef.current.audioContext.close()
      micAnalyserRef.current = null
    }

    if (systemAnalyserRef.current?.audioContext) {
      systemAnalyserRef.current.audioContext.close()
      systemAnalyserRef.current = null
    }

    setMicVolume(0)
    setSystemVolume(0)
    setIsRecording(false)

    // Se tem transcrição, mover para aprovação
    if (transcription.trim()) {
      setFlowState('approving_transcript')
    } else {
      setFlowState('idle')
    }
  }

  const approveTranscript = async () => {
    if (!transcription.trim()) {
      alert('Transcrição vazia!')
      return
    }

    setIsLoadingAnalysis(true)
    try {
      // Enviar transcrição para IA analisar
      const response = await axios.post(`/api/prospects/${prospect.id}/analyze-call`, {
        transcript: transcription
      })

      setAiAnalysis(response.data)
      setEditedAnalysis({ ...response.data }) // Cópia para edição
      setFlowState('approving_analysis')
    } catch (error) {
      console.error('Erro ao analisar transcrição:', error)
      alert('Erro ao analisar transcrição com IA')
    } finally {
      setIsLoadingAnalysis(false)
    }
  }

  const rejectTranscript = () => {
    setTranscription('')
    setAudioBlob(null)
    setFlowState('idle')
  }

  const handleAnalysisFieldChange = (field, value) => {
    setEditedAnalysis(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const approveAnalysis = async () => {
    setIsSavingCall(true)
    try {
      // Converter áudio para base64 se existir
      let audioBase64 = null
      if (audioBlob) {
        const reader = new FileReader()
        audioBase64 = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result)
          reader.readAsDataURL(audioBlob)
        })
      }

      // Salvar chamada no histórico
      await axios.post(`/api/prospects/${prospect.id}/save-call`, {
        audioBlob: audioBase64,
        transcript: transcription,
        analysis: editedAnalysis
      })

      // Recarregar histórico
      await loadCallHistory()

      // Atualizar prospect no formulário se status mudou
      if (editedAnalysis.status) {
        setFormData(prev => ({
          ...prev,
          status: editedAnalysis.status,
          ...Object.keys(editedAnalysis).reduce((acc, key) => {
            if (editedAnalysis[key]) {
              acc[key] = editedAnalysis[key]
            }
            return acc
          }, {})
        }))
      }

      alert('✅ Chamada salva no histórico!')

      // Resetar para estado inicial
      setTranscription('')
      setAudioBlob(null)
      setAiAnalysis(null)
      setEditedAnalysis(null)
      setFlowState('idle')
    } catch (error) {
      console.error('Erro ao salvar chamada:', error)
      alert('Erro ao salvar chamada')
    } finally {
      setIsSavingCall(false)
    }
  }

  const rejectAnalysis = () => {
    setFlowState('approving_transcript')
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSave = async () => {
    try {
      const updated = await updateProspect(prospect.id, formData)
      onUpdate(updated)
      alert('Prospect atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro ao salvar alterações')
    }
  }

  const renderField = (field) => {
    const commonProps = {
      id: field.id,
      name: field.id,
      value: formData[field.id] || '',
      onChange: handleChange
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

  if (!isOpen || !prospect) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="prospect-call-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📞 Prospecção - {prospect.nome || 'Prospect'}</h2>
          <button className="btn-close-modal" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* ESTADO: IDLE ou RECORDING */}
          {(flowState === 'idle' || flowState === 'recording') && (
            <>
              {/* Informações do Prospect */}
              <section className="prospect-info-section">
                <h3>📋 Informações do Prospect</h3>
                <div className="form-grid">
                  {fields.slice(0, 5).map(field => (
                    <div key={field.id} className="form-group">
                      <label htmlFor={field.id}>
                        {field.icon && <span className="field-icon-label">{field.icon}</span>}
                        {field.label}
                      </label>
                      {renderField(field)}
                    </div>
                  ))}
                </div>
                <button className="btn-save" onClick={handleSave}>
                  💾 Salvar Alterações
                </button>
              </section>

              {/* Configuração de Áudio */}
              <section className="audio-config-section">
                <h3>🎤 Configuração de Áudio</h3>

                <div className="form-group">
                  <label htmlFor="micSelect">Selecione o Microfone</label>
                  <select
                    id="micSelect"
                    value={selectedMic}
                    onChange={(e) => setSelectedMic(e.target.value)}
                    disabled={isRecording}
                  >
                    {audioDevices.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microfone ${device.deviceId.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Visualizadores de Volume */}
                <div className="volume-meters">
                  <div className="volume-meter">
                    <label>🎤 Microfone</label>
                    <div className="volume-bar-container">
                      <div
                        className="volume-bar mic-volume"
                        style={{ width: `${micVolume}%` }}
                      />
                    </div>
                    <span className="volume-value">{Math.round(micVolume)}%</span>
                  </div>

                  <div className="volume-meter">
                    <label>💻 Áudio do PC</label>
                    <div className="volume-bar-container">
                      <div
                        className="volume-bar system-volume"
                        style={{ width: `${systemVolume}%` }}
                      />
                    </div>
                    <span className="volume-value">{Math.round(systemVolume)}%</span>
                  </div>
                </div>

                {/* Botão de Gravação */}
                <button
                  className={`btn-record ${isRecording ? 'recording' : ''}`}
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? (
                    <>
                      <span className="recording-indicator">⏺</span>
                      Parar Gravação
                    </>
                  ) : (
                    <>
                      🎙️ Iniciar Gravação
                    </>
                  )}
                </button>
              </section>

              {/* Transcrição */}
              {flowState === 'recording' && (
                <section className="transcription-section">
                  <h3>📝 Transcrição em Tempo Real</h3>
                  <div className="transcription-box">
                    {transcription || 'A transcrição aparecerá aqui quando você falar...'}
                  </div>
                </section>
              )}
            </>
          )}

          {/* ESTADO: APROVANDO TRANSCRIÇÃO */}
          {flowState === 'approving_transcript' && (
            <section className="approval-section">
              <h3>✅ Aprovar Transcrição</h3>
              <div className="transcription-box">
                {transcription}
              </div>
              <div className="approval-buttons">
                <button className="btn-approve" onClick={approveTranscript} disabled={isLoadingAnalysis}>
                  {isLoadingAnalysis ? '⏳ Analisando...' : '✅ Aprovar e Analisar com IA'}
                </button>
                <button className="btn-reject" onClick={rejectTranscript} disabled={isLoadingAnalysis}>
                  ❌ Rejeitar
                </button>
              </div>
            </section>
          )}

          {/* ESTADO: APROVANDO ANÁLISE DA IA */}
          {flowState === 'approving_analysis' && editedAnalysis && (
            <section className="approval-section">
              <h3>🤖 Revisar Análise da IA</h3>
              <p className="approval-subtitle">Revise e edite os campos extraídos pela IA:</p>

              <div className="analysis-form">
                <div className="form-group">
                  <label>Status da Ligação</label>
                  <select
                    value={editedAnalysis.status || ''}
                    onChange={(e) => handleAnalysisFieldChange('status', e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    <option value="Contato com o atendente">Contato com o atendente</option>
                    <option value="Contato com o decisor">Contato com o decisor</option>
                    <option value="Objeção do atendente">Objeção do atendente</option>
                    <option value="Objeção do decisor">Objeção do decisor</option>
                    <option value="Reunião marcada">Reunião marcada</option>
                    <option value="Não contatado ainda">Não contatado ainda</option>
                  </select>
                </div>

                {editedAnalysis.horarioDiaDecisorPresente !== undefined && (
                  <div className="form-group">
                    <label>⏰ Horário/Dia que o Decisor Está Presente</label>
                    <textarea
                      rows="2"
                      value={editedAnalysis.horarioDiaDecisorPresente || ''}
                      onChange={(e) => handleAnalysisFieldChange('horarioDiaDecisorPresente', e.target.value)}
                      placeholder="Ex: Segunda a Sexta, 14h às 18h"
                    />
                  </div>
                )}

                {editedAnalysis.diaHorarioReuniao !== undefined && (
                  <div className="form-group">
                    <label>📅 Data e Horário da Reunião</label>
                    <input
                      type="text"
                      value={editedAnalysis.diaHorarioReuniao || ''}
                      onChange={(e) => handleAnalysisFieldChange('diaHorarioReuniao', e.target.value)}
                      placeholder="Ex: Segunda-feira, 15/01 às 14h"
                    />
                  </div>
                )}

                {editedAnalysis.contatoPessoalDecisor !== undefined && (
                  <div className="form-group">
                    <label>📱 Contato Pessoal do Decisor</label>
                    <input
                      type="tel"
                      value={editedAnalysis.contatoPessoalDecisor || ''}
                      onChange={(e) => handleAnalysisFieldChange('contatoPessoalDecisor', e.target.value)}
                      placeholder="Ex: (11) 99999-9999"
                    />
                  </div>
                )}

                {editedAnalysis.motivoObjecaoDecisor !== undefined && (
                  <div className="form-group">
                    <label>❌ Motivo da Objeção do Decisor</label>
                    <textarea
                      rows="3"
                      value={editedAnalysis.motivoObjecaoDecisor || ''}
                      onChange={(e) => handleAnalysisFieldChange('motivoObjecaoDecisor', e.target.value)}
                      placeholder="Ex: Já tem fornecedor"
                    />
                  </div>
                )}

                {editedAnalysis.motivoObjecaoAtendente !== undefined && (
                  <div className="form-group">
                    <label>🚫 Motivo da Objeção do Atendente</label>
                    <textarea
                      rows="3"
                      value={editedAnalysis.motivoObjecaoAtendente || ''}
                      onChange={(e) => handleAnalysisFieldChange('motivoObjecaoAtendente', e.target.value)}
                      placeholder="Ex: Decisor não está"
                    />
                  </div>
                )}
              </div>

              <div className="approval-buttons">
                <button className="btn-approve" onClick={approveAnalysis} disabled={isSavingCall}>
                  {isSavingCall ? '⏳ Salvando...' : '✅ Aprovar e Salvar'}
                </button>
                <button className="btn-reject" onClick={rejectAnalysis} disabled={isSavingCall}>
                  ⬅️ Voltar
                </button>
              </div>
            </section>
          )}

          {/* HISTÓRICO DE CHAMADAS */}
          {callHistory.length > 0 && flowState === 'idle' && (
            <section className="call-history-section">
              <h3>📜 Histórico de Chamadas ({callHistory.length})</h3>
              <div className="call-history-list">
                {callHistory.map(call => (
                  <details key={call.id} className="call-history-item">
                    <summary className="call-summary">
                      <span className="call-date">
                        📅 {new Date(call.date).toLocaleString('pt-BR')}
                      </span>
                      {call.analysis?.status && (
                        <span className="call-status">{call.analysis.status}</span>
                      )}
                    </summary>
                    <div className="call-details">
                      {call.audioBlob && (
                        <div className="call-audio">
                          <label>🎤 Gravação:</label>
                          <audio controls src={call.audioBlob} />
                        </div>
                      )}
                      <div className="call-transcript">
                        <label>📝 Transcrição:</label>
                        <p>{call.transcript}</p>
                      </div>
                      {call.analysis && Object.keys(call.analysis).length > 0 && (
                        <div className="call-analysis">
                          <label>🤖 Análise:</label>
                          <ul>
                            {Object.entries(call.analysis).map(([key, value]) => {
                              if (!value || key === 'status') return null
                              const fieldConfig = fields.find(f => f.id === key)
                              const label = fieldConfig?.label || key
                              return (
                                <li key={key}>
                                  <strong>{label}:</strong> {value}
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProspectCallModal
