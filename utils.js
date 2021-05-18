const axios = require("axios");

exports.hreflang = function hreflang(href, lang) {
  return `<link href="${href}" hreflang="${lang}" rel="alternate">`;
};

exports.createSnippet = function createSnippet(api_key) {
  return `<script type="text/javascript" src="https://cdn.weglot.com/weglot.min.js"></script><script>Weglot.initialize({ api_key: '${api_key}' });</script>`;
};

exports.formatHost = function formatHost(host) {
  if (host.charAt(host.length - 1) === "/") {
    return host.substr(0, host.length - 1);
  }
  return host;
};

exports.getSettings = function getSettings(apiKey) {
  return axios
    .get(`https://cdn.weglot.com/projects-settings/${apiKey}.json`)
    .then((res) => res.data);
};

exports.getSlugs = function getSlugs(apiKey, languages, version) {
  return languages.map(({ language_to }) =>
    axios
      .get(
        `https://cdn-api.weglot.com/translations/slugs?api_key=${apiKey}&language_to=${language_to}&v=${version}`
      )
      .then((res) => ({ [language_to]: res.data }))
  );
};
