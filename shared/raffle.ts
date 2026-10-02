export const CONSENT_VERSION = '2026-10-03-v3'
// Both versions include explicit consent to show first names in the animation.
export const ANIMATION_CONSENT_VERSIONS = ['2026-10-03-v2', CONSENT_VERSION] as const
export const EVENT_DATE = '3 de outubro de 2026'
export const SITE_URL = 'https://sorteio.redeepiscopalbrasileira.com.br'

export const prizes = [
  { id: 1, kind: 'book', title: 'Toda a Escritura é…', author: 'Michael F. Bird', short: 'Sete perspectivas que todo cristão deveria ter sobre a Bíblia.', cover: 'scripture', shipping: 'Thomas Nelson Brasil' },
  { id: 2, kind: 'book', title: 'Religião estranha', author: 'Nijay Gupta', short: 'Como os primeiros cristãos eram esquisitos, perigosos e cativantes.', cover: 'religion', shipping: 'Thomas Nelson Brasil' },
  { id: 3, kind: 'book', title: 'Jesus e os poderes', author: 'N. T. Wright & Michael F. Bird', short: 'O Reino de Deus em um mundo de democracias em ruínas.', cover: 'powers', shipping: 'Thomas Nelson Brasil' },
  { id: 4, kind: 'kit', title: 'Kit Anglicano', author: 'Oferecido pela REB', short: 'Livro, caneca e um item surpresa.', cover: 'anglican-kit', shipping: 'Rede Episcopal Brasileira', contents: ['O Caminho Anglicano, de Thomas McKenzie', 'Caneca “Seja anglicano gostoso demais”', 'Um item surpresa'] },
] as const

export type RaffleStatus = 'draft' | 'open' | 'closed'
export interface Winner {
  id: string
  prizeId: number
  name: string
  drawnAt: string
  eligibleCount: number
  poolHash: string
}
export interface Dashboard {
  generation: number
  status: RaffleStatus
  total: number
  eligible: number
  winners: Winner[]
  contacts: { drawId: string; name: string; email: string; whatsapp: string; prizeId: number }[]
}
export interface DrawResult extends Winner {
  animationNames: string[]
}
