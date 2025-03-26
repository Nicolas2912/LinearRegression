/**
 * This is a shim for the missing ajv/dist/compile/codegen module
 * It provides a minimalistic implementation of the methods used during the build process
 */

const _ = {
  str: (str) => JSON.stringify(str),
  nil: () => 'null',
  _: (j) => j,
  name: (n) => n,
  esc: (c) => c,
  json: (j) => JSON.stringify(j),
  getProperty: (prop) => `.${prop}`,
  getEsmExportName: (name) => name,
  code: (c) => c,
  formats: {}
};

module.exports = { _ }; 