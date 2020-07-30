const axios = require("axios");
const config = require("./config");

if (Object.values(config).some((s) => !s)) {
  console.log("Some config is missing");
  process.exit(1);
}

const special_slugs = {
  detail_post:
    "post/{{wf {&quot;path&quot;:&quot;slug&quot;,&quot;type&quot;:&quot;PlainText&quot;} }}",
  detail_product:
    "product/{{wf {&quot;path&quot;:&quot;slug&quot;,&quot;type&quot;:&quot;PlainText&quot;} }}/",
  detail_category:
    "category/{{wf {&quot;path&quot;:&quot;slug&quot;,&quot;type&quot;:&quot;PlainText&quot;} }}/",
};

function snippet(slug) {
  if (!slug) slug = "";
  if (special_slugs[slug]) slug = special_slugs[slug];
  return `
<link rel="alternate" hreflang="en" href="${config.originalHost}${slug}" />
${config.languages.map((lang) => {
  const transHost = config.translatedHost.replace("LANG_CODE", lang);
  return `<link rel="alternate" hreflang="${lang}" href="${transHost}${slug}" />\n`;
})}<script type="text/javascript" src="https://cdn.weglot.com/weglot.min.js"></script>
<script>
    Weglot.initialize({
        api_key: '${config.apiKey}'
    });
</script>
  `;
}

const wfapi = axios.create({
  baseURL: "https://webflow.com/",
  headers: {
    Accept: "application/json, text/javascript, */*; q=0.01",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36",
    Cookie: `wflogin=${config.wflogin}; wfsession=${config.wfsession}`,
  },
});

(async () => {
  const designer = await wfapi
    .get(`/design/${config.projectName}`)
    .then((res) => res.data);
  console.log(`Searching for CSRF Token...`);

  const matches = designer.match(/<meta name="_csrf" content="([^"]+)">/);
  if (!matches) {
    console.log("Unable to get csrf");
    process.exit();
  }
  const [, csrf] = matches;
  console.log("CSRF found!");

  const dom = await wfapi
    .get(`/api/sites/${config.projectName}/dom?t=${Date.now()}`, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    .then((res) => res.data);

  console.log(`Updating ${dom.pages.length} pages...`);

  await Promise.all(
    dom.pages.map((page) =>
      wfapi
        .put(
          `/api/pages/${page._id}`,
          JSON.stringify({ ...page, head: snippet(page.slug) }),
          {
            headers: {
              "Content-Type": "application/json",
              "X-XSRF-Token": csrf,
            },
          }
        )
        .then((res) =>
          console.log(`${res.status === 200 ? "OK" : "Failed"} - ${page.slug}`)
        )
        .catch((res) => console.log(res))
    )
  );

  console.log("Done!");
})();
