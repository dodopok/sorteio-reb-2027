export const CONSENT_VERSION = '2026-10-03-v1'
export const EVENT_DATE = '3 de outubro de 2026'
export const SITE_URL = 'https://sorteio.redeepiscopalbrasileira.com.br'

export const prizes = [
  { id: 1, title: 'Toda a Escritura é…', author: 'Michael F. Bird', short: 'Sete perspectivas que todo cristão deveria ter sobre a Bíblia.', cover: 'scripture' },
  { id: 2, title: 'Religião estranha', author: 'Nijay Gupta', short: 'Como os primeiros cristãos eram esquisitos, perigosos e cativantes.', cover: 'religion' },
  { id: 3, title: 'Jesus e os poderes', author: 'N. T. Wright & Michael F. Bird', short: 'O Reino de Deus em um mundo de democracias em ruínas.', cover: 'powers' },
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
  status: RaffleStatus
  total: number
  eligible: number
  winners: Winner[]
  contacts: { drawId: string; name: string; email: string; whatsapp: string; prizeId: number }[]
}
