function Field(model, desc) {
  this.model = model;
  this.name = desc.name;
  this.desc = desc;
}
//
Field.prototype.getDefault = function () {
  return null;
};
Field.prototype.getTimestamp = function (value) {
  return {};
};
Field.prototype.get = function (value, options, context) {
  // returns promise: for many2one return a record with active model
  return value || this.getDefault();
};
Field.prototype.set = function (old, value, options, context) {
  // return promise: for many2one where we set an id
  return value;
};
//
// exports
module.exports = Field;
