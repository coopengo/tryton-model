function Cache(session) {
  this.session = session;
  this.data = {};
}
Cache.prototype.set = function (model, id, record) {
  if (!this.data[model]) {
    this.data[model] = {};
  }
  if (record) {
    this.data[model]['' + id] = record;
  }
  else {
    delete this.data[model]['' + id];
  }
};
Cache.prototype.get = function (model, id) {
  if (!this.data[model]) {
    this.data[model] = {};
  }
  return this.data[model]['' + id];
};
//
module.exports = Cache;
