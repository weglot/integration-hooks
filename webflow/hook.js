const config = require("./config");
const {
  getCSRF,
  getDOM,
  updatePage,
  getCollectionItems,
  updateCollection,
  updateCollectionItem,
} = require("./requests");
const {
  hreflang,
  createSnippet,
  getSlugs,
  getSettings,
  prompt,
} = require("../utils");

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
    config.translateSlugs && language ? `translated-slug-${language}` : "slug";
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
    .map(({ language_to, custom_code, connect_host_destination }) => {
      return hreflang(
        `https://${connect_host_destination.host}${getSlug(page, language_to)}`,
        custom_code || (language_to === "br" ? "pt-br" : language_to)
      );
    })
    .join("");

  if (!tags) {
    return page.head;
  }

  const html = `<!--Weglot-hv2-->${snippet}${originalTag}${tags}<!--/Weglot-->`;
  if (page.head) {
    // Remove existing tag before adding new one
    const head = page.head.replace(
      /<!--Weglot(-hv\d+)?-->([\s\S]+)<!--\/Weglot-->/,
      ""
    );
    return `${head}${html}`;
  }
  return html;
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

  if (config.settings.url_type !== "SUBDOMAIN") {
    console.log(
      "This script is only useful if you have a Weglot subdomain configuration\nNeed help? support@weglot.com\nExiting"
    );
    process.exit();
  }

  // Get Weglot translated slugs
  if (config.settings.versions) {
    const { slugTranslation = 1 } = config.settings.versions;
    const slugs = await Promise.all(
      getSlugs(config.apiKey, config.settings.languages, slugTranslation)
    ).catch(() => {
      console.log(`Unable to get translated slugs`);
      process.exit(1);
    });
    config.slugs = Object.assign(...slugs);
  }

  // Get CSRF
  const csrf = await getCSRF();
  console.log("CSRF found!");

  console.log("\nGet Webflow database...");
  const dom = await getDOM().catch(() => {
    console.log(
      "Unable to login to your Webflow account, please check wfdesignersession cookie"
    );
    process.exit(1);
  });
  console.log(`OK - ${dom.pages.length} pages`);
  if (dom.database?.collections) {
    console.log(`Found ${dom.database.collections.length} collections\n`);
  }

  // Edit collections to add translated slugs in custom field
  if (
    config.slugs &&
    Object.keys(config.slugs).length &&
    dom.database?.collections
  ) {
    await editCollectionSlugs(dom, csrf);
  } else {
    console.log("\nNo translated slug, didn't update collections and items.");
  }

  config.pages = dom.pages;

  const answer = await prompt(
    "Do you want to review each page before injecting Weglot snippet? [Y/n]"
  );
  const review = !answer || answer.toLowerCase() === "y";
  console.log(review ? "Review mode" : "Yolo mode");
  console.log(`\nUpdating ${dom.pages.length} pages...\n`);

  for (const page of dom.pages) {
    let head = snippet(page);
    if (review) {
      console.log(`Page: ${page.title} (${getSlug(page)})`);
      console.log(page.head ? `-> Head: \n\n${page.head}` : `-> No head`);
      if (page.head) {
        const answer = await prompt("[A]ppend, [O]verride or [S]kip ? [A/o/s]");
        if (answer.toLowerCase() === "s") {
          continue;
        }
        const append = !answer || answer.toLowerCase() === "a";
        if (append) {
          head = `${page.head}${head}`;
        }
      } else {
        const answer = await prompt("[A]dd or [S]kip ? [A/s]");
        if (answer.toLowerCase() === "s") {
          continue;
        }
      }
    }
    await updatePage(page._id, JSON.stringify({ ...page, head }), csrf)
      .then((res) => console.log(`-> ${res.status === 200 ? "OK" : "Failed"}`))
      .catch((res) => console.log(res));
  }

  console.log(`
Done !
------
IMPORTANT:
1- Reload entirely Webflow designer to see changes in Page > Custom code or Collections > Custom code
2- Check if everything is OK, then Publish new version to see changes in your website

Read Troubleshooting section in README if you have any problem

contact: support@weglot.com
`);
  process.exit();
})();

async function editCollectionSlugs(dom, csrf) {
  const editCollections = await prompt(
    "Do you want to add a slug field to each collection in order to use translated slugs? [Y/n]"
  );
  config.translateSlugs =
    !editCollections || editCollections.toLowerCase() === "y";
  if (!config.translateSlugs) {
    return;
  }

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
      console.log(`OK - Add ${missingLanguages.length} missing languages`);
    } else {
      console.log(`OK - No language to add`);
    }

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
}
