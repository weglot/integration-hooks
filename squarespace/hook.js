const fs = require("fs");
const simpleGit = require("simple-git");
const rimraf = require("rimraf");
const config = require("./config");
const { hreflang, createSnippet } = require("../utils");

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

const { projectName, languages, originalLanguage, apiKey } = config;
const [user, password] = [config.user, config.password].map(encodeURIComponent);

const git = simpleGit();
const repoPath = `${__dirname}/tmp`;

(async () => {
  console.time("Done");
  try {
    console.log("Starting...");

    // delete repo folder
    rimraf.sync(repoPath);

    console.log("Cloning repo...");
    await git.init();
    await git.clone(
      `https://${user}:${password}@${projectName}.squarespace.com/template.git`,
      repoPath
    );
    console.log("OK");

    console.log("Adding hreflang tags...");
    const structureFile = `${repoPath}/site.region`;
    const html = addTags(fs.readFileSync(structureFile).toString());
    fs.writeFileSync(structureFile, html);
    console.log("OK");

    console.log("Save and push...");

    await git
      .cwd(repoPath)
      .add(structureFile)
      .commit("WEGLOT - Add hreflang tags")
      .push(["-u", "origin", "master"]);
    console.log("OK");

    rimraf.sync(repoPath);
  } catch (e) {
    console.log("Failed!");
    console.log(e);
  }
  console.timeEnd("Done");
})();

function addTags(html) {
  // Detect </head> and tabulation
  if (!html.match("</head>")) {
    throw "Cannot detect </head> tag to inject hreflang tags";
  }

  const tags = [originalLanguage, ...languages]
    .map((lang) => {
      const prefix = lang === originalLanguage ? "" : `${lang}.`;
      const href = `https://${prefix}{website.primaryDomain}{.section item}{item.fullUrl}{.or}{collection.fullUrl}{.end}`;
      return hreflang(href, lang);
    })
    .join("\n");

  const snippet = createSnippet(apiKey);
  const replacement = `\n${tags}\n${snippet}\n</head>`;

  return html.replace(/(.*)?<\/head>/, replacement);
}
