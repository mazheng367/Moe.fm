// ページ コントロール テンプレートの概要については、次のドキュメントを参照してください:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";

    WinJS.UI.Pages.define("/settings/authorize/authorize.html", {
        // この関数は、ユーザーがこのページに移動するたびに呼び出されます。
        // ページ要素にアプリケーションのデータを設定します。
        ready: function(element, options) {
            // TODO: ここでページを初期化します。
            var webview = document.querySelector("#__moe_webview__");
            webview.addEventListener("MSWebViewNavigationCompleted", function(e) {
                var ring = document.querySelector("#__moe_view_ring__");
                if (e.uri.indexOf("oauth/verifier") == -1) {
                    WinJS.Utilities.addClass(ring, "display-none");
                }
            });

            webview.addEventListener("MSWebViewNavigationStarting", function (e) {
                var ring = document.querySelector("#__moe_view_ring__");
                WinJS.Utilities.removeClass(ring, "display-none");
                if (e.uri.indexOf("oauth/verifier") > -1) { //验证验证码
                    moeVerifier(e.uri);
                    WinJS.Utilities.addClass(webview, "display-none");
                    var oMsgDiv = document.createElement("div");
                    oMsgDiv.setAttribute("class", "warning_msg");
                    oMsgDiv.innerText = "授权中，请不要关闭窗口，授权即将完成.....";
                    document.querySelector("#__moefm_main_page__").appendChild(oMsgDiv);
                }
            });

            document.querySelector("#__moefm_au_con__").addEventListener("click", function () {
                var div = document.querySelector("#__moefm_authorize_div");
                document.body.removeChild(div);
            });

            moeAuthorize();//开始授权
        },

        unload: function() {
            // TODO: このページからの移動に対応します。
        },

        updateLayout: function(element) {
            /// <param name="element" domElement="true" />

            // TODO:  レイアウトの変更に対応します。
        }
    });

    function moeAuthorize() {
        /// <summary>
        /// 萌否电台授权方法
        /// </summary>
        var oAuth = new Moefm.Extensions.MoeOAuth();
        oAuth.getRequestTokenAsync().then(function() {
            return oAuth.getAuthorizeUrlAsync();
        }, failedFunc).then(function(url) {
            var webView = document.querySelector("#__moe_webview__");
            webView.navigate(url);
        });
    }

    function moeVerifier(url) {
        /// <summary>
        /// 验证返回验证码
        /// </summary>
        var oauth = new Moefm.Extensions.MoeOAuth();
        oauth.getAccessTokenAsync(url).then(function(success) {
            if (success === true) {
                Moefm.Helper.showNotify("授权成功 (￣▽￣)");
                var div = document.querySelector("#__moefm_authorize_div");
                document.body.removeChild(div);
            }
        }, failedFunc);
    }

    function failedFunc(error) {
        Moefm.Helper.showNotify(error.message);
    }
})();
