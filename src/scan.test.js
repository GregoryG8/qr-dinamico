import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contrastRatio, contrastWarning } from './scan.js'

test('contraste negro sobre blanco es 21:1', () => {
  assert.equal(Math.round(contrastRatio('#000000', '#ffffff')), 21)
})

test('sin aviso para QR oscuro sobre fondo claro', () => {
  assert.equal(contrastWarning('#1a1a1a', '#ffffff'), '')
})

test('avisa contraste bajo (gris claro sobre blanco)', () => {
  assert.match(contrastWarning('#bbbbbb', '#ffffff'), /contraste bajo/i)
})

test('avisa QR invertido (claro sobre oscuro) aunque el contraste sea alto', () => {
  assert.match(contrastWarning('#ffffff', '#000000'), /más claro que el fondo/i)
})
