const t = require('tap')
const _ = require('lodash')
const Session = require('tryton-session')
const model = require('..')
const data = require('./.data')

model.init(Session)
const session = new Session(data.server, data.database)
let users

const start = async () => {
  await session.start(data.username, {password: data.password})
}

const count = async () => {
  const c = await model.Group.count(session, 'res.user')
  t.isa(c, 'number')
}

const search = async () => {
  users = await model.Group.search(session, 'res.user', {
    limit: 10
  })
  users.each((user) => {
    t.ok(user instanceof model.Record)
    t.isa(user.id, 'number')
  })
}

const read = async () => {
  await users.read('*')
  const names = users.map((user) => user.get('name', {
    inst: false
  }))
  _.each(names, (name) => t.isa(name, 'string'))
  const myUsers = model.Group.group(session, users.map())
  const logins = myUsers.get('login', {
    inst: false
  })
  _.each(logins, (login) => t.isa(login, 'string'))
}

const readCrash = async () => {
  const bak = session.session
  session.session = '123'
  users.reset()
  await t.rejects(users.read())
  session.session = bak
}

const getNotField = async () => {
  users.reset()
  await users.read()
  t.throws(users.get.bind(users, 'hello', {
    inst: false
  }))
}

const getNotRead = async () => {
  users.reset()
  await users.read()
  t.throws(users.get.bind(users, 'groups', {
    inst: false
  }))
}

const stop = async () => {
  await session.stop()
}

t.test(start)
  .then(count)
  .then(search)
  .then(read)
  .then(readCrash)
  .then(getNotField)
  .then(getNotRead)
  .then(stop)
  .catch(t.threw)
