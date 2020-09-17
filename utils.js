exports.hreflang = function hreflang(href, lang) {
  return `<link href="${href}" hreflang="${lang}" rel="alternate">`;
};

exports.createSnippet = function createSnippet(api_key) {
  return `<script type="text/javascript" src="https://cdn.weglot.com/weglot.min.js"></script>
<script>Weglot.initialize({ api_key: '${api_key}' });</script>`;
};
