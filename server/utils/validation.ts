import { z } from 'zod'

export function normalizeWhatsapp(input: string) {
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length === 13) digits = digits.slice(2)
  const ddds = new Set(['11','12','13','14','15','16','17','18','19','21','22','24','27','28','31','32','33','34','35','37','38','41','42','43','44','45','46','47','48','49','51','53','54','55','61','62','63','64','65','66','67','68','69','71','73','74','75','77','79','81','82','83','84','85','86','87','88','89','91','92','93','94','95','96','97','98','99'])
  if (!/^\d{2}9\d{8}$/.test(digits) || !ddds.has(digits.slice(0, 2)) || /^(\d)\1{8}$/.test(digits.slice(2))) return ''
  return '+55' + digits
}

export const registrationSchema = z.object({
  name: z.string().max(160).transform(v => v.normalize('NFKC').replace(/\s+/g, ' ').trim()).pipe(
    z.string().min(3).max(100).regex(/^[\p{L}\p{M} .’'-]+$/u).refine(v => v.split(' ').filter(Boolean).length >= 2, 'Informe nome e sobrenome.')),
  email: z.string().max(254).trim().toLowerCase().pipe(z.email()),
  whatsapp: z.string().max(30).transform(normalizeWhatsapp).refine(Boolean),
  adult: z.literal(true),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
  turnstileToken: z.string().max(2048).default(''),
})
