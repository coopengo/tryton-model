const t = require('tap')
const _ = require('lodash')
const Session = require('tryton-session')
const model = require('..')
const data = require('./.data')

model.init(Session)
let session = new Session(data.server, data.database)
let cache

const start = async () => {
  await session.start(data.username, {password: data.password})
}

const access = async () => {
  t.ok(_.isPlainObject(session.access))
  t.ok(session.access['ir.model'])
  const sample = _.sample(session.access)
  t.ok(_.isPlainObject(sample))
  t.ok(!_.isNil(sample.create))
  t.ok(!_.isNil(sample.read))
  t.ok(!_.isNil(sample.write))
  t.ok(!_.isNil(sample.delete))
}

const check = async () => {
  t.ok(_.isPlainObject(session.models))
  t.ok(session.models['ir.model'])
  const m = session.models['ir.model']
  t.ok(m instanceof model.Model)
  t.ok(_.isPlainObject(session.modules))
  t.ok(session.modules.ir === true)
  t.ok(session.modules.res === true)
}

const models = async () => {
  await model.Model.get(session, 'ir.model')
  check()
}

const pack = async () => {
  cache = await session.pack()
  t.isa(cache, 'string')
}

const unpack = async () => {
  session = await Session.unpack(cache)
  access()
  check()
}

const stop = async () => {
  await session.stop()
}

t.test(start)
  .then(access)
  .then(models)
  .then(pack)
  .then(unpack)
  .then(stop)
  .catch(t.threw)
