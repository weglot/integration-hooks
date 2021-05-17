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
