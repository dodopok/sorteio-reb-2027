import postgres from 'postgres'

let client: ReturnType<typeof postgres> | undefined
export function db() {
  const url = useRuntimeConfig().databaseUrl
  if (!url) throw createError({ statusCode: 503, statusMessage: 'O cadastro estará disponível em breve. Tente novamente em instantes.' })
  client ??= postgres(url, { max: 10, prepare: false, idle_timeout: 20, connect_timeout: 8, connection: { statement_timeout: 10000 }, onnotice: () => {} })
  return client
}

export function databaseError(error: unknown): never {
  const code = (error as { code?: string }).code
  const messages: Record<string, [number, string]> = {
    RE001: [409, 'As inscrições estão encerradas.'],
    RE002: [409, 'Encerre as inscrições antes de sortear.'],
    RE003: [409, 'Todos os prêmios já foram sorteados.'],
    RE004: [409, 'Não há participantes disponíveis para este sorteio.'],
    RE005: [409, 'O sorteio já começou. As inscrições não podem ser reabertas.'],
    RE006: [409, 'São necessários pelo menos quatro participantes para encerrar.'],
    RE007: [409, 'Este prêmio já foi sorteado em outra tela. Atualize para recuperar o resultado.'],
    RE008: [503, 'Tente novamente para concluir o sorteio.'],
    RE009: [409, 'Este sorteio foi reiniciado. Atualize a página para continuar.'],
    RE010: [409, 'Os dados mudaram desde a confirmação. Atualize o painel e tente novamente.'],
  }
  if (code && messages[code]) {
    const [statusCode, statusMessage] = messages[code]
    throw createError({ statusCode, statusMessage })
  }
  // Never send SQL, connection strings or submitted data to the response or logs.
  throw createError({ statusCode: 503, statusMessage: 'Não foi possível concluir agora. Tente novamente em instantes.' })
}
