export function formatTime (date) {
  if (typeof(date) === "number") {
    date *= 1000
    date = new Date(date)
  }
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  const t1 = [year, month, day].map(formatNumber).join('-')
  const t2 = [hour, minute, second].map(formatNumber).join(':')

  return `${t1} ${t2}`
}

export function formatTime2 (date) {
  const minute = date.getMinutes()
  const second = date.getSeconds()

  const t2 = [minute, second].map(formatNumber).join(':')

  return `${t2}`
}
export function formatTime3 (date) {
  if (typeof(date) === "number") {
    date *= 1000
    date = new Date(date)
  }
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  const t1 = [year, month, day].map(formatNumber).join('-')

  return `${t1}`
}

export function getDailyMinutesRange() {
  let min = new Date(new Date().toLocaleDateString()).getTime() / 1000
  let max = min + 86400
  let range = []
  let now = min
  while (now <= max) {
    range.push(now)
    now += 60
  }
  return range
}