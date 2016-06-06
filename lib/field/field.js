var _ = require('underscore');

function Field(session, desc) {
  this.session = session;
  _.extendOwn(this, desc);
}
//
Field.prototype.getDefault = function () {
  return null;
};
Field.prototype.get = function (value) {
  // returns promise: for many2one return a record with active model
  return Promise.resolve(value || this.getDefault());
};
Field.prototype.set = function (value) {
  // return promise: for many2one where we set an id
  return Promise.resolve(value);
};
Field.prototype.autocomplete = function (value) {
  // call server...
  return Promise.resolve(value);
};
//
// exports
module.exports = Field;
