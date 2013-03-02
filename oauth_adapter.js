Ti.include('lib/sha1.js');
Ti.include('lib/oauth.js');


WebController = require('webview');


// create an OAuthAdapter instance
var OAuthAdapter = function(pConsumerSecret, pConsumerKey, pSignatureMethod) {
	// will hold the consumer secret and consumer key as provided by the caller
    var consumerSecret = pConsumerSecret,
        consumerKey = pConsumerKey,

    // will set the signature method as set by the caller
        signatureMethod = pSignatureMethod,

    // the pin or oauth_verifier returned by the authorization process window
        pin = null,

    // will hold the request token and access token returned by the service
        requestToken = null,
        requestTokenSecret = null,
        accessToken = null,
        accessTokenSecret = null,

    // the accessor is used when communicating with the OAuth libraries to sign the messages
        accessor = {
            consumerSecret: consumerSecret,
            tokenSecret: ''
        },

    // holds actions to perform
        actionsQueue = [],

    // will hold UI components
        win = null,
        view = null,
        webView = null,
        webViewWrapper = null,
        receivePinCallback = null;

    this.loadAccessToken = function(pService) {
        Ti.API.debug('Loading access token for service [' + pService + '].');

        var file = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, pService + '.config');
        if (file.exists == false) return false;

        var contents = file.read();
        if (contents == null) return false;

        try {
            var config = JSON.parse(contents.text);
        }
        catch(ex) {
            return false;
        }
        if (config.accessToken) accessToken = config.accessToken;
        if (config.accessTokenSecret) accessTokenSecret = config.accessTokenSecret;

        Ti.API.debug('Loading access token: done [accessToken:' + accessToken + '][accessTokenSecret:' + accessTokenSecret + '].');
        return true;
    };
    this.saveAccessToken = function(pService) {
        Ti.API.debug('Saving access token [' + pService + '].');
        var file = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, pService + '.config');
        if (file == null) file = Ti.Filesystem.createFile(Ti.Filesystem.applicationDataDirectory, pService + '.config');
        file.write(JSON.stringify({
            accessToken: accessToken,
            accessTokenSecret: accessTokenSecret
        }));
        Ti.API.debug('Saving access token: done.');
    };
    this.destroyAccessToken = function(pService) {
        Ti.API.debug('Destroying access token [' + pService + '].');
        var file = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory, pService + '.config');
        if (file == null) Ti.API.debug('Error: Access token file not found.');
        else if (!file.deleteFile()) Ti.API.debug('Error: Unable to remove access token from filesystem.');
        else Ti.API.debug('Destroying access token: done.');
    };

    // will tell if the consumer is authorized
    this.isAuthorized = function(pService) {
        return (accessToken != null && accessTokenSecret != null) ||
            this.loadAccessToken(pService);
    };

    // creates a message to send to the service
    var createMessage = function(pUrl) {
        var message = {
            action: pUrl,
            method: 'POST',
            parameters: []
        };
        message.parameters.push(['oauth_consumer_key', consumerKey]);
        message.parameters.push(['oauth_signature_method', signatureMethod]);
        return message;
    };

    // returns the pin
    this.getPin = function() {
        return pin;
    };

    // requests a requet token with the given Url
    this.getRequestToken = function(pUrl, args) {
        accessor.tokenSecret = '';

        var message = createMessage(pUrl);
        message.parameters.push(['oauth_callback', 'oob']);
        OAuth.setTimestampAndNonce(message);
        OAuth.SignatureMethod.sign(message, accessor);

        var onSuccess = function(responseText) {
            var responseParams = OAuth.getParameterMap(responseText);
            requestToken = responseParams['oauth_token'];
            requestTokenSecret = responseParams['oauth_token_secret'];
    
            Ti.API.debug('request token got the following response:');
            Ti.API.debug(responseText);
            args.onSuccess(responseText);
        };
        
        Ti.API.debug("oauth_adapter#getRequestToken#HTTPClient");
        var client = new HTTPClient();
        client.module = "oauth_adapter#getRequestToken";
        client.onError = args.onFailure;
        client.onSuccess = onSuccess;
        client.onFailure = args.onFailure;
        client.requestType = 'POST';
        client.URL = OAuth.addToURL(pUrl, message.parameters);
        if (!client.send())
            ViewHelpers.displayError('Error', 'Must be connected to the internet to continue');
    };

    var destroyAuthorizeUI = function() {
        Ti.API.debug('destroyAuthorizeUI');
//        if (win == null) return;
//        try
//        {
//	        Ti.API.debug('destroyAuthorizeUI:webView.removeEventListener');
//            webView.removeEventListener('load', authorizeUICallback);
//	        Ti.API.debug('destroyAuthorizeUI:win.close()');
//            win.hide();
//        }
//        catch(ex)
//        {
//            Ti.API.debug('Cannot destroy the authorize UI. Ignoring.');
//        }

        webViewWrapper.getView().destroy();
    };

    // looks for the PIN everytime the user clicks on the WebView to authorize the APP
    // currently works with TWITTER
    var authorizeUICallback = function(e) {
        Ti.API.debug('authorizeUILoaded');

        var htmlSource = (e && e.source && e.source.html) ?
                e.source.html :
                webView.evalJS("document.getElementsByTagName('body')[0].innerHTML");
        //Ti.API.debug(htmlSource);

        var reg = /(<code\b[^>]*>)([0-9]+)(<\/code>)/gi;
        var ar = reg.exec(htmlSource);
        if(ar && ar[2]){
            pin = ar[2];
            Ti.API.debug('pin: ' + pin);
            if (receivePinCallback) setTimeout(receivePinCallback, 100);
            if (Ti.Platform.osname == "Android") win.close();
            destroyAuthorizeUI();
        }

    };

    // shows the authorization UI
    this.showAuthorizeUI = function(pUrl, pReceivePinCallback, account) {
        receivePinCallback = pReceivePinCallback;

//        win = Ti.UI.createWindow({
//            modal: true,
//            fullscreen: true,
//            zIndex: 30
//        });
//        var transform = Ti.UI.create2DMatrix().scale(0);
//        view = Ti.UI.createView({
//            top: 5,
//            width: iRatio(620),
//            height: iRatio(800),
//            border: 10,
//            backgroundColor: 'white',
//            borderColor: '#aaa',
//            borderRadius: iRatio(40),
//            borderWidth: iRatio(10),
//            zIndex: 30,
//            transform: transform
//        });
//        closeLabel = Ti.UI.createLabel({
//            textAlign: 'right',
//            font: {
//                fontWeight: 'bold',
//                fontSize: '12pt'
//            },
//            text: '(X)',
//            top: iRatio(20),
//            right: iRatio(24),
//            height: iRatio(28),
//            zIndex: 35
//        });
//        win.open();
//
//        webView = Ti.UI.createWebView({
//            url: pUrl,
//			autoDetect:[Ti.UI.AUTODETECT_NONE]
//        });
//        Ti.API.debug('Setting:['+Ti.UI.AUTODETECT_NONE+']');
//        webView.addEventListener('load', authorizeUICallback);
//        view.add(webView);
//
//        closeLabel.addEventListener('click', destroyAuthorizeUI);
//        view.add(closeLabel);
//
//        win.add(view);
//
//        var animation = Ti.UI.createAnimation();
//        animation.transform = Ti.UI.create2DMatrix();
//        animation.duration = 500;
//        view.animate(animation);

       webViewWrapper = WebController.initialize({
            URL: pUrl,
            onLoad: function(){
                authorizeUICallback();
            },
            oAuthTwitter: true
        });
        win = webViewWrapper.getView().getWindow();
        webView = webViewWrapper.getView().getWebView();
    };

    this.getAccessToken = function(pUrl, args) {
        accessor.tokenSecret = requestTokenSecret;

        var message = createMessage(pUrl);
        message.parameters.push(['oauth_token', requestToken]);
        message.parameters.push(['oauth_verifier', pin]);

        OAuth.setTimestampAndNonce(message);
        OAuth.SignatureMethod.sign(message, accessor);

        var parameterMap = OAuth.getParameterMap(message.parameters);
        for (var p in parameterMap)
        Ti.API.debug(p + ': ' + parameterMap[p]);

        var onSuccess = function(responseText) {
            var responseParams = OAuth.getParameterMap(responseText);
            accessToken = responseParams['oauth_token'];
            accessTokenSecret = responseParams['oauth_token_secret'];
    
            Ti.API.debug('*** get access token, Response: ' + responseText);
            processQueue();
            args.onSuccess(responseText);
        };

        Ti.API.debug("oauth_adapter#getAccessToken#HTTPClient");
        var client = new HTTPClient();
        client.module = "oauth_adapter#getAccessToken";
        client.onError = args.onFailure;
        client.onSuccess = onSuccess;
        client.onFailure = args.onFailure;
        client.requestType = 'POST';
        client.URL = pUrl;
        client.params = parameterMap;
        client.send();
    };

    var processQueue = function() {
        Ti.API.debug('Processing queue.');
        var q;
        while ((q = actionsQueue.shift()) != null)
        send(q.url, q.parameters, q.title, q.successMessage, q.errorMessage);

        Ti.API.debug('Processing queue: done.');
    };

    // TODO: remove this on a separate Twitter library
    var send = function(pUrl, pParameters, pTitle, pSuccessMessage, pErrorMessage, args) {
        Ti.API.debug('Sending a message to the service at [' + pUrl + '] with the following params: ' + JSON.stringify(pParameters));

        if (accessToken == null || accessTokenSecret == null) {

            Ti.API.debug('The send status cannot be processed as the client doesn\'t have an access token. The status update will be sent as soon as the client has an access token.');

            actionsQueue.push({
                url: pUrl,
                parameters: pParameters,
                title: pTitle,
                successMessage: pSuccessMessage,
                errorMessage: pErrorMessage
            });
            return;
        }

        accessor.tokenSecret = accessTokenSecret;

        var message = createMessage(pUrl);
        message.parameters.push(['oauth_token', accessToken]);
        for (var p in pParameters) message.parameters.push(pParameters[p]);
        OAuth.setTimestampAndNonce(message);
        OAuth.SignatureMethod.sign(message, accessor);

        var parameterMap = OAuth.getParameterMap(message.parameters);
        for (var p in parameterMap)
        Ti.API.debug(p + ': ' + parameterMap[p]);

        Ti.API.debug("oauth_adapter#HTTPClient");
        var client = new HTTPClient();
        client.module = "oauth_adapter";
        client.onError = args.onFailure;
        client.onSuccess = args.onSuccess;
        client.onFailure = args.onFailure;
        client.requestType = 'POST';
        client.URL = pUrl;
        client.params = parameterMap;
        client.send();
    };
    this.send = send;

};
