var _ = require('lodash');
var assert = require('assert');

function set2One(value) {
  if (_.isNull(value) || _.isNumber(value)) {
    return value;
  }
  else if (_.isArray(value)) {
    throw new Error('unsupported value type');
  }
  else if (_.isObject(value)) {
    if (_.isPlainObject(value)) {
      return value;
    }
    else {
      return value.id;
    }
  }
  else {
    throw new Error('unsupported value type');
  }
}

function set2Many(value, oldValue) {
  if (_.isArray(value)) {
    return _.map(value, set2One);
  }
  else if (_.isPlainObject(value)) {
    assert(_.isEmpty(_.omit(value, 'add', 'remove')), 'not implemented');
    var res = oldValue || [];
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
}
exports.set2One = set2One;
exports.set2Many = set2Many;
