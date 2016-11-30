var _ = require('lodash');
var assert = require('assert');
//
var RMRE = /-\d+-/;

function checkRM(v) {
  return _.isString(v) && RMRE.test(v);
}

function extractRM(v) {
  return parseInt(v.substr(1, v.length - 2));
}

function set2One(value) {
  if (_.isPlainObject(value)) {
    if (!_.isNil(value.id)) {
      assert(value.id > 0, this.name + ': bad value');
      return value.id;
    }
    else {
      return value;
    }
  }
  else if (_.isNull(value) || _.isNumber(value)) {
    return value;
  }
  else {
    throw new Error(this.name + ': bad type');
  }
}

function get2One(value) {
  return value;
}

function set2Many(value, options) {
  var res = options.old ? _.clone(options.old) : [];
  if (options.oc) {
    assert(_.isPlainObject(value), this.name + ': bad type');
    assert(_.isEmpty(_.omit(value, 'add', 'remove')), this.name + ': bad value');
    if (value.add) {
      _.each(value.add, (toAdd) => {
        res.splice(toAdd[0], 0, set2One(toAdd[1]));
      });
    }
    if (value.remove) {
      res = res.difference(value.remove);
    }
    return res;
  }
  else {
    if (_.isArray(value)) {
      var vals = _.map(value, set2One);
      var rm = _.filter(res, (v) => _.isNumber(v) && _.indexOf(vals) < 0);
      return _.concat(vals, _.map(rm, (v) => '-' + v + '-'));
    }
    else {
      try {
        res.push(set2One(value));
      }
      catch (err) {
        if (checkRM(value)) {
          var v = extractRM(value);
          var i = _.indexOf(res, v);
          assert(i < 0, this.name + ': bad value');
          _.pullAt(res, i);
          res.push(value);
        }
        else {
          throw err;
        }
      }
      return res;
    }
  }
}

function get2Many(value, options) {
  if (options.rpc) {
    var res = {
      create: [],
      add: [],
      remove: []
    };
    _.each(value, (element) => {
      if (_.isPlainObject(element)) {
        res.create.push(element);
      }
      else if (_.isNumber(element)) {
        res.add.push(element);
      }
      else if (checkRM(element)) {
        res.remove.push(extractRM(element));
      }
    });
    return _.toPairs(res);
  }
  else {
    return _.filter(value, (element) => !_.isString(element));
  }
}
exports.set2One = set2One;
exports.get2One = get2One;
exports.set2Many = set2Many;
exports.get2Many = get2Many;
