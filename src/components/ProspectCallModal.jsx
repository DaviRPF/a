import { useState, useEffect, useRef } from 'react'
import { updateProspect } from '../services/api'
import '../styles/ProspectCallModal.css'

const ProspectCallModal = ({ isOpen, onClose, prospect, fields = [], onUpdate }) => {
  const [formData, setFormData] = useState({})
  const [isRecording, setIsRecording] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [audioDevices, setAudioDevices] = useState([])
  const [selectedMic, setSelectedMic] = useState('')
  const [micVolume, setMicVolume] = useState(0)
  const [systemVolume, setSystemVolume] = useState(0)

  const micStreamRef = useRef(null)
  const systemStreamRef = useRef(null)
  const micAnalyserRef = useRef(null)
  const systemAnalyserRef = useRef(null)
  const recognitionRef = useRef(null)
  const animationFrameRef = useRef(null)

  useEffect(() => {
    if (prospect) {
      setFormData({ ...prospect })
    }
  }, [prospect])

  useEffect(() => {
    loadAudioDevices()
    return () => {
      stopRecording()
    }
  }, [])

  const loadAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const mics = devices.filter(device => device.kind === 'audioinput')
      setAudioDevices(mics)
      if (mics.length > 0 && !selectedMic) {
        setSelectedMic(mics[0].deviceId)
      }
    } catch (error) {
      console.error('Erro ao carregar dispositivos de áudio:', error)
    }
  }

  const setupVolumeAnalyzer = (stream, setVolume) => {
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
      setVolume(Math.min(100, (average / 255) * 100))
      animationFrameRef.current = requestAnimationFrame(updateVolume)
    }

    updateVolume()
    return analyser
  }

  const startRecording = async () => {
    try {
      // Capturar microfone
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: selectedMic ? { deviceId: { exact: selectedMic } } : true
      })
      micStreamRef.current = micStream
      micAnalyserRef.current = setupVolumeAnalyzer(micStream, setMicVolume)

      // Tentar capturar áudio do sistema (via compartilhamento de tela/aba)
      try {
        const systemStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        })
        systemStreamRef.current = systemStream
        systemAnalyserRef.current = setupVolumeAnalyzer(systemStream, setSystemVolume)
      } catch (err) {
        console.log('Usuário não compartilhou áudio do sistema')
      }

      // Iniciar reconhecimento de voz
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        const recognition = new SpeechRecognition()

        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'pt-BR'

        recognition.onresult = (event) => {
          let interimTranscript = ''
          let finalTranscript = ''

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' '
            } else {
              interimTranscript += transcript
            }
          }

          setTranscription(prev => prev + finalTranscript)
        }

        recognition.onerror = (event) => {
          console.error('Erro no reconhecimento de voz:', event.error)
        }

        recognition.start()
        recognitionRef.current = recognition
      }

      setIsRecording(true)
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error)
      alert('Erro ao iniciar gravação. Verifique as permissões de microfone.')
    }
  }

  const stopRecording = () => {
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

    // Parar animação de volume
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    setMicVolume(0)
    setSystemVolume(0)
    setIsRecording(false)
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
          {/* Informações do Prospect */}
          <section className="prospect-info-section">
            <h3>📋 Informações do Prospect</h3>
            <div className="form-grid">
              {fields.map(field => (
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
          <section className="transcription-section">
            <h3>📝 Transcrição em Tempo Real</h3>
            <div className="transcription-box">
              {transcription || 'A transcrição aparecerá aqui quando você iniciar a gravação...'}
            </div>
            {transcription && (
              <button
                className="btn-clear-transcription"
                onClick={() => setTranscription('')}
              >
                🗑️ Limpar Transcrição
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default ProspectCallModal
