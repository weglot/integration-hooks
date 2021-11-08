const global = require("../config");

module.exports = {
  ...global,

  originalHost: "https://www.weglot-translate-wbflow.com/",
  translatedHost: "https://LANG_CODE.weglot-translate-wbflow.com/",

  originalLanguage: "en",
  languages: ["fr", "es", "de"],

  user: "", // admin email
  password: "", // admin password
  projectName: "", // url slug
};
