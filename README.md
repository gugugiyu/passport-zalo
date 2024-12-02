# Passport Zalo
![Static Badge](https://img.shields.io/badge/Zalo-v4-green) ![Static Badge](https://img.shields.io/badge/Support_Status-LTS-blue)




<b>Note</b>: This is the forked version to bump up the API to the up-to-date Zalo v4 (More info [here](https://developers.zalo.me/changelog/v211119-gioi-thieu-zalo-login-v4-va-thoi-diem-dung-ho-tro-zalo-login-v3-6171)) from [longldktmm's project](https://github.com/longldktmm/passport-zalo) and this will be a LTS project from me.

#### Installation

I haven't npm'ed it yet, so you'll have to pull the whole lib and setup it yourself

```sh
mkdir passport-zalo
cd passport-zalo
git init
git pull https://github.com/gugugiyu/passport-zalo.git
```

#### Documentations

##### Prerequisites

With the introduction of PKCE verification in the new OAuth API, the library will now make use of *express-session* to store the pkce pair generated per session, and *crypto* to generate the pkce verfier. So you'll to npm that as well

```sh
npm i express-session crypto
```

##### Configuring the strategy

Like other strategies of PassportJs, the config are pretty much the same:

```js
// Make sure you imported it
var ZaloStrategy = require("../path/to/lib/passport-zalo/index").Strategy;

passport.use(new ZaloStrategy(
    {
    appId: process.env.ZALO_CLIENT_ID,
    appSecret: process.env.ZALO_CLIENT_SECRET,
    callbackURL: 'YOUR_CALL_BACK_URL',
     /* This is required to prevent csrf attacks, will be sent back with the auth code */
     state: "test",
    },
    (accessToken, refreshToken, profile, session, cb) => {
        /* Handle logics here */
        cb(null, user);
    }
)
);
```

##### Authenticating users

```js
// Main authentication endpoint
app.get("/auth/zalo", passport.authenticate("zalo"));

// Callback
app.get("/auth/zalo/callback", passport.authenticate("zalo", {failureRedirect: `/login`,}),
  (req, res) => {
    /* Success, handle the logic here */
    res.redirect('/home');
  } 
);
```

#### FAQs

##### How can I require custom fields ?
The default profile includes the following:
- Id (platform-unique ID)
- Birthday
- Name
- Gender
- Picture


But you can overwrite it here
```js
// Callback
app.get("/auth/zalo/callback", passport.authenticate("zalo", 
{
    failureRedirect: `/login`,
    fields: ["extra", "custom", "fields"]
}),
  (req, res) => {
    /* Success, handle the logic here */
    res.redirect('/home');
  } 
);
```

##### What exactly is PKCE?
###### [Here you go.](https://www.oauth.com/oauth2-servers/pkce/)

#### Contributions
Just file up a pull request, and (hopefully) I'll take a look at your ideas!





