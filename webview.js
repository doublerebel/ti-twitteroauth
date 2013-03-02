var WebView;
if (WebView == null){
    WebView = {};
    (function(){
        var onChangePassword,
            onSignOut,
            win,
            webView,
            onWebViewLoad,
            bringBackSkip;

        WebView.getWindow = function(){
            return win;
        };
        WebView.getWebView = function(){
            return webView;
        };
        function destroy() {
            if (win == null) return;
            try {
                Ti.API.debug('destroyAuthorizeUI#webView.removeEventListener');
                webView.removeEventListener('load', onWebViewLoad || noop);
                Ti.API.debug('destroyAuthorizeUI#window.close()');
                win.close();
            }
            catch(ex) {
                Ti.API.debug('Cannot destroy the authorize UI. Ignoring.');
            }
        }
        
        WebView.destroy = destroy;

        WebView.initialize = function(args){
            win = Ti.UI.createWindow({
                zIndex: 30
            });
            
            webView = Ti.UI.createWebView({
                top: 0,
                height: "600 dip",
                url: args.URL,
                autoDetect:[Ti.UI.AUTODETECT_NONE],
                scalesPageToFit: !args.webClip
            });

            onWebViewLoad = args.onWebViewLoad;
            
            if (args.oAuthTwitter) {
                webView.addEventListener('load', function(){
                    webView.addEventListener('load', args.onWebViewLoad || noop);
                });
            } else webView.addEventListener('load', function() {
                args.onWebViewLoad && args.onWebViewLoad();
            });

            win.addEventListener('android:back', destroy);
            
            win.add(webView);
            win.open();

            return WebView;
        };
    })();
}

var WebController;
if (WebController == null){
    WebController = {};
    (function() {
        var view;

        WebController.getView = function(){
            return view;
        };

        WebController.initialize = function(args){
            Ti.API.debug("WebController#initialize");
            view = WebView.initialize({
                URL: args.URL,
                onWebViewLoad: args.onLoad,
                webClip: args.webClip
            });
            return WebController;
        };
    })();
}