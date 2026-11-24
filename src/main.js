import './style.css'
import { buildSvg, svgToPng } from './qr.js'
import { contrastWarning } from './scan.js'

const KEY = 'qr-dinamico'
const $ = id => document.getElementById(id)
const form = $('form')
const url = $('url')
const preview = $('preview')

let editingId = null
let logo = null // data URL del logo actual
let seq = 0 // evita que una vista previa vieja pise a una nueva
let previewUrl = null

const load = () => JSON.parse(localStorage.getItem(KEY) || '[]')

function store(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
    return true
  } catch {
    alert('No se pudo guardar: el almacenamiento del navegador está lleno. Usa un logo más liviano o borra QR que no uses.')
    return false
  }
}

function readForm() {
  const f = Object.fromEntries(new FormData(form))
  return { name: f.name.trim(), url: f.url.trim(), fg: f.fg, bg: f.bg, dots: f.dots, corners: f.corners, logo }
}

function fill(d) {
  for (const k of ['name', 'url', 'fg', 'bg', 'dots', 'corners']) form.elements[k].value = d[k]
  logo = d.logo
  checkUrl()
  showLogo()
  render()
}

function setEditing(id) {
  editingId = id
  $('form-title').textContent = id ? `Editando: ${readForm().name}` : 'Nuevo QR'
}

function checkUrl() {
  url.setCustomValidity('')
  if (url.validity.typeMismatch || url.validity.patternMismatch) url.setCustomValidity($('url-error').textContent)
  // El mensaje de error solo se anuncia mientras se ve (tras interactuar con el campo).
  const shown = url.matches(':user-invalid')
  url.setAttribute('aria-describedby', shown ? 'url-hint url-error' : 'url-hint')
  url.toggleAttribute('aria-invalid', shown)
}

function showLogo() {
  $('logo-status').textContent = logo ? 'Logo cargado: se usa corrección de errores H.' : 'Sin logo.'
  $('remove-logo').hidden = !logo
}

async function render() {
  const id = ++seq
  const d = readForm()
  $('warning').textContent = contrastWarning(d.fg, d.bg)
  const empty = $('preview-empty')
  if (!url.validity.valid) {
    preview.hidden = true
    empty.hidden = false
    empty.textContent = 'Escribe una URL https:// para ver la vista previa.'
    return
  }
  try {
    const svg = await buildSvg(d)
    if (id !== seq) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    previewUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    preview.src = previewUrl
    preview.hidden = false
    empty.hidden = true
  } catch (err) {
    if (id !== seq) return
    preview.hidden = true
    empty.hidden = false
    empty.textContent = `No se pudo generar el QR: ${err.message || err}`
  }
}

async function download(d, ext) {
  try {
    const svg = await buildSvg(d)
    const blob = ext === 'svg' ? new Blob([svg], { type: 'image/svg+xml' }) : await svgToPng(svg)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${d.name.replace(/[^\p{L}\p{N}_-]+/gu, '-') || 'qr'}.${ext}`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  } catch (err) {
    $('status').textContent = `No se pudo descargar: ${err.message || err}`
  }
}

function renderList() {
  const list = load()
  $('empty').hidden = list.length > 0
  $('list').replaceChildren(...list.map(d => {
    const li = $('item').content.firstElementChild.cloneNode(true)
    li.dataset.id = d.id
    li.querySelector('.name').textContent = d.name
    li.querySelector('.url').textContent = d.url
    buildSvg(d).then(svg => { li.querySelector('.thumb').src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) })
    return li
  }))
}

form.addEventListener('input', () => {
  if (editingId) setEditing(editingId)
  checkUrl()
  render()
})
form.addEventListener('focusout', checkUrl)

form.addEventListener('submit', e => {
  e.preventDefault()
  const list = load()
  const d = { ...readForm(), id: editingId || crypto.randomUUID(), updatedAt: Date.now() }
  const i = list.findIndex(x => x.id === d.id)
  if (i >= 0) list[i] = d
  else list.unshift(d)
  if (!store(list)) return
  setEditing(d.id)
  $('status').textContent = `Guardado: ${d.name}`
  renderList()
})

$('new').addEventListener('click', () => {
  form.reset()
  logo = null
  setEditing(null)
  $('status').textContent = ''
  checkUrl()
  showLogo()
  render()
  form.elements.name.focus()
})

$('logo-file').addEventListener('change', e => {
  const file = e.target.files[0]
  e.target.value = '' // permite volver a elegir el mismo archivo
  if (!file) return
  if (!['image/png', 'image/svg+xml'].includes(file.type)) {
    alert('El logo debe ser PNG o SVG.')
    return
  }
  const reader = new FileReader()
  reader.onload = () => { logo = reader.result; showLogo(); render() }
  reader.readAsDataURL(file)
})

$('remove-logo').addEventListener('click', () => { logo = null; showLogo(); render() })

for (const ext of ['svg', 'png']) {
  $(`dl-${ext}`).addEventListener('click', () => { if (form.reportValidity()) download(readForm(), ext) })
}

$('list').addEventListener('click', e => {
  const btn = e.target.closest('button')
  if (!btn) return
  const id = btn.closest('li').dataset.id
  const list = load()
  const d = list.find(x => x.id === id)
  const act = btn.dataset.act
  if (act === 'edit') {
    fill(d)
    setEditing(id)
    $('status').textContent = ''
    form.elements.name.focus()
  } else if (act === 'dup') {
    const copy = { ...d, id: crypto.randomUUID(), name: `${d.name} (copia)`, updatedAt: Date.now() }
    list.unshift(copy)
    if (!store(list)) return
    fill(copy)
    setEditing(copy.id)
    $('status').textContent = `Duplicado: ${copy.name}`
    renderList()
  } else if (act === 'svg' || act === 'png') {
    download(d, act)
  } else if (act === 'del' && confirm(`¿Borrar "${d.name}"?`)) {
    store(list.filter(x => x.id !== id))
    if (editingId === id) setEditing(null)
    renderList()
  }
})

showLogo()
renderList()
render()
