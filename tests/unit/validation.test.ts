import { describe, expect, it } from 'vitest'
import { normalizeWhatsapp, registrationSchema } from '../../server/utils/validation'

describe('validação de inscrição', () => {
  const valid = { name: 'Ana da Conceição', email: 'ANA@EXAMPLE.COM', whatsapp: '(11) 98765-4321', adult: true, consent: true, website: '' }
  it('normaliza contatos e nomes com acentos sem perder informação', () => {
    const result = registrationSchema.parse(valid)
    expect(result.email).toBe('ana@example.com')
    expect(result.whatsapp).toBe('+5511987654321')
    expect(result.name).toBe('Ana da Conceição')
    expect(normalizeWhatsapp('+55 11 98765-4321')).toBe(result.whatsapp)
  })
  it.each(['1198765432', '(00) 98765-4321', '11 11111-1111', '11 99999-9999', 'abc'])('rejeita celular inválido: %s', value => { expect(normalizeWhatsapp(value)).toBe('') })
  it.each([{ adult: false }, { consent: false }, { name: 'Ana' }, { name: '<script>alert(1)</script>' }, { email: 'não-é-email' }, { website: 'bot.example' }])('bloqueia entradas inválidas ou sem consentimento %j', override => { expect(registrationSchema.safeParse({ ...valid, ...override }).success).toBe(false) })
})
