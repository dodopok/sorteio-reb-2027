export default defineEventHandler(async event => {
  assertOrigin(event)
  await endSession(event)
  return { ok: true }
})
