# integration-hooks for Weglot

Script to automatically inject _hreflang_ tags and snippets into all pages into
your Webflow website

<hr>

## Disclaimer

This script automatically edit your website, please use it at your own risk. We
encourage you to read the code.

Here is a summary of what it's doing;

### Webflow

We use your cookie config to send some requests to your Webflow editor:

- We *add one custom field for each translated language* to all collections
  in order to store translated slugs.
- We fill added custom fields to all items from all collections with the right 
  translated slug.
- We add script and hreflang tags to all custom head pages with right
  dynamic slugs.

### Squarespace

Deprecated - please use Weglot in Squarespace admin, [see documentation here](https://support.squarespace.com/hc/fr-fr/articles/205809778-Cr%C3%A9ation-d-un-site-multilingue-avec-Weglot)

<hr>

## Requirements

- `node >=18`
- Weglot account with a Webflow configured with subdomains setup

## Setup

1. Clone repo `git clone https://github.com/weglot/integration-hooks.git`

2. Install dependencies `yarn` or `npm i`

3. Fill options:

### Webflow (to be set in webflow/config.js)

- `apiKey`: Weglot API Key from your [Weglot dashboard](https://dashboard.weglot.com/settings/setup)
- `wflogin`/`wfdesignersession`: In your Webflow admin page, open Chrome
  devtools (right click "inspect") > Application tab > Cookies > webflow.com,
  get content from wflogin (eg. 10101894633456) and wfdesignersession
  (long random strings) cookies
- `projectId`: Subdomain from Webflow admin. Go to Webflow admin page > Design mode,
  get first subdomain: `https://XXXXX.design.webflow.com/`, you should
  get something as `my-first-project`

## Run

When you are ready, run `yarn webflow`

**This script edit your website but it doesn't publish it**

## Troubleshooting

**I broke all my custom head tags!**

Go to the *Settings* tab on Webflow design editor then *Backups* and choose an
old published version of your website to restore it. More information on
[Webflow documentation](https://university.webflow.com/lesson/backups?topics=site-settings#preview-and-restore-backup-versions)
