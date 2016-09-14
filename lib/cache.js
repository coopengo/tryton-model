function set(session, model, id, record) {
  if (!session.cache[model]) {
    session.cache[model] = {};
  }
  if (record) {
    session.cache[model]['' + id] = record;
  }
  else {
    delete session.cache[model]['' + id];
  }
}

function get(session, model, id) {
  if (!session.cache[model]) {
    session.cache[model] = {};
  }
  return session.cache[model]['' + id];
}
//
// exports
exports.set = set;
exports.get = get;
