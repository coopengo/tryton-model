### Perf

- for all debug statements, remove string concat (avoid operation when noop)

### Usability

- context API should work like attrs: set('company', 1), del('company'), get('company')
