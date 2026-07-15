'use client'
// app/ventas-segunda/components/VentaCard.js
// Campos del objeto venta siguen la convención MAYÚSCULAS de parseSheets.js.
// El índice de fila se lee de venta._idx (pasado por VentaList).

import { useState, useRef } from 'react'
import {
  derivarEstadoVS,
  ESTADO_CONFIG_VS,
  ESTADO_DESCRIPCION,
  validarAnticipacionCita,
  validarRangoHorario,
  validarReglaDiaAnterior,
} from '../../../lib/ventas-segunda/utils'
import { getPermisos } from '../../../lib/auth'
import Icon from '../../../components/Icon'

const VS_URL = process.env.NEXT_PUBLIC_VS_SCRIPT_URL
const NAVY   = '#1A2238'

// ── Helpers de UI ────────────────────────────────────────────

function Btn({ onClick, disabled, color = NAVY, children, small, icon, outline }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
    padding: small ? '6px 10px' : '8px 14px',
    fontSize: small ? 12 : 13, fontWeight: 500,
    transition: 'background 0.12s, border-color 0.12s',
  }
  const style = outline
    ? { ...base, background: '#fff', color: disabled ? '#B4B2A9' : color,
        border: `0.5px solid ${disabled ? '#E8E6DF' : '#D3D1C7'}` }
    : { ...base, background: disabled ? '#E5E7EB' : color,
        color: disabled ? '#9CA3AF' : 'white', border: 'none' }
  return (
    <button onClick={onClick} disabled={disabled} style={style}>
      {icon && <Icon name={icon} size={small ? 14 : 16} />}
      {children}
    </button>
  )
}

// Convierte URLs antiguas de Google Drive (?id=FILE_ID) al formato actual (/file/d/FILE_ID/view)
function normalizarDriveUrl(url) {
  if (!url) return url
  const match = url.match(/[?&]id=([^&]+)/)
  if (match) return `https://drive.google.com/file/d/${match[1]}/view`
  return url
}

function LinkDoc({ url, label, highlight }) {
  if (!url) return null

  // Separa por coma o salto de línea — maneja 1 o N archivos por celda
  const urls = url
    .split(/,|\n/)
    .map(u => u.trim())
    .filter(u => u.includes('drive.google.com'))

  if (urls.length === 0) return null

  const estiloLink = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 12, textDecoration: 'none', borderRadius: 6, padding: '3px 8px',
    color:      highlight ? '#065F46' : '#2563EB',
    background: highlight ? '#D1FAE5' : '#EFF6FF',
    border:     highlight ? '1px solid #6EE7B7' : '1px solid #BFDBFE',
    fontWeight: highlight ? 600 : 400,
  }

  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
      {urls.map((u, i) => (
        <a key={i} href={normalizarDriveUrl(u)} target="_blank"
           rel="noopener noreferrer" style={estiloLink}>
          <Icon name={highlight ? 'check' : 'paperclip'} size={13} style={{ marginRight: 3 }} />{label}{urls.length > 1 ? ` ${i + 1}` : ''}
        </a>
      ))}
    </span>
  )
}

function InfoRow({ label, value, warn, small }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: 2 }}>
      <span style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase',
        letterSpacing: '0.04em', fontWeight: 600 }}>{label}: </span>
      <span style={{ fontSize: small ? 11 : 12, color: warn ? '#9D174D' : '#374151',
        whiteSpace: 'pre-wrap' }}>{value}</span>
    </div>
  )
}

const inputStyle = {
  flex: 1, border: '1px solid #D1D5DB', borderRadius: 6,
  padding: '6px 8px', fontSize: 13, outline: 'none',
}

// Mapeo de rol → nombre de área para etiquetar observaciones
const AREA_NOMBRE = {
  tesoreria: 'TESORERÍA',
  notaria:   'NOTARÍA',
  legal:     'LEGAL',
}

// Extrae área, estado previo y texto de una observación guardada como
// "[ÁREA][PREVIO:estado] texto"
function parsearObservacion(obs) {
  if (!obs) return { area: '', previo: '', texto: '' }
  const m = obs.match(/^\[([^\]]+)\](?:\[PREVIO:([^\]]*)\])?\s*(.*)$/)
  if (m) return { area: m[1], previo: m[2] || '', texto: m[3] }
  return { area: '', previo: '', texto: obs }
}

// Valida que un valor contenga únicamente dígitos y no esté vacío
function soloDigitos(v) {
  return /^\d+$/.test(String(v || '').trim())
}

// ── Componente principal ─────────────────────────────────────

export default function VentaCard({ venta, rol, onActualizar, enConflicto = false }) {
  const estado   = derivarEstadoVS(venta)
  const cfg      = ESTADO_CONFIG_VS[estado] || ESTADO_CONFIG_VS.INGRESADO
  const permisos = getPermisos(rol)

  // Estado registral del sheet externo de GM
  const gmEstado       = (venta._gmEstado || '').trim().toUpperCase()
  const enCalificacion = gmEstado === 'EN CALIFICACION'
  const enProceso      = gmEstado === 'EN PROCESO'

  // Observación de documentos
  const { area: areaObs, previo: estadoPrevioObs, texto: textoObs } = parsearObservacion(venta.OBSERVACION_DOCS)

  // Observación de contenido (datos del formulario) — siempre de LEGAL
  const { texto: textoContObs } = parsearObservacion(venta.OBSERVACION_CONTENIDO)

  // Validación automática: DNI y teléfono deben contener solo dígitos
  const telefonoInvalido = !soloDigitos(venta.TELEFONO)
  const dniInvalido      = !soloDigitos(venta.DNI)
  const datosInvalidos   = telefonoInvalido || dniInvalido

  // Extrae el motivo del último reagendamiento del historial
  const motivoReagenda = (() => {
    if (!venta.OBSERVACIONES) return ''
    for (const linea of venta.OBSERVACIONES.split('\n')) {
      const m = linea.match(/Motivo:\s*(.+)/i)
      if (m) return m[1].trim().toUpperCase()
    }
    return ''
  })()
  // Texto de situación al pie del card — dinámico por gmEstado y estado
  const descripcionEstado =
    enProceso
      ? 'Placa EN PROCESO en registro de garantías — no se pueden realizar acciones'
      : estado === 'CITA_CONFIRMADA' && enCalificacion
      ? 'Cita confirmada — EN CALIFICACIÓN: Notaría puede registrar firma directamente'
      : estado === 'FIRMADO' && enCalificacion
      ? (!venta.GM_SOLICITADA
          ? 'Acta firmada — Notaría debe solicitar levantamiento de GM'
          : !venta.GM_LEVANTADA
          ? 'Acta firmada — GM solicitada, pendiente levantamiento por Legal'
          : 'Acta firmada — GM levantada, pendiente inscripción en RRPP')
      : estado === 'DOCS_OBSERVADOS'
      ? `Documentos observados${areaObs ? ' por ' + areaObs : ''} — Consultar directamente`
      : estado === 'CONTENIDO_OBSERVADO'
      ? 'Datos observados por Legal — Comercial debe corregir'
      : estado === 'PENDIENTE_REAGENDA'
      ? ('Notaría ordenó reagendar' + (motivoReagenda ? ' — ' + motivoReagenda : ''))
      : (ESTADO_DESCRIPCION[estado] || '')

  const [expandido,       setExpandido]       = useState(false)
  const [cargando,        setCargando]        = useState(false)
  const [agendaOpen,      setAgendaOpen]      = useState(false)
  const [obsOpen,         setObsOpen]         = useState(false)
  const [contObsOpen,     setContObsOpen]     = useState(false)
  const [fechaCita,       setFechaCita]       = useState('')
  const [horaCita,        setHoraCita]        = useState('')
  const [obsTexto,        setObsTexto]        = useState('')
  const [contObsTexto,    setContObsTexto]    = useState('')
  const [reagendarOpen, setReagendarOpen] = useState(false)
  const [reagendarMotivo, setReagendarMotivo] = useState('')
  const [msg,             setMsg]             = useState(null)
  const [subiendoBoleta,      setSubiendoBoleta]      = useState(false)
  const [subiendoSubsanacion, setSubiendoSubsanacion] = useState(false)
  // Edición de datos por Comercial (auto-detección o Legal-observado)
  const [editDatosOpen,  setEditDatosOpen]  = useState(false)
  const [editNombre,     setEditNombre]     = useState(venta.NOMBRE)
  const [editDni,        setEditDni]        = useState(venta.DNI)
  const [editTelefono,   setEditTelefono]   = useState(venta.TELEFONO)
  const [editSC,         setEditSC]         = useState(venta.SOCIEDAD_CONYUGAL || 'No')
  const [editNomConyuge, setEditNomConyuge] = useState(venta.NOMBRE_CONYUGE || '')
  const [editDniConyuge, setEditDniConyuge] = useState(venta.DNI_CONYUGE || '')
  const fileRef     = useRef(null)
  const fileRefSubs = useRef(null)

  const puedeAccion = (accion) => permisos.acciones.includes(accion)

  const puedeObservar = puedeAccion('observar_docs') && (
    permisos.estadosObservar === '*' || permisos.estadosObservar.includes(estado)
  )

  // ── Llamada a la API ───────────────────────────────────────
  async function llamarAPI(params) {
    if (!VS_URL) return setMsg({ tipo: 'err', texto: 'URL de script no configurada.' })
    setCargando(true)
    setMsg(null)
    try {
      const qs  = new URLSearchParams({ placa: venta.PLACA, ...params }).toString()
      const res = await fetch(`${VS_URL}?${qs}`, { cache: 'no-store' })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Error desconocido')
      setMsg({ tipo: 'ok', texto: 'Actualizado correctamente.' })
      setAgendaOpen(false)
      setObsOpen(false)
      setContObsOpen(false)
    setReagendarOpen(false)
    setReagendarMotivo('')
      setTimeout(() => { setMsg(null); onActualizar?.() }, 1200)
    } catch (e) {
      setMsg({ tipo: 'err', texto: e.message })
    } finally {
      setCargando(false)
    }
  }

  // ── Acciones ───────────────────────────────────────────────
  const confirmarANotaria = () => llamarAPI({ action: 'confirmar_a_notaria' })
  const confirmarCitaAct    = () => llamarAPI({ action: 'confirmar_cita' })
  const solicitarGM         = () => llamarAPI({ action: 'solicitar_gm' })
  const levantarGM          = () => llamarAPI({ action: 'levantar_gm' })
  const firmar              = () => llamarAPI({ action: 'firmar' })
  const inscribir           = () => llamarAPI({ action: 'inscribir' })
  const marcarSubsanado     = () => llamarAPI({ action: 'marcar_subsanado' })
  const confirmarSubsanacion = () => llamarAPI({ action: 'confirmar_subsanacion', area: AREA_NOMBRE[rol] || '' })
  // B.6 — Legal anula un expediente duplicado (desempate por placa + marca temporal)
  const anularExpediente = () => llamarAPI({ action: 'anular_expediente', row: venta._idx })

  const agendarCita = () => {
    if (!validarAnticipacionCita(fechaCita, horaCita)) return
    llamarAPI({ action: 'agendar_cita', fecha: fechaCita, hora: horaCita })
  }

  const enviarObservacion = () => {
    if (!obsTexto.trim()) return
    const area = AREA_NOMBRE[rol] || ''
    llamarAPI({ action: 'observar_docs', obs: obsTexto.trim(), area })
  }

  const enviarObsContenido = () => {
    if (!contObsTexto.trim()) return
    llamarAPI({ action: 'observar_contenido', obs: contObsTexto.trim() })
  }

  const reagendarAct = () => {
  if (!reagendarMotivo.trim()) return
  llamarAPI({ action: 'reagendar', motivo: reagendarMotivo.trim() })
  }

  const corregirContenido = () => {
    if (!editNombre.trim())
      return setMsg({ tipo: 'err', texto: 'El nombre no puede estar vacío.' })
    if (!soloDigitos(editDni))
      return setMsg({ tipo: 'err', texto: 'El DOI/DNI debe contener solo dígitos.' })
    if (!soloDigitos(editTelefono))
      return setMsg({ tipo: 'err', texto: 'El teléfono debe contener solo dígitos.' })
    if (editSC === 'Sí') {
      if (!editNomConyuge.trim())
        return setMsg({ tipo: 'err', texto: 'El nombre del cónyuge es requerido.' })
      if (!soloDigitos(editDniConyuge))
        return setMsg({ tipo: 'err', texto: 'El DOI del cónyuge debe contener solo dígitos.' })
    }
    llamarAPI({
      action:         'subsanar_contenido',
      nombre:         editNombre.trim(),
      dni:            editDni.trim(),
      telefono:       editTelefono.trim(),
      sc:             editSC,
      nombre_conyuge: editSC === 'Sí' ? editNomConyuge.trim() : '',
      dni_conyuge:    editSC === 'Sí' ? editDniConyuge.trim()  : '',
    })
  }

  const subirBoleta = async (file) => {
    if (!file || !VS_URL) return
    setSubiendoBoleta(true)
    setMsg(null)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = (e) => resolve(e.target.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      // text/plain = simple request → sin preflight CORS
      await fetch(VS_URL, {
        method:   'POST',
        mode:     'no-cors',
        headers:  { 'Content-Type': 'text/plain' },
        body:     JSON.stringify({
          action:      'subir_boleta',
          placa:       venta.PLACA,
          fileBase64:  base64,
          mimeType:    file.type,
        }),
      })
      setMsg({ tipo: 'ok', texto: 'Boleta enviada — se verá al próximo refresco.' })
      setTimeout(() => { setMsg(null); onActualizar?.() }, 3000)
    } catch (e) {
      setMsg({ tipo: 'err', texto: 'Error al subir: ' + e.message })
    } finally {
      setSubiendoBoleta(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const subirSubsanacion = async (file) => {
    if (!file || !VS_URL) return
    setSubiendoSubsanacion(true)
    setMsg(null)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = (e) => resolve(e.target.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      await fetch(VS_URL, {
        method:  'POST',
        mode:    'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body:    JSON.stringify({
          action:     'subir_subsanacion',
          placa:      venta.PLACA,
          fileBase64: base64,
          mimeType:   file.type,
        }),
      })
      setMsg({ tipo: 'ok', texto: 'Documento enviado — se verá al próximo refresco.' })
      setTimeout(() => { setMsg(null); onActualizar?.() }, 3000)
    } catch (e) {
      setMsg({ tipo: 'err', texto: 'Error al subir: ' + e.message })
    } finally {
      setSubiendoSubsanacion(false)
      if (fileRefSubs.current) fileRefSubs.current.value = ''
    }
  }

  const rangoValido        = validarRangoHorario(horaCita, fechaCita || null)
  const anticipacionValida = validarAnticipacionCita(fechaCita, horaCita)
  const reglaDiaAnterior   = validarReglaDiaAnterior(fechaCita, horaCita)
  const citaValida         = rangoValido && anticipacionValida && reglaDiaAnterior

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={{ background: 'white', borderRadius: 12, marginBottom: 10,
      border: '0.5px solid #D3D1C7', borderLeft: `4px solid ${cfg.borderBadge || '#D3D1C7'}`,
      overflow: 'hidden' }}>

      {/* Cabecera siempre visible */}
      <div onClick={() => setExpandido(v => !v)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 14px', cursor: 'pointer', userSelect: 'none' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: NAVY }}>{venta.PLACA}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              color: cfg.colorText, background: cfg.bgBadge, border: `1px solid ${cfg.borderBadge}` }}>
              {cfg.labelCorto}
            </span>
            {enProceso && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 20,
                color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA' }}>
                ⛔ EN PROCESO
              </span>
            )}
            {enCalificacion && !enProceso && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 20,
                color: '#7C3AED', background: '#F5F3FF', border: '1px solid #C4B5FD' }}>
                EN CALIFICACIÓN
              </span>
            )}
            {datosInvalidos && estado !== 'CONTENIDO_OBSERVADO' && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 20,
                color: '#5B21B6', background: '#EDE9FE', border: '1px solid #A78BFA' }}>
                Datos inválidos
              </span>
            )}
          </div>
          <span style={{ fontSize: 12, color: '#6B7280' }}>{venta.NOMBRE}</span>
          {descripcionEstado ? (
            <div style={{ fontSize: 11, color: cfg.colorText, marginTop: 5,
              fontWeight: 500, lineHeight: 1.4 }}>
              {descripcionEstado}
            </div>
          ) : null}
        </div>
        <span style={{ color: '#9CA3AF', fontSize: 18 }}>{expandido ? '▲' : '▼'}</span>
      </div>

      {/* Cuerpo expandido */}
      {expandido && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid #F3F4F6' }}>

          {/* Datos básicos */}
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
            <InfoRow label="DNI/CE"   value={venta.DNI   || '(vacío)'} warn={dniInvalido} />
            <InfoRow label="Teléfono" value={venta.TELEFONO || '(vacío)'} warn={telefonoInvalido} />
            {venta.FECHA_CITA && (
              <InfoRow label="Cita" value={`${venta.FECHA_CITA} ${venta.HORA_CITA || ''}`.trim()} />
            )}
            {venta.SIN_CITA && <InfoRow label="Sin cita" value="Sí — directo a firma" />}
            {dniInvalido && (
              <div style={{ gridColumn: '1/-1', fontSize: 11, color: '#5B21B6', fontWeight: 500 }}>
                DNI/CE inválido — debe contener solo dígitos
              </div>
            )}
            {telefonoInvalido && (
              <div style={{ gridColumn: '1/-1', fontSize: 11, color: '#5B21B6', fontWeight: 500 }}>
                Teléfono inválido — debe contener solo dígitos
              </div>
            )}
            {venta.OBSERVACION_DOCS && (
              <div style={{ gridColumn: '1/-1' }}>
                {areaObs
                  ? <InfoRow label={`Obs. por ${areaObs}`} value={textoObs} warn />
                  : <InfoRow label="Obs. docs" value={textoObs || venta.OBSERVACION_DOCS} warn />
                }
              </div>
            )}
            {venta.OBSERVACION_CONTENIDO && (
              <div style={{ gridColumn: '1/-1' }}>
                <InfoRow label="Obs. datos (LEGAL)" value={textoContObs} warn />
              </div>
            )}
          </div>

          {/* Documentos del comprador */}
          {permisos.verDocumentos && (
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <LinkDoc url={venta.PAGO_VEHICULO}   label="Pago vehículo"   />
              <LinkDoc url={venta.FOTO_DNI_ANV}    label="DNI Anverso"     />
              <LinkDoc url={venta.FOTO_DNI_REV}    label="DNI Reverso"     />
              <LinkDoc url={venta.PAGO_NOTARIALES} label="Pago notariales" />
              <LinkDoc url={venta.BOLETA_URL}       label="Boleta VS"        highlight={!!venta.BOLETA_URL} />
              <LinkDoc url={venta.SUBSANACION_URL}  label="Doc subsanado"    />
            </div>
          )}

          {/* Sociedad Conyugal — visible si aplica */}
          {venta.SOCIEDAD_CONYUGAL === 'Sí' && (
            <div style={{ marginTop: 10, background: '#FFF7ED', border: '1px solid #FED7AA',
              borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#92400E',
                textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Sociedad Conyugal
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px' }}>
                <InfoRow label="Cónyuge"   value={venta.NOMBRE_CONYUGE} />
                <InfoRow label="DNI/CE"    value={venta.DNI_CONYUGE} />
              </div>
              {permisos.verDocumentos && (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <LinkDoc url={venta.FOTO_DNI_CONYUGE_ANV} label="DNI Cónyuge Anv." />
                  <LinkDoc url={venta.FOTO_DNI_CONYUGE_REV} label="DNI Cónyuge Rev." />
                </div>
              )}
            </div>
          )}

          {/* Mensaje de feedback */}
          {msg && (
            <div style={{ marginTop: 10, padding: '7px 10px', borderRadius: 6, fontSize: 12,
              background: msg.tipo === 'ok' ? '#F0FDF4' : '#FEF2F2',
              color:      msg.tipo === 'ok' ? '#166534'  : '#991B1B',
              border: `1px solid ${msg.tipo === 'ok' ? '#86EFAC' : '#FECACA'}` }}>
              {msg.texto}
            </div>
          )}

          {/* Banner bloqueante — EN PROCESO */}
          {enProceso && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
              padding: '10px 12px', marginTop: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', marginBottom: 3 }}>
                ⛔ Proceso bloqueado — placa EN PROCESO
              </div>
              <div style={{ fontSize: 11, color: '#991B1B', lineHeight: 1.4 }}>
                La placa figura como EN PROCESO en el registro de garantías mobiliarias.
                No se pueden realizar acciones hasta que el estado sea actualizado.
              </div>
            </div>
          )}

          {/* B.6 — Placa duplicada en conflicto: se bloquean las acciones normales */}
          {enConflicto ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="alert-triangle" size={14} />Placa duplicada — expediente bloqueado
                </div>
                <div style={{ fontSize: 11, color: '#991B1B', lineHeight: 1.4, marginBottom: rol === 'legal' ? 8 : 0 }}>
                  {'Hay más de un expediente activo con esta placa. Compara los datos y, si eres Legal, anula el que no corresponda.'}
                </div>
                {rol === 'legal' && (
                  <Btn onClick={anularExpediente} disabled={cargando} color="#DC2626" icon="x">
                    {cargando ? 'Anulando…' : 'Anular este expediente'}
                  </Btn>
                )}
              </div>
            </div>
          ) : (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* COMERCIAL — corrección de datos:
                  · Auto-detección: DOI o teléfono inválidos → acceso directo sin Legal
                  · Legal-observado: estado CONTENIDO_OBSERVADO → también muestra la observación */}
            {!rol && (datosInvalidos || estado === 'CONTENIDO_OBSERVADO') && (
              <div>
                {/* Cabecera con botón para abrir/cerrar */}
                {!editDatosOpen ? (
                  <Btn
                    onClick={() => setEditDatosOpen(true)}
                    color="#5B21B6"
                  >
                    {estado === 'CONTENIDO_OBSERVADO'
                      ? 'Corregir datos — solicitado por Legal'
                      : 'Corregir datos inválidos'}
                  </Btn>
                ) : (
                  <div style={{ background: '#F5F3FF', border: '1px solid #A78BFA',
                    borderRadius: 8, padding: 12 }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: 8 }}>
                      <p style={{ fontSize: 12, color: '#5B21B6', margin: 0, fontWeight: 700 }}>
                        Corrección de datos del expediente
                      </p>
                      <button onClick={() => setEditDatosOpen(false)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer',
                          color: '#9CA3AF', fontSize: 16, padding: 0, lineHeight: 1 }}>✕</button>
                    </div>

                    {/* Observación de Legal si existe */}
                    {textoContObs && (
                      <p style={{ fontSize: 11, color: '#374151', margin: '0 0 10px',
                        background: '#EDE9FE', borderRadius: 4, padding: '5px 8px',
                        border: '1px solid #C4B5FD' }}>
                        Legal indica: {textoContObs}
                      </p>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                      {/* Nombre */}
                      <div>
                        <label style={{ display: 'block', fontSize: 10, color: '#6B7280',
                          textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>
                          Nombre completo
                        </label>
                        <input value={editNombre}
                          onChange={e => setEditNombre(e.target.value)}
                          placeholder="Nombre completo del comprador"
                          style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                      </div>

                      {/* DOI */}
                      <div>
                        <label style={{ display: 'block', fontSize: 10, color: '#6B7280',
                          textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>
                          DOI / DNI / CE <span style={{ color: '#DC2626', textTransform: 'none' }}>(solo dígitos)</span>
                        </label>
                        <input value={editDni}
                          onChange={e => setEditDni(e.target.value.replace(/\D/g, ''))}
                          placeholder="Ej: 12345678"
                          inputMode="numeric"
                          style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                      </div>

                      {/* Teléfono */}
                      <div>
                        <label style={{ display: 'block', fontSize: 10, color: '#6B7280',
                          textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>
                          Teléfono <span style={{ color: '#DC2626', textTransform: 'none' }}>(solo dígitos)</span>
                        </label>
                        <input value={editTelefono}
                          onChange={e => setEditTelefono(e.target.value.replace(/\D/g, ''))}
                          placeholder="Ej: 987654321"
                          inputMode="numeric"
                          style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                      </div>

                      {/* Sociedad Conyugal */}
                      <div>
                        <label style={{ display: 'block', fontSize: 10, color: '#6B7280',
                          textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>
                          ¿El comprador está casado?
                        </label>
                        <select value={editSC} onChange={e => setEditSC(e.target.value)}
                          style={{ ...inputStyle, width: '100%', boxSizing: 'border-box',
                            background: 'white' }}>
                          <option value="No">No</option>
                          <option value="Sí">Sí</option>
                        </select>
                      </div>

                      {/* Campos del cónyuge — solo si SC = Sí */}
                      {editSC === 'Sí' && (
                        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA',
                          borderRadius: 6, padding: 10, display: 'flex',
                          flexDirection: 'column', gap: 6 }}>
                          <p style={{ fontSize: 10, color: '#92400E', margin: 0,
                            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Datos del cónyuge
                          </p>
                          <div>
                            <label style={{ display: 'block', fontSize: 10, color: '#6B7280',
                              textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>
                              Nombre del cónyuge
                            </label>
                            <input value={editNomConyuge}
                              onChange={e => setEditNomConyuge(e.target.value)}
                              placeholder="Nombre completo del cónyuge"
                              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 10, color: '#6B7280',
                              textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>
                              DOI / DNI del cónyuge <span style={{ color: '#DC2626', textTransform: 'none' }}>(solo dígitos)</span>
                            </label>
                            <input value={editDniConyuge}
                              onChange={e => setEditDniConyuge(e.target.value.replace(/\D/g, ''))}
                              placeholder="Ej: 87654321"
                              inputMode="numeric"
                              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Botón de envío */}
                    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                      <Btn
                        onClick={corregirContenido}
                        disabled={
                          !editNombre.trim() ||
                          !soloDigitos(editDni) ||
                          !soloDigitos(editTelefono) ||
                          (editSC === 'Sí' && (!editNomConyuge.trim() || !soloDigitos(editDniConyuge))) ||
                          cargando
                        }
                        color="#5B21B6"
                      >
                        {cargando ? 'Guardando…' : 'Enviar corrección'}
                      </Btn>
                      <Btn onClick={() => setEditDatosOpen(false)} color="#6B7280" small outline>Cancelar</Btn>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* COMERCIAL — subir documento subsanado en DOCS_OBSERVADOS */}
            {!rol && estado === 'DOCS_OBSERVADOS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Btn onClick={() => fileRefSubs.current?.click()} disabled={subiendoSubsanacion} color="#0F766E">
                  {subiendoSubsanacion ? 'Subiendo…' : venta.SUBSANACION_URL ? 'Reemplazar doc subsanado' : 'Subir documento subsanado'}
                </Btn>
                <input
                  ref={fileRefSubs}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) subirSubsanacion(e.target.files[0]) }}
                />
                {venta.SUBSANACION_URL && (
                  <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>
                    Documento ya enviado — el área revisará y confirmará.
                  </p>
                )}
              </div>
            )}

            {/* COMERCIAL — agendar/reagendar en CONFIRMADO o PENDIENTE_REAGENDA */}
            {!rol && (estado === 'CONFIRMADO' || estado === 'PENDIENTE_REAGENDA') && (
              <>
                {!agendaOpen ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn onClick={() => setAgendaOpen(true)} color="#2563EB">
                      {estado === 'PENDIENTE_REAGENDA' ? 'Reagendar cita' : '📅 Agendar cita'}
                    </Btn>
                  </div>
                ) : (
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0',
                    borderRadius: 8, padding: 10 }}>
                    <p style={{ fontSize: 12, color: '#374151', margin: '0 0 8px', fontWeight: 600 }}>
                      {estado === 'PENDIENTE_REAGENDA' ? 'Reagendar cita' : 'Agendar cita'} — mínimo 1 hora y 30 minutos de anticipación
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input type="date" value={fechaCita} onChange={e => setFechaCita(e.target.value)}
                        style={inputStyle} />
                      <input type="time" value={horaCita} onChange={e => setHoraCita(e.target.value)}
                        style={inputStyle} />
                    </div>
                    {fechaCita && horaCita && !rangoValido && (
                      <p style={{ fontSize: 11, color: '#DC2626', margin: '0 0 6px' }}>
                        Horario no permitido. Citas solo de 09:15–12:30 y 14:15–16:30.
                      </p>
                    )}
                    {fechaCita && horaCita && rangoValido && !anticipacionValida && (
                      <p style={{ fontSize: 11, color: '#DC2626', margin: '0 0 6px' }}>
                        La cita debe agendarse con al menos 1 hora y 30 minutos de anticipación.
                      </p>
                    )}
                    {fechaCita && horaCita && rangoValido && anticipacionValida && !reglaDiaAnterior && (
                      <p style={{ fontSize: 11, color: '#DC2626', margin: '0 0 6px' }}>
                        Fuera de horario: para citas del proximo dia habil solo se permiten horarios desde las 10:00.
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn onClick={agendarCita} disabled={!citaValida || cargando} color="#2563EB" icon="check">
                        Confirmar
                      </Btn>
                      <Btn onClick={() => setAgendaOpen(false)} color="#6B7280" small outline>Cancelar</Btn>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TESORERÍA */}
            {rol === 'tesoreria' && !enProceso && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {estado === 'INGRESADO' && puedeAccion('confirmar_a_notaria') && (
                  <Btn onClick={confirmarANotaria} disabled={cargando} color="#0F766E" icon="check">
                    Confirmar a Notaría
                  </Btn>
                )}
                {puedeObservar && !obsOpen && (
                  <Btn onClick={() => setObsOpen(true)} color="#9D174D" small outline icon="eye">Observar docs</Btn>
                )}
                {estado === 'DOCS_OBSERVADOS' && puedeAccion('marcar_subsanado') && (
                  <Btn onClick={marcarSubsanado} disabled={cargando} color="#0F766E" small>Docs subsanados</Btn>
                )}
                {estado === 'DOCS_SUBSANADOS' && areaObs === 'TESORERÍA' && puedeAccion('confirmar_subsanacion') && (
                  <Btn onClick={confirmarSubsanacion} disabled={cargando} color="#065F46">
                    Confirmar subsanación
                  </Btn>
                )}
                {/* Boleta — siempre disponible para Tesorería */}
                <Btn onClick={() => fileRef.current?.click()} disabled={subiendoBoleta} color="#6D28D9" small outline icon="upload">
                  {subiendoBoleta ? 'Subiendo…' : venta.BOLETA_URL ? 'Reemplazar boleta' : 'Subir boleta'}
                </Btn>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) subirBoleta(e.target.files[0]) }}
                />
              </div>
            )}

            {/* NOTARÍA */}
            {rol === 'notaria' && !enProceso && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {estado === 'EN_CITA' && puedeAccion('confirmar_cita') && (
                  <div>
                    <Btn onClick={confirmarCitaAct} disabled={cargando} color="#0F766E" icon="check">
                      Confirmar cita
                    </Btn>
                  </div>
                )}            {puedeAccion('reagendar') && (estado === 'EN_CITA' || estado === 'CITA_CONFIRMADA' || estado === 'DOCS_OBSERVADOS') && !reagendarOpen && (
              <Btn onClick={() => setReagendarOpen(true)} color="#D97706" small outline icon="refresh">Reagendar cita</Btn>
            )}

                {/* Solicitar GM:
                    · Flujo normal: solo en CITA_CONFIRMADA
                    · EN CALIFICACIÓN: en CITA_CONFIRMADA (coexiste con Firmado) y en FIRMADO */}
                {puedeAccion('solicitar_gm') && !venta.GM_SOLICITADA && (
                  (estado === 'CITA_CONFIRMADA') ||
                  (estado === 'FIRMADO' && enCalificacion)
                ) && (
                  <Btn onClick={solicitarGM} disabled={cargando} color="#7C3AED" small icon="alert-triangle">
                    Solicitar levant. GM
                  </Btn>
                )}
                {/* Registrar firma:
                    · Flujo normal: solo cuando GM_LEVANTADA
                    · EN CALIFICACIÓN: desde CITA_CONFIRMADA, GM_SOLICITADA o GM_LEVANTADA
                      (coexiste con Solicitar GM en CITA_CONFIRMADA) */}
                {puedeAccion('firmar') && !venta.FECHA_FIRMA && (
                  (!enCalificacion && estado === 'GM_LEVANTADA') ||
                  (enCalificacion && (
                    estado === 'CITA_CONFIRMADA' ||
                    estado === 'GM_SOLICITADA'  ||
                    estado === 'GM_LEVANTADA'
                  ))
                ) && (
                  <Btn onClick={firmar} disabled={cargando} color="#1D4ED8" small icon="check">
                    Registrar firma
                  </Btn>
                )}
                {puedeObservar && !obsOpen && (
                  <Btn onClick={() => setObsOpen(true)} color="#9D174D" small outline icon="eye">Observar docs</Btn>
                )}
                {estado === 'DOCS_OBSERVADOS' && puedeAccion('marcar_subsanado') && (
                  <Btn onClick={marcarSubsanado} disabled={cargando} color="#0F766E" small>Docs subsanados</Btn>
                )}
                {estado === 'DOCS_SUBSANADOS' && areaObs === 'NOTARÍA' && puedeAccion('confirmar_subsanacion') && (
                  <Btn onClick={confirmarSubsanacion} disabled={cargando} color="#065F46">
                    Confirmar subsanación
                  </Btn>
                )}
            {reagendarOpen && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: 10, width: '100%', marginTop: 4 }}>
                <p style={{ fontSize: 12, color: '#92400E', margin: '0 0 8px', fontWeight: 600 }}>Reagendamiento de cita</p>
                <textarea value={reagendarMotivo} onChange={e => setReagendarMotivo(e.target.value)}
                  placeholder="Describe el motivo del reagendamiento..." rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #FCD34D', borderRadius: 6, padding: '7px 10px', fontSize: 12, resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <Btn onClick={reagendarAct} disabled={!reagendarMotivo.trim() || cargando} color="#D97706">Guardar</Btn>
                  <Btn onClick={() => { setReagendarOpen(false); setReagendarMotivo('') }} color="#6B7280" small outline>Cancelar</Btn>
                </div>
              </div>
            )}
              </div>
            )}

            {/* LEGAL */}
            {rol === 'legal' && !enProceso && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {/* GM pendiente de levantar — Legal responde con este botón */}
                {venta.GM_SOLICITADA && !venta.GM_LEVANTADA && puedeAccion('levantar_gm') && (
                  <Btn onClick={levantarGM} disabled={cargando} color="#065F46" icon="check">
                    GM Levantada
                  </Btn>
                )}
                {/* Inscripción en RRPP — Legal inscribe luego de que Notaría firmó */}
                {venta.FECHA_FIRMA && !venta.FECHA_INSCRIPCION && puedeAccion('inscribir') && (
                  <Btn onClick={inscribir} disabled={cargando} color="#1D4ED8" small icon="forms">Inscribir RRPP</Btn>
                )}
                {puedeObservar && !obsOpen && (
                  <Btn onClick={() => setObsOpen(true)} color="#9D174D" small outline icon="eye">Observar docs</Btn>
                )}
                {estado === 'DOCS_OBSERVADOS' && puedeAccion('marcar_subsanado') && (
                  <Btn onClick={marcarSubsanado} disabled={cargando} color="#0F766E" small>Docs subsanados</Btn>
                )}
                {estado === 'DOCS_SUBSANADOS' && areaObs === 'LEGAL' && puedeAccion('confirmar_subsanacion') && (
                  <Btn onClick={confirmarSubsanacion} disabled={cargando} color="#065F46">
                    Confirmar subsanación
                  </Btn>
                )}
                {/* Observar contenido — disponible cuando no hay observación activa */}
                {estado !== 'CONTENIDO_OBSERVADO' && !contObsOpen && (
                  <Btn
                    onClick={() => {
                      const issues = []
                      if (dniInvalido)      issues.push(`DNI/CE "${venta.DNI || '(vacío)'}" no es válido — solo dígitos`)
                      if (telefonoInvalido) issues.push(`Teléfono "${venta.TELEFONO || '(vacío)'}" no es válido — solo dígitos`)
                      setContObsTexto(issues.join('. '))
                      setContObsOpen(true)
                    }}
                    color="#5B21B6" small
                  >
                    {datosInvalidos ? 'Observar datos inválidos' : '📝 Observar contenido'}
                  </Btn>
                )}
              </div>
            )}

            {/* Modal de observación de documentos */}
            {obsOpen && (
              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA',
                borderRadius: 8, padding: 10 }}>
                <p style={{ fontSize: 12, color: '#92400E', margin: '0 0 8px', fontWeight: 600 }}>
                  Observación de documentos
                </p>
                <textarea value={obsTexto} onChange={e => setObsTexto(e.target.value)}
                  placeholder="Describe el problema con los documentos..."
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #FCD34D',
                    borderRadius: 6, padding: '7px 10px', fontSize: 12, resize: 'vertical', outline: 'none' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <Btn onClick={enviarObservacion} disabled={!obsTexto.trim() || cargando} color="#9D174D">
                    Guardar
                  </Btn>
                  <Btn onClick={() => setObsOpen(false)} color="#6B7280" small outline>Cancelar</Btn>
                </div>
              </div>
            )}

            {/* Modal de observación de contenido — solo Legal */}
            {contObsOpen && (
              <div style={{ background: '#F5F3FF', border: '1px solid #A78BFA',
                borderRadius: 8, padding: 10 }}>
                <p style={{ fontSize: 12, color: '#5B21B6', margin: '0 0 4px', fontWeight: 700 }}>
                  Observación de datos del formulario
                </p>
                <p style={{ fontSize: 11, color: '#6B7280', margin: '0 0 8px' }}>
                  Comercial podrá corregir Nombre, DNI y Teléfono una vez notificado.
                </p>
                <textarea value={contObsTexto} onChange={e => setContObsTexto(e.target.value)}
                  placeholder="Ej: DNI vacío, teléfono contiene letras, nombre incompleto…"
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #C4B5FD',
                    borderRadius: 6, padding: '7px 10px', fontSize: 12, resize: 'vertical', outline: 'none' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <Btn onClick={enviarObsContenido} disabled={!contObsTexto.trim() || cargando} color="#5B21B6">
                    Registrar observación
                  </Btn>
                  <Btn onClick={() => setContObsOpen(false)} color="#6B7280" small outline>Cancelar</Btn>
                </div>
              </div>
            )}

          </div>
          )}
        </div>
      )}
    </div>
  )
}
