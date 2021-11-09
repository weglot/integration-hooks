const axios = require("axios");

const config = require("./config");

const wfapi = axios.create({
  baseURL: "https://webflow.com/",
  headers: {
    Accept: "application/json, text/javascript, */*; q=0.01",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36",
    Cookie: `wflogin=${config.wflogin};wfsession=${config.wfsession}`,
  },
});

async function getCSRF() {
  try {
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
    return csrf;
  } catch (_) {
    console.log("Unable to login, please check your config values.");
    process.exit();
  }
}

function getDOM() {
  return wfapi
    .get(`/api/sites/${config.projectName}/dom?t=${Date.now()}`, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    .then((res) => res.data);
}

function updateCollection(collection, csrf) {
  return wfapi
    .put(`/api/v1/collections/${collection._id}`, JSON.stringify(collection), {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/json",
        "X-XSRF-Token": csrf,
      },
    })
    .then((res) => res.data)
    .catch((err) => console.log(err));
}

function getCollectionItems(collectionId) {
  return wfapi
    .get(`/api/v1/collections/${collectionId}/items`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    })
    .then((res) => res.data)
    .catch((err) => console.log(err));
}

function updateCollectionItem(item, itemId, collectionId, csrf) {
  return wfapi
    .put(
      `/api/v1/collections/${collectionId}/items/${itemId}`,
      JSON.stringify(item),
      {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "Content-Type": "application/json",
          "X-XSRF-Token": csrf,
        },
      }
    )
    .then((res) => res.data)
    .catch((err) => console.log(err));
}

function updatePage(pageId, payload, csrf) {
  return wfapi.put(`/api/pages/${pageId}`, payload, {
    headers: {
      "Content-Type": "application/json",
      "X-XSRF-Token": csrf,
    },
  });
}

module.exports = {
  getCSRF,
  getDOM,
  getCollectionItems,
  updateCollection,
  updateCollectionItem,
  updatePage,
};
