var _ = require('lodash')
var assert = require('assert')

var RMRE = /-\d+-/

function checkRM (v) {
  return _.isString(v) && RMRE.test(v)
}

function extractRM (v) {
  return parseInt(v.substr(1, v.length - 2))
}

function set2One (value) {
  if (_.isPlainObject(value)) {
    if (!_.isNil(value.id)) {
      assert(value.id > 0, this.name + ': bad value')
      return value.id
    } else {
      return _.pickBy(value, (v, k) => k.indexOf('.') < 0)
    }
  } else if (_.isNull(value) || _.isNumber(value)) {
    return value
  } else if (value._is_a_record) {
    var res = _.clone(value.attrs)
    res.id = value.id
    return res
  } else {
    throw new Error(this.name + ': bad type')
  }
}

function get2One (value) {
  return value
}

function set2Many (value, options) {
  var res = options.old ? _.clone(options.old) : []
  if (options.oc && _.isPlainObject(value)) {
    assert(_.isEmpty(_.omit(value, 'add', 'remove', 'update')),
      this.name + ': bad value')
    if (value.add) {
      _.each(value.add, (toAdd) => {
        res.splice(toAdd[0], 0, set2One.call(this, toAdd[1]))
      })
    }
    if (value.remove) {
      res = res.difference(value.remove)
    }
    if (value.update) {
      var perId = _.groupBy(res, x => (x.id))
      _.each(value.update, (toUpdate) => {
        _.assign(perId[toUpdate.id][0], toUpdate)
      })
    }
    return res
  } else if (_.isArray(value)) {
    var vals = _.map(value, set2One.bind(this))
    var rm = _.filter(res, (v) => _.isNumber(v) && !_.includes(vals, v))
    return _.concat(vals, _.map(rm, (v) => '-' + v + '-'))
  } else if (value._is_a_group) {
    return _.map(value.records, set2One.bind(this))
  } else {
    try {
      res.push(set2One.call(this, value))
    } catch (err) {
      if (checkRM(value)) {
        var v = extractRM(value)
        var i = res.indexOf(v)
        assert(i >= 0, this.name + ': bad value')
        _.pullAt(res, i)
        res.push(value)
      } else {
        throw err
      }
    }
    return res
  }
}

function get2Many (value, options) {
  if (options.rpc) {
    var res = {
      create: [],
      add: [],
      remove: []
    }
    _.each(value, (element) => {
      if (_.isPlainObject(element)) {
        if (element.id < 0) {
          options.rec.set(_.omit(element, 'id'))
          res.create.push(options.rec.get({rpc: true}))
        } else {
          res.create.push(element)
        }
      } else if (_.isNumber(element)) {
        res.add.push(element)
      } else if (checkRM(element)) {
        res.remove.push(extractRM(element))
      }
    })
    return _.toPairs(res)
  } else {
    return _.filter(value, (element) => !_.isString(element))
  }
}

exports.set2One = set2One
exports.get2One = get2One
exports.set2Many = set2Many
exports.get2Many = get2Many
