const axios = require("axios");
const config = require("./config");
const { hreflang, createSnippet, getSlugs, getSettings } = require("../utils");

const missingConfigKeys = [];
Object.keys(config).forEach(key => {
  if (!config[key]) {
    missingConfigKeys.push(key);
  }
});
if (missingConfigKeys.length > 0) {
  console.log(`Some config is missing: ${missingConfigKeys.join(', ')}`);
  process.exit(1);
}

const { projectName, apiKey } = config;

function getTranslatedSlug(slug, language_to) {
  if (!config.slugs[language_to]) {
    return slug;
  }
  return config.slugs[language_to][slug] || slug;
}

function formatSlug(slug, language_to) {
  if (!slug) {
    return "";
  }
  if (!slug.startsWith("detail_")) {
    return getTranslatedSlug(slug, language_to);
  }
  // like detail_post, detail_product or detail_category
  const name = getTranslatedSlug(slug.split("detail_").pop(), language_to);
  return `${name}/{{wf {&quot;path&quot;:&quot;slug&quot;,&quot;type&quot;:&quot;PlainText&quot;} }}`;
}

// Recursively construct url pathname with slugs levels
function getSlug(page, language_to) {
  const parent = config.pages.find((p) => p._id === page.parent);
  const slug = formatSlug(page.slug, language_to);
  if (!page.parent || !parent) {
    return `/${slug}`;
  }
  return `${getSlug(parent, language_to)}/${slug}`;
}

// Generate snippet with - JS, - original hreflang, - all translated hreflang versions
function snippet(page) {
  const snippet = createSnippet(apiKey);

  const { language_from, languages, host } = config.settings;

  const originalUrl = `https://${host}${getSlug(page)}`;
  const originalTag = hreflang(originalUrl, language_from);

  const tags = languages
    .filter(({ connect_host_destination }) => connect_host_destination)
    .map(({ language_to, custom_code, connect_host_destination }) =>
      hreflang(
        `https://${connect_host_destination.host}${getSlug(page, language_to)}`,
        custom_code || language_to
      )
    )
    .join("");

  return `${snippet}${originalTag}${tags}`;
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

async function getCSRF() {
  try {
    const designer = await wfapi
      .get(`/design/${projectName}`)
      .then((res) => res.data);
    console.log(`Searching for CSRF Token...`);

    const matches = designer.match(/<meta name="_csrf" content="([^"]+)">/);
    if (!matches) {
      console.log("Unable to get csrf");
      process.exit();
    }
    const [, csrf] = matches;
    return csrf;
  } catch (_) {
    console.log("Unable to login, please check your config values.");
    process.exit();
  }
}

(async () => {
  // Get Weglot settings
  try {
    config.settings = await getSettings(config.apiKey.split("wg_").pop());
  } catch (_) {
    console.log(
      "Your Weglot API key seems wrong. Please check your config file."
    );
    process.exit();
  }

  // Get Weglot translated slugs
  try {
    if (config.settings.versions) {
      const { slugTranslation } = config.settings.versions;
      const slugs = await Promise.all(
        getSlugs(config.apiKey, config.settings.languages, slugTranslation)
      );
      config.slugs = Object.assign(...slugs);
    }
  } catch (_) {}

  // Get CSRF
  const csrf = await getCSRF();
  console.log("CSRF found!");

  // Get Webflow data
  const dom = await wfapi
    .get(`/api/sites/${projectName}/dom?t=${Date.now()}`, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    .then((res) => res.data);

  config.pages = dom.pages;
  console.log(`Updating ${dom.pages.length} pages...`);

  // Update all pages with generated snippet
  await Promise.all(
    dom.pages.map((page) =>
      wfapi
        .put(
          `/api/pages/${page._id}`,
          JSON.stringify({ ...page, head: snippet(page) }),
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
