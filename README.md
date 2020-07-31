## hook-webflow for Weglot

Script to automatically inject _hreflang_ tags into all pages
in your webflow project

### Requirements

`node >=10`

### Setup

1. Clone repo `git clone https://github.com/weglot/hook-webflow.git`

2. Install dependencies `yarn` or `npm i`

3. Fill all options from `config.js`

   - `apiKey`: Weglot API Key from your dashboard setup
   - `wflogin`/`wfsession`: In your webflow admin page, open Chrome 
       devtools (right click "inspect") > Application tab > Cookies > webflow.com,
       get content from wflogin (eg. 10101894633456) and wfsession
       (long random strings) cookies
   - `originalHost`: your public website URL (eg. https://www.example.com)
   - `translatedHost`: your public website URL with `LANG_CODE` instead of language
       code (eg. https://LANG_CODE.example.com)
   - `languages`: array of your languages (eg. ['fr', 'de', 'es'])
   - `projectName`: Slug from webflow admin. Go to webflow admin page > Design mode >
       get current URL and remove https://webflow.com/design/ first part, you should
       get something as `my-first-project-a898b8`

### Run

`yarn start` or `npm start`
