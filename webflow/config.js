const global = require("../config");

module.exports = {
  ...global,

  wflogin: "", // wflogin cookie content
  wfsession: "", // wfsession cookie content
  projectName: "", // url slug

  overwrite: false, // append or overwrite custom <head> content, default to append
};
