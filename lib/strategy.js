/**
 * Module dependencies.
 */
var passport = require("passport-strategy"),
  url = require("url"),
  https = require("https"),
  util = require("util");

const {createHash} = require('crypto')

function getPkcePair(length){
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    
    // Loop to generate characters for the specified length
    for (let i = 0; i < length; i++) {
        const randomInd = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomInd);
    }

    return {
        code_verifier: result,
        code_challenge:  createHash('sha256')
                                    .update(result).digest()
                                    .toString('base64')
                                    .replace(/\+/g, '-')
                                    .replace(/\//g, '_')
                                    .replace(/=+$/, '') // Remove padding
    }
}

/**
 * `Strategy` class, implementing the main ZaloStrategy
 *
 * @constructor
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
class ZaloStrategy {
    constructor(options, verify) {
        if (typeof options == "function") {
            verify = options;
            options = undefined; 
        }
        options = options || {};

        if (!verify) {
            throw new TypeError("ZaloStrategy requires a verify callback");
        }
        if (!options.appId) {
            throw new TypeError("ZaloStrategy requires an app_id option");
        }
        if (!options.appSecret) {
            throw new TypeError("ZaloStrategy requires an app_secret option");
        }
        if (!options.callbackURL) {
            throw new TypeError("ZaloStrategy require an Callback URL option");
        }

        passport.Strategy.call(this);
        this.name = "zalo";
        this._verify = verify;
        this._options = options;
        this._authURL = "https://oauth.zaloapp.com/v4/permission";
        this._accessTokenURL = "https://oauth.zaloapp.com/v4/access_token";
        this._getProfileURL = "https://graph.zalo.me/v2.0/me";
        this._fields = ["id","birthday","name", "gender", "picture"] /* Default fields */
    }
    /**
     * Authenticate request.
     *
     * This function must be overridden by subclasses.  In abstract form, it always
     * throws an exception.
     *
     * @param {Object} req The request to authenticate.
     * @param {Object} [options] Strategy-specific options.
     * @api public
     */
    authenticate(req, options) {
        const pair = req.session.pkce ?? getPkcePair(43);
        if (!req.session.pkce) req.session.pkce = pair;

        options = options || {};

        if (options.fields !== undefined){
            this._fields = options.fields;
        }

        var self = this;
        if (req.query && req.query.code) {
            // TODO get authen code by using https.get
            self.getOAuthAccessToken(req.query.code, req.session.pkce, (status, token_data) => {
                if (status === "err") 
                    return self.fail(token_data);

                self.getUserProfile(token_data, (profile_status, data) => {
                        if (profile_status === "err") 
                            return self.fail(data);

                        // Callback
                        self._verify(
                            token_data.access_token,
                            token_data.refresh_token,
                            data,
                            req.session,
                            function (err, user) {
                                if (err) return self.fail(err);
                                self.success(user);
                            }
                        );
                });
            });
        } else {
            const authUrl = new URL(self._authURL);
            const params = {
                app_id: self._options.appId,
                redirect_uri: self._options.callbackURL,
                code_challenge: pair.code_challenge,
                state: self._options.state,
            };

            // Set search params
            Object.entries(params).forEach(([key, value]) => {
                authUrl.searchParams.set(key, value);
            });

            this.redirect(authUrl.toString());
        }
    }
    /**
     * Get access token when have code return from request permission
     * URL to load is: https://oauth.zaloapp.com/v4/access_token?app_id={1}&app_secret={2}&code={3}
     *
     * @param {String} code
     * @param {Function} done
     * @api private
     */
    getOAuthAccessToken(code, pair, done) {
        const accessTokenURL = new URL(this._accessTokenURL);
        const accessTokenParams = {
            app_id: this._options.appId,
            grant_type: 'authorization_code',
            code: code,
            code_verifier: pair.code_verifier,
        };

        const body = Object.entries(accessTokenParams)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

        const requestOptions = {
            hostname: accessTokenURL.hostname,
            path: accessTokenURL.pathname,
            method: "POST",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(body),
                'secret_key': this._options.appSecret,
            }
        };

        const accessTokenRequest = https.request(requestOptions, (res) => {
            res.on("data", (d) => {
                const accessTokenObject = JSON.parse(d);
                if (accessTokenObject?.error !== undefined)
                    return done("err", accessTokenObject);
                
                done("success", accessTokenObject);
            });
        });

        accessTokenRequest.write(body);
        accessTokenRequest.end();
    }
    /**
     * Load basic user profile when we have access token
     * URL to load is: https://graph.zalo.me/v3.0/me?access_token=<User_Access_Token>&fields=id,birthday,name,gender,picture
     * 
     * @param {String} accessTokenObject
     * @param {Function} done
     * @api private
     */
    getUserProfile(accessTokenObject, done) {
        const profileUrl = new URL(this._getProfileURL);
        profileUrl.searchParams.set('access_token', accessTokenObject?.access_token || '');
        profileUrl.searchParams.set('fields',  this._fields.join(","));

        const requestOptions = {
            hostname: profileUrl.hostname,
            path: profileUrl.pathname + profileUrl.search,
            method: "GET",
            headers: {
                access_token: accessTokenObject?.access_token || ''
            }
        };

        const accessTokenRequest = https.request(requestOptions, (res) => {
            res.on("data", (d) => {
                const userProfile = JSON.parse(d);
                done("success", userProfile);
            });
        });

        accessTokenRequest.on("error", (error) => {
            done("err", error);
        });

        accessTokenRequest.end();
    }
}

/**
 * Inherit from `passport.Strategy`.
 */
util.inherits(ZaloStrategy, passport.Strategy);


/**
 * Expose `Strategy`.
 */
module.exports = ZaloStrategy;