import { useState, useEffect } from 'react'
import axios from 'axios'
import '../styles/SchedulesPanel.css'

const SchedulesPanel = ({ prospects = [], fields = [] }) => {
  const [schedules, setSchedules] = useState({ returns: [], meetings: [] })
  const [weekOffset, setWeekOffset] = useState(0) // 0 = semana atual, 1 = próxima, -1 = anterior
  const [showMonthView, setShowMonthView] = useState(false)
  const [monthOffset, setMonthOffset] = useState(0) // 0 = mês atual

  useEffect(() => {
    loadSchedules()
  }, [prospects])

  const loadSchedules = () => {
    // Filtrar prospects que têm agendamentos
    const returns = prospects.filter(p => p.horarioDiaDecisorPresente && p.horarioDiaDecisorPresente.trim())
    const meetings = prospects.filter(p => p.diaHorarioReuniao && p.diaHorarioReuniao.trim())

    console.log('📊 CALENDÁRIO - Carregando agendamentos:')
    console.log('  - Total de prospects:', prospects.length)
    console.log('  - Retornos encontrados:', returns.length)
    console.log('  - Reuniões encontradas:', meetings.length)

    if (returns.length > 0) {
      console.log('  - Exemplos de retornos:')
      returns.slice(0, 3).forEach(r => {
        console.log(`    * ${r.nome}: ${r.horarioDiaDecisorPresente}`)
      })
    }

    if (meetings.length > 0) {
      console.log('  - Exemplos de reuniões:')
      meetings.slice(0, 3).forEach(m => {
        console.log(`    * ${m.nome}: ${m.diaHorarioReuniao}`)
      })
    }

    setSchedules({ returns, meetings })
  }

  const getFieldValue = (prospect, fieldId) => {
    return prospect[fieldId] || ''
  }

  const getFieldLabel = (fieldId) => {
    const field = fields.find(f => f.id === fieldId)
    return field ? field.label : fieldId
  }

  const getFieldIcon = (fieldId) => {
    const field = fields.find(f => f.id === fieldId)
    return field ? field.icon : ''
  }

  // Funções auxiliares para o calendário
  const getWeekDays = () => {
    const today = new Date()
    const currentDay = today.getDay() // 0 = domingo, 1 = segunda, ...
    const monday = new Date(today)

    // Ajustar para segunda-feira
    const diff = currentDay === 0 ? -6 : 1 - currentDay
    monday.setDate(today.getDate() + diff)

    // Aplicar offset de semanas
    monday.setDate(monday.getDate() + (weekOffset * 7))

    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday)
      day.setDate(monday.getDate() + i)
      days.push(day)
    }
    return days
  }

  const getWeekRange = () => {
    const days = getWeekDays()
    const firstDay = days[0]
    const lastDay = days[6]

    const formatDate = (date) => {
      const day = date.getDate()
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      const month = months[date.getMonth()]
      return `${day} ${month}`
    }

    return `${formatDate(firstDay)} - ${formatDate(lastDay)}`
  }

  const goToPreviousWeek = () => {
    setWeekOffset(prev => prev - 1)
  }

  const goToNextWeek = () => {
    setWeekOffset(prev => prev + 1)
  }

  const goToToday = () => {
    setWeekOffset(0)
  }

  const getMonthDays = () => {
    const today = new Date()
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)

    const year = targetMonth.getFullYear()
    const month = targetMonth.getMonth()

    // Primeiro dia do mês
    const firstDay = new Date(year, month, 1)
    // Último dia do mês
    const lastDay = new Date(year, month + 1, 0)

    // Dia da semana do primeiro dia (0 = domingo)
    const firstDayOfWeek = firstDay.getDay()

    // Ajustar para começar na segunda-feira
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

    // Criar array de dias
    const days = []

    // Dias do mês anterior (para preencher início da semana)
    for (let i = startOffset - 1; i >= 0; i--) {
      const day = new Date(year, month, -i)
      days.push({ date: day, isCurrentMonth: false })
    }

    // Dias do mês atual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const day = new Date(year, month, i)
      days.push({ date: day, isCurrentMonth: true })
    }

    // Dias do próximo mês (para completar última semana)
    const remainingDays = 42 - days.length // 6 semanas × 7 dias
    for (let i = 1; i <= remainingDays; i++) {
      const day = new Date(year, month + 1, i)
      days.push({ date: day, isCurrentMonth: false })
    }

    return { days, month: targetMonth }
  }

  const parseScheduleDateTime = (scheduleText, type) => {
    if (!scheduleText) return null

    console.log('🔍 Tentando parsear:', scheduleText)

    // PRIORIDADE 1: Formato ISO 8601 (YYYY-MM-DDTHH:mm)
    const isoMatch = scheduleText.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
    if (isoMatch) {
      const [_, year, month, day, hour, minute] = isoMatch
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1, // Mês começa em 0
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      )
      console.log('📅 Data ISO parseada:', scheduleText, '→', date.toLocaleString('pt-BR'))
      return date
    }

    // PRIORIDADE 2: Formato DD/MM/YYYY HH:mm ou DD/MM/YYYY às HH:mm
    const fullDateMatch = scheduleText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(?:às?\s*)?(\d{1,2}):(\d{2})/)
    if (fullDateMatch) {
      const [_, day, month, year, hour, minute] = fullDateMatch
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      )
      console.log('📅 Data DD/MM/YYYY HH:mm parseada:', scheduleText, '→', date.toLocaleString('pt-BR'))
      return date
    }

    // PRIORIDADE 3: Formato DD/MM/YYYY (sem hora)
    const dateOnlyMatch = scheduleText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (dateOnlyMatch) {
      const [_, day, month, year] = dateOnlyMatch
      const hour = type === 'return' ? 9 : 14
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        hour,
        0
      )
      console.log('📅 Data DD/MM/YYYY parseada:', scheduleText, '→', date.toLocaleString('pt-BR'))
      return date
    }

    // FALLBACK: Parsear texto livre (para dados antigos)
    const today = new Date()
    const lowerText = scheduleText.toLowerCase()

    // Tentar extrair data no formato DD/MM (sem ano)
    const dateMatch = scheduleText.match(/(\d{1,2})\/(\d{1,2})/)
    // Tentar extrair horário
    const timeMatch = scheduleText.match(/(\d{1,2}):(\d{2})/) || scheduleText.match(/(\d{1,2})(?:h|hs|horas)/)

    let targetDate = new Date(today)
    let hour = type === 'return' ? 9 : 14 // Default: retornos às 9h, reuniões às 14h
    let minute = 0

    if (dateMatch) {
      const day = parseInt(dateMatch[1])
      const month = parseInt(dateMatch[2]) - 1
      targetDate = new Date(today.getFullYear(), month, day)
    } else if (lowerText.includes('amanhã') || lowerText.includes('amanha')) {
      targetDate.setDate(today.getDate() + 1)
    } else if (lowerText.includes('segunda')) {
      targetDate = getNextWeekday(1)
    } else if (lowerText.includes('terça') || lowerText.includes('terca')) {
      targetDate = getNextWeekday(2)
    } else if (lowerText.includes('quarta')) {
      targetDate = getNextWeekday(3)
    } else if (lowerText.includes('quinta')) {
      targetDate = getNextWeekday(4)
    } else if (lowerText.includes('sexta')) {
      targetDate = getNextWeekday(5)
    } else if (lowerText.includes('sábado') || lowerText.includes('sabado')) {
      targetDate = getNextWeekday(6)
    } else if (lowerText.includes('domingo')) {
      targetDate = getNextWeekday(0)
    } else if (lowerText.includes('hoje')) {
      // Já é hoje, não precisa mudar
    } else {
      console.log('⚠️ Não conseguiu extrair data de:', scheduleText)
      return null // Não conseguiu parsear, retorna null
    }

    if (timeMatch) {
      hour = parseInt(timeMatch[1])
      minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0
    }

    targetDate.setHours(hour, minute, 0, 0)
    console.log('📅 Data texto livre parseada:', scheduleText, '→', targetDate.toLocaleString('pt-BR'))
    return targetDate
  }

  const getNextWeekday = (targetDay) => {
    const today = new Date()
    const currentDay = today.getDay()
    let daysUntilTarget = targetDay - currentDay

    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7
    }

    const result = new Date(today)
    result.setDate(today.getDate() + daysUntilTarget)
    return result
  }

  const formatDayHeader = (date) => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return {
      dayName: days[date.getDay()],
      dayNumber: date.getDate(),
      month: months[date.getMonth()]
    }
  }

  const isSameDay = (date1, date2) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear()
  }

  const getSchedulesForDay = (date) => {
    const daySchedules = []
    const dateStr = date.toLocaleDateString('pt-BR')

    // Adicionar retornos
    schedules.returns.forEach(prospect => {
      const scheduleDate = parseScheduleDateTime(prospect.horarioDiaDecisorPresente, 'return')
      if (scheduleDate) {
        const isSame = isSameDay(scheduleDate, date)
        if (isSame) {
          console.log(`✅ MATCH - Retorno para ${dateStr}: ${prospect.nome} em ${scheduleDate.toLocaleString('pt-BR')}`)
          daySchedules.push({
            type: 'return',
            prospect,
            date: scheduleDate,
            duration: 5 // minutos
          })
        }
      }
    })

    // Adicionar reuniões
    schedules.meetings.forEach(prospect => {
      const scheduleDate = parseScheduleDateTime(prospect.diaHorarioReuniao, 'meeting')
      if (scheduleDate) {
        const isSame = isSameDay(scheduleDate, date)
        if (isSame) {
          console.log(`✅ MATCH - Reunião para ${dateStr}: ${prospect.nome} em ${scheduleDate.toLocaleString('pt-BR')}`)
          daySchedules.push({
            type: 'meeting',
            prospect,
            date: scheduleDate,
            duration: 60 // minutos
          })
        }
      }
    })

    if (daySchedules.length > 0) {
      console.log(`📌 Dia ${dateStr}: ${daySchedules.length} evento(s)`)
    }

    // Ordenar por horário
    return daySchedules.sort((a, b) => a.date - b.date)
  }

  const getEventStyle = (schedule) => {
    const hour = schedule.date.getHours()
    const minute = schedule.date.getMinutes()

    // Converter para minutos desde 8h (clamped para ficar dentro do calendário)
    let minutesSince8am = (hour - 8) * 60 + minute

    // Garantir que eventos antes das 8h apareçam no topo
    if (minutesSince8am < 0) {
      minutesSince8am = 0
    }

    // Garantir que eventos depois das 17h não saiam do calendário
    if (minutesSince8am > 540) { // 9h de range (8h às 17h = 540 minutos)
      minutesSince8am = 540
    }

    const pixelsPerMinute = 1 // 1 pixel por minuto

    // Altura mínima de 40px para eventos serem visíveis
    const minHeight = 40
    const calculatedHeight = schedule.duration * pixelsPerMinute
    const finalHeight = Math.max(calculatedHeight, minHeight)

    console.log(`📍 Posicionando evento: ${schedule.prospect.nome}`)
    console.log(`  - Horário: ${hour}:${minute.toString().padStart(2, '0')}`)
    console.log(`  - Top: ${minutesSince8am}px`)
    console.log(`  - Height: ${finalHeight}px`)

    return {
      top: `${minutesSince8am * pixelsPerMinute}px`,
      height: `${finalHeight}px`
    }
  }

  return (
    <div className="schedules-panel">
      <div className="panel-header">
        <h2>📅 Agendamentos</h2>
      </div>

      <div className="panel-body">
          {/* Retornos Agendados */}
          <section className="schedules-section">
            <h3>⏰ Retornos Agendados ({schedules.returns.length})</h3>
            <p className="section-subtitle">
              Prospects em que a atendente informou quando o decisor está presente
            </p>

            {schedules.returns.length === 0 ? (
              <div className="empty-state">
                <p>📭 Nenhum retorno agendado</p>
                <small>Os horários informados pelos atendentes aparecerão aqui</small>
              </div>
            ) : (
              <div className="schedules-list">
                {schedules.returns.map(prospect => (
                  <div key={prospect.id} className="schedule-card return-card">
                    <div className="schedule-header">
                      <h4>{getFieldIcon('nome')} {getFieldValue(prospect, 'nome')}</h4>
                      {prospect.status && (
                        <span className="schedule-status">{prospect.status}</span>
                      )}
                    </div>

                    <div className="schedule-info">
                      <div className="info-item">
                        <span className="info-label">⏰ Horário/Dia:</span>
                        <span className="info-value">{prospect.horarioDiaDecisorPresente}</span>
                      </div>

                      {getFieldValue(prospect, 'telefone') && (
                        <div className="info-item">
                          <span className="info-label">📞 Telefone:</span>
                          <span className="info-value">{getFieldValue(prospect, 'telefone')}</span>
                        </div>
                      )}

                      {getFieldValue(prospect, 'cidade') && (
                        <div className="info-item">
                          <span className="info-label">🏙️ Cidade:</span>
                          <span className="info-value">{getFieldValue(prospect, 'cidade')}</span>
                        </div>
                      )}

                      {getFieldValue(prospect, 'contatoPessoalDecisor') && (
                        <div className="info-item">
                          <span className="info-label">📱 Contato Decisor:</span>
                          <span className="info-value">{getFieldValue(prospect, 'contatoPessoalDecisor')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Reuniões Marcadas */}
          <section className="schedules-section">
            <h3>🤝 Reuniões Marcadas ({schedules.meetings.length})</h3>
            <p className="section-subtitle">
              Prospects que agendaram reunião com você
            </p>

            {schedules.meetings.length === 0 ? (
              <div className="empty-state">
                <p>📭 Nenhuma reunião marcada</p>
                <small>As reuniões agendadas aparecerão aqui</small>
              </div>
            ) : (
              <div className="schedules-list">
                {schedules.meetings.map(prospect => (
                  <div key={prospect.id} className="schedule-card meeting-card">
                    <div className="schedule-header">
                      <h4>{getFieldIcon('nome')} {getFieldValue(prospect, 'nome')}</h4>
                      <span className="schedule-status meeting-status">Reunião marcada</span>
                    </div>

                    <div className="schedule-info">
                      <div className="info-item highlight">
                        <span className="info-label">📅 Data/Horário:</span>
                        <span className="info-value">
                          {(() => {
                            const date = parseScheduleDateTime(prospect.diaHorarioReuniao, 'meeting')
                            if (date) {
                              return date.toLocaleString('pt-BR', {
                                weekday: 'long',
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            }
                            return prospect.diaHorarioReuniao
                          })()}
                        </span>
                      </div>

                      {getFieldValue(prospect, 'telefone') && (
                        <div className="info-item">
                          <span className="info-label">📞 Telefone:</span>
                          <span className="info-value">{getFieldValue(prospect, 'telefone')}</span>
                        </div>
                      )}

                      {getFieldValue(prospect, 'contatoPessoalDecisor') && (
                        <div className="info-item">
                          <span className="info-label">📱 Contato Decisor:</span>
                          <span className="info-value">{getFieldValue(prospect, 'contatoPessoalDecisor')}</span>
                        </div>
                      )}

                      {getFieldValue(prospect, 'cidade') && (
                        <div className="info-item">
                          <span className="info-label">🏙️ Cidade:</span>
                          <span className="info-value">{getFieldValue(prospect, 'cidade')}</span>
                        </div>
                      )}

                      {getFieldValue(prospect, 'tipoEstabelecimento') && (
                        <div className="info-item">
                          <span className="info-label">🏢 Tipo:</span>
                          <span className="info-value">{getFieldValue(prospect, 'tipoEstabelecimento')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Calendário Semanal */}
          <section className="calendar-section">
            <div className="calendar-header">
              <div className="calendar-title">
                <h3>📆 Calendário da Semana</h3>
                <p className="section-subtitle">Visualização dos agendamentos em grade horária</p>
              </div>

              <div className="calendar-controls">
                <button className="btn-today" onClick={goToToday}>
                  Hoje
                </button>
                <button className="btn-month-view" onClick={() => setShowMonthView(true)}>
                  📅 Ver Mês Completo
                </button>
              </div>
            </div>

            <div className="week-navigation">
              <button className="btn-nav" onClick={goToPreviousWeek}>
                ←
              </button>
              <span className="week-range">{getWeekRange()}</span>
              <button className="btn-nav" onClick={goToNextWeek}>
                →
              </button>
            </div>

            <div className="calendar-container">
              {/* Grid de horários */}
              <div className="time-labels">
                <div className="time-label-header"></div>
                {Array.from({ length: 10 }, (_, i) => i + 8).map(hour => (
                  <div key={hour} className="time-label">
                    {hour}:00
                  </div>
                ))}
              </div>

              {/* Colunas dos dias */}
              <div className="days-grid">
                {getWeekDays().map((day, index) => {
                  const dayHeader = formatDayHeader(day)
                  const daySchedules = getSchedulesForDay(day)
                  const isToday = isSameDay(day, new Date())

                  return (
                    <div key={index} className={`day-column ${isToday ? 'today' : ''}`}>
                      <div className="day-header">
                        <div className="day-name">{dayHeader.dayName}</div>
                        <div className="day-number">{dayHeader.dayNumber}</div>
                        <div className="day-month">{dayHeader.month}</div>
                      </div>

                      <div className="day-events">
                        {/* Linhas de horário */}
                        {Array.from({ length: 10 }, (_, i) => (
                          <div key={i} className="hour-slot"></div>
                        ))}

                        {/* Eventos */}
                        {(() => {
                          if (daySchedules.length > 0) {
                            console.log(`🎯 Renderizando ${daySchedules.length} evento(s) para ${dayHeader.dayName} ${dayHeader.dayNumber}`)
                          }
                          return daySchedules.map((schedule, idx) => (
                            <div
                              key={idx}
                              className={`event ${schedule.type}`}
                              style={getEventStyle(schedule)}
                              title={`${schedule.type === 'return' ? '⏰ Retorno' : '🤝 Reunião'}: ${getFieldValue(schedule.prospect, 'nome')}`}
                            >
                              <div className="event-icon">
                                {schedule.type === 'return' ? '⏰' : '🤝'}
                              </div>
                              <div className="event-name">
                                {getFieldValue(schedule.prospect, 'nome')}
                              </div>
                              <div className="event-time">
                                {schedule.date.getHours()}:{schedule.date.getMinutes().toString().padStart(2, '0')}
                              </div>
                            </div>
                          ))
                        })()}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </div>

      {/* Modal de Visualização Mensal */}
      {showMonthView && (
        <div className="modal-overlay" onClick={() => setShowMonthView(false)}>
          <div className="month-modal" onClick={(e) => e.stopPropagation()}>
            <div className="month-modal-header">
              <button className="btn-nav" onClick={() => setMonthOffset(prev => prev - 1)}>
                ←
              </button>
              <h2>{getMonthDays().month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
              <button className="btn-nav" onClick={() => setMonthOffset(prev => prev + 1)}>
                →
              </button>
              <button className="btn-close-month" onClick={() => setShowMonthView(false)}>✕</button>
            </div>

            <div className="month-calendar">
              <div className="month-weekdays">
                <div className="month-weekday">Seg</div>
                <div className="month-weekday">Ter</div>
                <div className="month-weekday">Qua</div>
                <div className="month-weekday">Qui</div>
                <div className="month-weekday">Sex</div>
                <div className="month-weekday">Sáb</div>
                <div className="month-weekday">Dom</div>
              </div>

              <div className="month-days-grid">
                {getMonthDays().days.map((dayObj, index) => {
                  const daySchedules = getSchedulesForDay(dayObj.date)
                  const isToday = isSameDay(dayObj.date, new Date())

                  return (
                    <div
                      key={index}
                      className={`month-day ${!dayObj.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                    >
                      <div className="month-day-number">{dayObj.date.getDate()}</div>
                      <div className="month-day-events">
                        {daySchedules.map((schedule, idx) => (
                          <div
                            key={idx}
                            className={`month-event ${schedule.type}`}
                            title={`${schedule.date.getHours()}:${schedule.date.getMinutes().toString().padStart(2, '0')} - ${getFieldValue(schedule.prospect, 'nome')}`}
                          >
                            <span className="month-event-icon">{schedule.type === 'return' ? '⏰' : '🤝'}</span>
                            <span className="month-event-time">
                              {schedule.date.getHours()}:{schedule.date.getMinutes().toString().padStart(2, '0')}
                            </span>
                            <span className="month-event-name">{getFieldValue(schedule.prospect, 'nome')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SchedulesPanel
