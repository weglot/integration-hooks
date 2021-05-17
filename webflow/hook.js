const axios = require("axios");
const config = require("./config");
const { hreflang, createSnippet, formatHost } = require("../utils");

if (Object.values(config).some((s) => !s)) {
  console.log("Some config is missing");
  process.exit(1);
}

const { originalLanguage, originalHost, languages, apiKey } = config;

const specialSlug =
  "{{wf {&quot;path&quot;:&quot;slug&quot;,&quot;type&quot;:&quot;PlainText&quot;} }}";

function formatSlug(slug) {
  if (!slug) {
    return "";
  }
  if (!slug.startsWith("detail_")) {
    return slug;
  }
  // like detail_post, detail_product or detail_category
  const [, name] = slug.split("detail_");
  return `${name}/${specialSlug}`;
}

function getSlug(page, pages) {
  const parent = pages.find((p) => p._id === page.parent);
  if (!page.parent || !parent) {
    return `/${formatSlug(page.slug)}`;
  }
  return `${getSlug(parent, pages)}/${formatSlug(page.slug)}`;
}

function snippet(slug) {
  const snippet = createSnippet(apiKey);
  const host = formatHost(originalHost);

  const originalTag = hreflang(`${host}${slug}`, originalLanguage);
  const tags = languages
    .map((lang) => {
      const transHost = config.translatedHost.replace("LANG_CODE", lang);
      return hreflang(`${formatHost(transHost)}${slug}`, lang);
    })
    .join("");

  return `${originalTag}${tags}${snippet}`;
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
    dom.pages.map((page) => {
      const slug = getSlug(page, dom.pages);
      return wfapi
        .put(
          `/api/pages/${page._id}`,
          JSON.stringify({ ...page, head: snippet(slug) }),
          {
            headers: {
              "Content-Type": "application/json",
              "X-XSRF-Token": csrf,
            },
          }
        )
        .then((res) =>
          console.log(`${res.status === 200 ? "OK" : "Failed"} - ${slug}`)
        )
        .catch((res) => console.log(res));
    })
  );

  console.log("Done!");
})();
