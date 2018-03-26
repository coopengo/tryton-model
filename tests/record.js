const _ = require('lodash')
const t = require('tap')
const Session = require('tryton-session')
const model = require('..')
const data = require('./.data')

model.init(Session)
const session = new Session(data.server, data.database)
const login = '' + Math.floor(Math.random() * 1000000)
const password = 'Abcdefghijk' + login // len > 8 and entropy >= 0.75
let user

const start = async () => {
  await session.start(data.username, {password: data.password})
}

const create = async () => {
  user = await model.Record(session, 'res.user')
  t.ok(user instanceof model.Record)
}

const missingData = async () => {
  user.set({
    password: password
  })
  await t.rejects(user.save())
}

const setDefault = async () => {
  await user.setDefault(null, {
    sync: true
  })
  t.notOk(_.isEmpty(user.attrs))
}

const create2ManyOnTheFly = async () => {
  user.set({
    name: 'Test User',
    login: login,
    password: password,
    groups: [1, {
      name: login
    }]
  })
  await user.save()
  await user.read('groups')
  const groups = await user.get('groups', {
    inst: true
  })
  t.equal(groups.size(), 2)
}

const getNotField = async () => {
  user.reset()
  await user.read()
  t.throws(user.get.bind(user, 'hello'))
}

const getNotRead = async () => {
  user.reset()
  await user.read()
  t.throws(user.get.bind(user, 'groups'))
}

const remove2ManyItem = async () => {
  await user.read('groups')
  user.set('groups', '-1-')
  await user.save()
  await user.read('groups')
  const groups = await user.get('groups', {
    inst: true
  })
  t.equal(groups.size(), 1)
}

const force2ManyList = async () => {
  await user.read('groups')
  user.set('groups', [1])
  await user.save()
  await user.read('groups')
  const groups = await user.get('groups', {
    inst: true
  })
  t.equal(groups.size(), 1)
}

const readCrash = async () => {
  const bak = session.session
  session.session = '123'
  user.reset()
  await t.rejects(user.read())
  session.session = bak
}

const del = async () => {
  const groups = await model.Group.search(session, 'res.group',
    {domain: ['name', '=', login]})
  const group = groups.first()
  const id = group.id
  await group.del()
  t.equal(group.id, 0)
  t.equal(group.delPromise, true)
  const zombie = await model.Record(session, 'res.group', id)
  await t.rejects(zombie.read())
}

const stop = async () => {
  await session.stop()
}

t.test(start)
  .then(create)
  .then(missingData)
  .then(setDefault)
  .then(create2ManyOnTheFly)
  .then(getNotField)
  .then(getNotRead)
  .then(remove2ManyItem)
  .then(force2ManyList)
  .then(readCrash)
  .then(del)
  .then(stop)
  .catch(t.threw)
