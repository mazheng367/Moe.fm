// 有关“页面控制”模板的简介，请参阅以下文档: 
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";

    WinJS.UI.Pages.define("/settings/login/login.html", {
        // 每当用户导航至此页面时都要调用此功能。它
        // 使用应用程序的数据填充页面元素。
        ready: function(element, options) {
            var localSettings = Windows.Storage.ApplicationData.current.localSettings.values;
            var accessToken = localSettings[Moefm.Extensions.AppConst.accessToken];

            var oLoginInfo = element.querySelector("#oLoginInfo");
            var oNoLogin = element.querySelector("#oNoLogin");

            if (accessToken) { //已登录
                oNoLogin.style.display = "none";
                oLoginInfo.removeAttribute("style");

                var app = WinJS.Application;
                if (app.sessionState.authorizeUser) {
                    var user = app.sessionState.authorizeUser;
                    document.querySelector("#imgUserCover").setAttribute("src", user.user_avatar.large);
                    document.querySelector("#lblUserName").innerText = user.user_nickname;
                } else {
                    //获取用户信息
                    var url = Moefm.Extensions.MoeHelper.generateRequestUrl("http://api.moefou.org/user/detail.json");
                    WinJS.xhr({ url: url }).done(function(response) {
                        var user = JSON.parse(response.response).response.user;
                        app.sessionState.authorizeUser = user;
                        document.querySelector("#imgUserCover").setAttribute("src", user.user_avatar.large);
                        document.querySelector("#lblUserName").innerText = user.user_nickname;
                    },function(e) {
                        if (e.status == 401) {
                            moeLogOut();
                        }
                    });
                }
            } else {
                oLoginInfo.style.display = "none";
                oNoLogin.removeAttribute("style");
            }
            var btnLogin = element.querySelector("#btnLogin");
            btnLogin.addEventListener("click", moefmLogin);


            var btnLogout = element.querySelector("#btnLogout");
            btnLogout.addEventListener("click", moeLogOut, false);
        },

        unload: function () {

            var btnLogin = document.querySelector("#btnLogin");
            btnLogin.removeEventListener("click", moefmLogin);

            var btnLogout = element.querySelector("#btnLogout");
            btnLogout.removeEventListener("click", moeLogOut);
        },

        updateLayout: function (element) {
            /// <param name="element" domElement="true" />
            // TODO:  响应布局的更改。
        }
    });

    function moefmLogin() {
        /// <summary>
        /// OAuth1.0 登录
        /// </summary>

        var oldDiv = document.querySelector("#__moefm_authorize_div");
        if (oldDiv != null) { //删除原有div
            document.body.removeChild(oldDiv);
        }

        var div = document.createElement("div");
        div.setAttribute("id", "__moefm_authorize_div");
        document.body.appendChild(div);

        WinJS.UI.Pages.render("/settings/authorize/authorize.html", div);

        window.focus();
    }

    function moeLogOut() {
        /// <summary>
        /// 注销
        /// </summary> 
        var oLoginInfo = document.querySelector("#oLoginInfo");
        var oNoLogin = document.querySelector("#oNoLogin");
        oLoginInfo.style.display = "none";
        oNoLogin.removeAttribute("style");

        //清除数据
        //清除缓存文件
        Windows.Storage.ApplicationData.current.localSettings.values.remove(Moefm.Extensions.AppConst.accessToken);
        Windows.Storage.ApplicationData.current.localSettings.values.remove(Moefm.Extensions.AppConst.accessTokenSecret);
        //清除物理文件
        Windows.Storage.ApplicationData.current.localFolder.tryGetItemAsync(Moefm.Extensions.AppConst.tokenFileName).done(function(item) {
            if (item) {
                item.deleteAsync().done(function() {}, function() {});
            }
        });
        //清除会话状态
        WinJS.Application.sessionState.authorizeUser = undefined;
    }
})();
