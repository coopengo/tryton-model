const _ = require('lodash')
const t = require('tap')
const co = require('co')
const Session = require('tryton-session')
const model = require('..')
const data = require('./.data')

model.init(Session)
const session = new Session(data.server, data.database)
const login = '' + Math.floor(Math.random() * 1000000)
const password = 'Abcdefghijk' + login  // len > 8 and entropy >= 0.75
let user

function start () {
  return session.start(data.username, data.parameters)
}

function create () {
  return co(function * () {
    user = yield model.Record(session, 'res.user')
    t.ok(user instanceof model.Record)
  })
}

function missingData () {
  return co(function * () {
    user.set({
      password: password
    })
    yield user.save()
      .then(() => t.ok(false), (err) => t.type(err, 'object'))
  })
}

function setDefault () {
  return co(function * () {
    yield user.setDefault(null, {
      sync: true
    })
    t.notOk(_.isEmpty(user.attrs))
  })
}

function create2ManyOnTheFly () {
  return co(function * () {
    user.set({
      name: 'Test User',
      login: login,
      password: password,
      groups: [1, {
        name: login
      }]
    })
    yield user.save()
    yield user.read('groups')
    const groups = yield user.get('groups', {
      inst: true
    })
    t.equal(groups.size(), 2)
  })
}

function getNotField () {
  return co(function * () {
    user.reset()
    yield user.read()
    t.throws(user.get.bind(user, 'hello'))
  })
}

function getNotRead () {
  return co(function * () {
    user.reset()
    yield user.read()
    t.throws(user.get.bind(user, 'groups'))
  })
}

function remove2ManyItem () {
  return co(function * () {
    yield user.read('groups')
    user.set('groups', '-1-')
    yield user.save()
    yield user.read('groups')
    const groups = yield user.get('groups', {
      inst: true
    })
    t.equal(groups.size(), 1)
  })
}

function force2ManyList () {
  return co(function * () {
    yield user.read('groups')
    user.set('groups', [1])
    yield user.save()
    yield user.read('groups')
    const groups = yield user.get('groups', {
      inst: true
    })
    t.equal(groups.size(), 1)
  })
}

function readCrash () {
  return co(function * () {
    const bak = session.token
    session.token = '123'
    user.reset()
    yield user.read()
      .then(() => t.ok(false), (err) => t.type(err, 'object'))
    session.token = bak
  })
}

function stop () {
  return session.stop()
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
  .then(stop)
  .catch(t.threw)
