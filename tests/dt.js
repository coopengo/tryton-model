const t = require('tap')
const Session = require('tryton-session')
const model = require('..')
const data = require('./.data')

model.init(Session)
const session = new Session(data.server, data.database)

const start = async () => {
  await session.start(data.username, {password: data.password})
}

const test = async () => {
  const group = await model.Group.search(session, 'ir.cron', {})
  const rec = group.first()
  if (!rec) {
    return
  }
  await rec.read()
  const dt = rec.get('create_date', {
    inst: false
  })
  t.match(dt, /\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d.\d\d\d/)
}

const stop = async () => {
  await session.stop()
}

t.test(start)
  .then(test)
  .then(stop)
  .catch(t.threw)
