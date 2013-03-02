var OAuthAdapter = require('oauth_adapter');


var TwitterController = {};
(function(){
    var username,
        password,
        onTwitterLoginSuccess,
        onTwitterLoginFailure;

    function onOAuthAccessTokenSuccess(){
        oAuthAdapter.saveAccessToken('twitter');
        Ti.App.Properties.setBool('twitter_enabled', true);
        onTwitterLoginSuccess();
    }
    function onOAuthFailure(error){
        onTwitterLoginFailure(error);
    }
    function receivePin(){
        oAuthAdapter.getAccessToken('https://api.twitter.com/oauth/access_token', {
            onSuccess: onOAuthAccessTokenSuccess,
            onFailure: onOAuthFailure });
    }
    function onOAuthRequestTokenSuccess(responseText){
        oAuthAdapter.showAuthorizeUI('https://api.twitter.com/oauth/authorize?' +
        responseText,
        receivePin,
        { username: username, password: password });
    }

    TwitterController.isLoggedIn = function() {
        if (!oAuthAdapter) {
            oAuthAdapter = new OAuthAdapter(
                Ti.App.Properties.getString('TwitterConsumerSecret'),
                Ti.App.Properties.getString('TwitterConsumerKey'),
                'HMAC-SHA1'
            );
        }
        return oAuthAdapter.isAuthorized('twitter');
    };
    
    TwitterController.initialize = function(args){
        Ti.API.debug("TwitterController#initialize");
        var TwitterConsumerSecret = Ti.App.Properties.getString('TwitterConsumerSecret'),
            TwitterConsumerKey = Ti.App.Properties.getString('TwitterConsumerKey');
        oAuthAdapter = new OAuthAdapter(TwitterConsumerSecret, TwitterConsumerKey, 'HMAC-SHA1');
        onTwitterLoginSuccess = args.onTwitterLoginSuccess;
        onTwitterLoginFailure = args.onTwitterLoginFailure;

        if (!oAuthAdapter.isAuthorized('twitter')) {
            Ti.API.debug('TwitterController#Connecting to Twitter');
            oAuthAdapter.getRequestToken('http://api.twitter.com/oauth/request_token', {
                onSuccess: onOAuthRequestTokenSuccess,
                onFailure: onOAuthFailure
            });
        }
    };

    TwitterController.post = function(args){
        Ti.API.debug("TwitterController#post");
        oAuthAdapter.send('https://api.twitter.com/1/statuses/update.json',
            [['status', args.message + ' ' + args.link ]],
            'Twitter',
            'Published.',
            'Not published.',
            {
                onSuccess: args.onTwitterSuccess,
                onFailure: args.onTwitterFailure
            });
    };

    TwitterController.logout = function(args){
        if (!oAuthAdapter) oAuthAdapter = new OAuthAdapter();
        oAuthAdapter.destroyAccessToken('twitter');
        oAuthAdapter = null;
        Ti.App.Properties.setBool('twitter_enabled', false);
        args.onTwitterLogoutSuccess();
    };
})();


module.exports = TwitterController;
