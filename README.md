## integration-hooks for Weglot

Script to automatically inject _hreflang_ tags and snippets into all pages into
your Webflow or Squarespace website

### Disclaimer

This script automatically edit your website, please use it at your own risk. We
encourage you to read the code.

Here is a summary of what it's doing;

**Squarespace**

We connect to your git's Squarespace with username and password and add a commit
named "WEGLOT - Add hreflang tags". This commit add script and hreflang tags to
configure Weglot properly into the `site.region` file.

Delete this commit to rollback this hook.

**Webflow**

We use your cookie config to send some requests to your Webflow editor:

- We *add one custom field for each translated language* to all collections
  in order to store translated slugs.
- We fill added custom fields to all items from all collections with the right 
  translated slug.
- We add script and hreflang tags to all custom head pages with right
  dynamic slugs.

### Requirements

`node >=10`

### Setup

1. Clone repo `git clone https://github.com/weglot/integration-hooks.git`

2. Install dependencies `yarn` or `npm i`

3. Fill specific options from your platform:

#### Webflow (to be set in webflow/config.js)

- `apiKey`: Weglot API Key from your [Weglot dashboard](https://dashboard.weglot.com/settings/setup)
- `wflogin`/`wfsession`: In your Webflow admin page, open Chrome
  devtools (right click "inspect") > Application tab > Cookies > webflow.com,
  get content from wflogin (eg. 10101894633456) and wfsession
  (long random strings) cookies
- `projectName`: Slug from webflow admin. Go to webflow admin page > Design mode >
  get current URL and remove https://webflow.com/design/ first part, you should
  get something as `my-first-project-a898b8`
- `overwrite`: if true, we replace all content in all custom head, false we 
  append content to the existent. default to `false`

#### Squarespace (to be set in squarespace/config.js)

- `apiKey`: Weglot API Key from your [Weglot dashboard](https://dashboard.weglot.com/settings/setup)
- `originalHost`: your public website URL (eg. https://www.example.com)
- `translatedHost`: your public website URL with `LANG_CODE` instead of
 language code (eg. https://LANG_CODE.example.com)
- `originalLanguage`: your original language (eg. 'en')
- `languages`: array of your languages (eg. ['fr', 'de', 'es'])
- `user`: Squarespace admin email
- `password`: Squarespace admin password
- `projectName`: Slug from Squarespace admin. Go to Squarespace admin page and get
  first piece of current URL: https://GET-THIS.squarespace.com/config/...
  eg. `lobster-bear-t9h1`

### Run

When you are ready, run `node squarespace/hook.js` or `node webflow/hook.js`

This script edit your website but it doesn't publish it if it's necessary, like
on Webflow

### Troubleshooting

#### Webflow

**I broke all my custom head tags!**

Go to the *Settings* tab on Webflow design editor then *Backups* and choose an
old published version of your website to restore it. More information on
[Webflow documentation](https://university.webflow.com/lesson/backups#preview-and-restore-backup-versions)
