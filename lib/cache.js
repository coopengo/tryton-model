function set(session, model, id, record) {
  if (!session.cache[model.name]) {
    session.cache[model.name] = {};
  }
  if (record) {
    session.cache[model.name]['' + id] = record;
  }
  else {
    delete session.cache[model.name]['' + id];
  }
}

function get(session, model, id) {
  if (!session.cache[model.name]) {
    session.cache[model.name] = {};
  }
  return session.cache[model.name]['' + id];
}
//
// exports
exports.set = set;
exports.get = get;
