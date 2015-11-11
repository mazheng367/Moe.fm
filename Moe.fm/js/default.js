// ナビゲーション テンプレートの概要については、次のドキュメントを参照してください:
// http://go.microsoft.com/fwlink/?LinkId=232506
(function () {
    "use strict";

    var activation = Windows.ApplicationModel.Activation;
    var app = WinJS.Application;
    var nav = WinJS.Navigation;
    var sched = WinJS.Utilities.Scheduler;
    var ui = WinJS.UI;

    app.addEventListener("activated", function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                // TODO: このアプリケーションは新しく起動しました。ここでアプリケーションを
                // 初期化します。
            } else {
                // TODO: このアプリケーションは中断状態から再度アクティブ化されました。
                // ここでアプリケーションの状態を復元します。
            }

            app.sessionState.prevExecuteState = args.detail.previousExecutionState;

            nav.history = app.sessionState.history || {};
            nav.history.current.initialPlaceholder = true;

            // アプリケーションの負荷を最適化し、スプラッシュ スクリーンの表示中に優先度が高いスケジュール済み作業を実行します。
            ui.disableAnimations();
            var p = ui.processAll().then(function() {
                return nav.navigate(nav.location || Application.navigator.home, nav.state);
            }).then(function() {
                return sched.requestDrain(sched.Priority.aboveNormal + 1);
            }).then(function() {
                ui.enableAnimations();
            }).then(function() {
                document.getElementById("logo").addEventListener("click", function () {
                    var btnGoBack = document.querySelector("#btnGoBack").winControl;
                    if (nav.location !== "/pages/home/home.html") {
                        nav.navigate("/pages/home/home.html");
                    }
                    nav.history.backStack.clear();
                    btnGoBack.refresh();
                });
                //加载播放器
                WinJS.UI.Pages.render("/Moefm-Player/moefmPlayer.html", document.querySelector("#bottomPlayerContainer"));
            }).then(function() {
                var searchBox = document.getElementById("searchBox").winControl;
                searchBox.addEventListener("querysubmitted", function(args) {
                    if (!args.detail.queryText) {
                        return;
                    }
                    nav.navigate("/pages/search/search.html", { queryText: args.detail.queryText });
                });
            }).then(function() {
                app.onsettings = function(e) {
                    e.detail.applicationcommands = {
                        "loginDiv": { href: "/settings/login/login.html", title: "账户" },
                        "mainSettingsDiv": { href: "/settings/main/main.html", title: "选项" },
                        "aboutDiv": { href: "/settings/about/about.html", title: "关于" }
                    }
                    e.detail.e.request.applicationCommands.append(
                        new Windows.UI.ApplicationSettings.SettingsCommand("download", "缓存队列", function() {
                            nav.navigate("/pages/download/download.html");
                        }));
                    WinJS.UI.SettingsFlyout.populateSettings(e);
                };
            }).then(function () {
                //初始化，登录后的APPBar
                initAppBar();
            });
            args.setPromise(p);
        }
    });

    app.oncheckpoint = function (args) {
        // TODO: このアプリケーションは中断しようとしています。ここで中断中に
        // 維持する必要のある状態を保存します。アプリケーションが中断される前に 
        // 非同期操作を終了する必要がある場合は 
        // args.setPromise() を呼び出してください。
        app.sessionState.history = nav.history;
    };

    app.start();

    function initAppBar() {
        /// <summary>
        /// 初始化APPBar
        /// </summary>

        var appbar = document.querySelector("#appBar").winControl;
        var btnCollection = appbar.getCommandById("btn_app_myCollection");
        btnCollection.addEventListener("click", function() {
            WinJS.UI.SettingsFlyout.showSettings("popupCollection", "/pages/user/collection/collection.html");
            appbar.hide();
        });
    }
})();
