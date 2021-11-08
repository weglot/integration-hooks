## integration-hooks for Weglot

Script to automatically inject _hreflang_ tags and snippets into all pages into
your Webflow or Squarespace website

### Requirements

`node >=10`

### Setup

1. Clone repo `git clone https://github.com/weglot/integration-hooks.git`

2. Install dependencies `yarn` or `npm i`

3. Fill global options from `config.js`

  - `apiKey`: Weglot API Key from your dashboard setup

4. Fill specific options from your platform:

#### Webflow (to be set in webflow/config.js)

- `wflogin`/`wfsession`: In your Webflow admin page, open Chrome
  devtools (right click "inspect") > Application tab > Cookies > webflow.com,
  get content from wflogin (eg. 10101894633456) and wfsession
  (long random strings) cookies
- `projectName`: Slug from webflow admin. Go to webflow admin page > Design mode >
  get current URL and remove https://webflow.com/design/ first part, you should
  get something as `my-first-project-a898b8`

#### Squarespace (to be set in squarespace/config.js)

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

**Some slugs aren't translated**

If you use collections, slugs are automatically generated from the parent page
and Webflow is using a dynamic "field" to populate slugs so *they can't be
translated*.
