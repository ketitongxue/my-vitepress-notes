export function formatLocalTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function startLocalClock(update, schedule = setInterval, clear = clearInterval) {
  update()
  const intervalId = schedule(update, 60000)
  return () => clear(intervalId)
}
