const config = require("./config");
const {
  getCSRF,
  getDOM,
  updatePage,
  getCollectionItems,
  updateCollection,
  updateCollectionItem,
} = require("./requests");
const { hreflang, createSnippet, getSlugs, getSettings } = require("../utils");

const missingConfigKeys = Object.keys(config).filter(
  (key) => config[key] === ""
);

if (missingConfigKeys.length > 0) {
  console.log(`Some config is missing: ${missingConfigKeys.join(", ")}`);
  process.exit(1);
}

function getTranslatedSlug(slug, language) {
  if (!config.slugs || !config.slugs[language]) {
    return slug;
  }
  return config.slugs[language][slug] || slug;
}

function formatSlug(slug, language) {
  if (!slug) {
    return "";
  }
  if (!slug.startsWith("detail_")) {
    return getTranslatedSlug(slug, language);
  }
  // like detail_post, detail_product or detail_category
  const name = getTranslatedSlug(slug.split("detail_").pop(), language);
  const path =
    config.slugs.length && language ? `translated-slug-${language}` : "slug";
  return `${name}/{{wf {&quot;path&quot;:&quot;${path}&quot;,&quot;type&quot;:&quot;PlainText&quot;} }}`;
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
  const snippet = createSnippet(config.apiKey);

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

  const headContent = config.overwrite ? "" : page.head;
  return `${headContent}<!--Weglot-->${snippet}${originalTag}${tags}<!--/Weglot-->`;
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

  console.log("\nGet Webflow pages...");
  const dom = await getDOM();
  console.log("OK");

  if (config.slugs && Object.keys(config.slugs).length) {
    console.log(`\nUpdating ${dom.database.collections.length} collections...`);
    for (const collection of dom.database.collections) {
      console.log(`\n> ${collection.name}`);
      const { languages } = config.settings;

      console.log(`>> Set ${languages.length} custom fields...`);
      const missingLanguages = languages
        .filter(
          ({ language_to }) =>
            !collection.fields.some(
              (field) => field.name === `Translated slug ${language_to}`
            )
        )
        .map(({ language_to }) => ({
          id: `not-persisted-${Math.random().toString(36).slice(2)}`,
          required: false,
          validations: { singleLine: true },
          type: "PlainText",
          name: `Translated slug ${language_to}`,
        }));
      if (missingLanguages.length) {
        collection.fields.push(...missingLanguages);
        await updateCollection(collection, csrf);
      }
      console.log("OK");

      console.log(">> Set collection slugs");
      const { items } = await getCollectionItems(collection._id);
      for (const item of items) {
        for (const { language_to } of languages) {
          const translatedSlug = formatSlug(item.slug, language_to);
          item[`translated-slug-${language_to}`] = translatedSlug;
        }
        const itemId = item._id;
        [
          "updated-on",
          "updated-by",
          "created-on",
          "created-by",
          "published-on",
          "published-by",
          "_cid",
          "_id",
        ].map((k) => delete item[k]);
        const payload = {
          staging: true, // Need to be published
          fields: item,
        };
        await updateCollectionItem(payload, itemId, collection._id, csrf);
        console.log(`OK - /${collection.slug}/${item.slug}`);
      }
    }
  } else {
    console.log("\nNo translated slug, didn't update collections and items.");
  }

  config.pages = dom.pages;
  console.log(`\nUpdating ${dom.pages.length} pages...\n`);

  // Update all pages with generated snippet
  await Promise.all(
    dom.pages.map((page) =>
      updatePage(
        page._id,
        JSON.stringify({ ...page, head: snippet(page) }),
        csrf
      )
        .then((res) =>
          console.log(
            `${res.status === 200 ? "OK" : "Failed"} - ${getSlug(page)}`
          )
        )
        .catch((res) => console.log(res))
    )
  );

  console.log(`
Done !
------
Please check added config on your Webflow design editor and publish new version!
Read Troubleshooting section in README if you have any problem

contact: support@weglot.com
`);
})();
