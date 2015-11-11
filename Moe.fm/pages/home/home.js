(function() {
    "use strict";
    var appBar = document.querySelector("#appBar").winControl;
    var taskResult = [0, 0];
    WinJS.UI.Pages.define("/pages/home/home.html", {
        // この関数は、ユーザーがこのページに移動するたびに呼び出されます。
        // ページ要素にアプリケーションのデータを設定します。
        ready: function(element, options) {
            this.removeEventHandlers = [];

            this._addRemovableEventHandler(document.querySelector("#lsvNewMusic"), "iteminvoked", itemInvokeHandler, false);
            this._addRemovableEventHandler(document.querySelector("#lsvHotMusic"), "iteminvoked", itemInvokeHandler, false);
            this._addRemovableEventHandler(document.querySelector("#lsvHotRadio"), "iteminvoked", itemInvokeHandler, false);
            this._addRemovableEventHandler(document.querySelector("#btnNewMusic"), "click", navItemsPageHandler, false);
            this._addRemovableEventHandler(document.querySelector("#btnHotMusic"), "click", navItemsPageHandler, false);
            this._addRemovableEventHandler(document.querySelector("#btnHotRadio"), "click", navItemsPageHandler, false);

            this._loadData();
            this._initAppBar();
            this._setAnimate(document.querySelector("#btnNewMusic"));
            this._setAnimate(document.querySelector("#btnHotRadio"));
        },

        updateLayout: function() {

        },

        unload: function() {
            for (var i = 0; i < this.removeEventHandlers.length; i++) {
                this.removeEventHandlers[i]();
            }
        },

        _loadData: function() {
            var mainData = Moefm.Helper.getDataFromSession("__MainPageData__");
            var lsvNewMusic = document.querySelector("#lsvNewMusic");
            var lsvHotMusic = document.querySelector("#lsvHotMusic");
            var lsvHotRadio = document.querySelector("#lsvHotRadio");

            if (mainData) { //如果缓存不为空，则从缓存中加载数据
                bindNewMusic(lsvNewMusic);
                bindListView(lsvHotMusic, mainData.hot_musics);
                bindListView(lsvHotRadio, mainData.hot_radios);

                setProgressBar(true);
            } else {
                bindNewMusic(lsvNewMusic);
                var MoeHelper = Moefm.Extensions.MoeHelper;
                var baseUrl = MoeHelper.generateRequestUrl("http://moe.fm/explore?api=json&hot_radios=1&hot_musics=1", false);
                WinJS.xhr({ url: baseUrl }).done(function(response) {
                    var entities = JSON.parse(response.responseText);
                    //缓存数据
                    Moefm.Helper.setDataToSession("__MainPageData__", entities.response);
                    //绑定数据
                    bindListView(lsvHotMusic, entities.response.hot_musics);
                    bindListView(lsvHotRadio, entities.response.hot_radios);
                    taskResult[0] = 1;
                    setProgressBar(true);
                }, function (e) {
                    taskResult[0] = 1;
                    Moefm.Helper.FailedFunction(e);
                    setProgressBar(true);
                });
            }
        },

        _initAppBar: function() {
            var btnAppRefresh = appBar.getCommandById("btn_app_refresh");
            this._addRemovableEventHandler(btnAppRefresh, "click", refreshEventHandler.bind(this), false);
        },

        _addRemovableEventHandler: function(elem, eventName, handler, capture) {
            elem.addEventListener(eventName, handler, capture);
            this.removeEventHandlers.push(function() {
                elem.removeEventListener(eventName, handler);
            });
        },

        _setAnimate: function(elem) {
            if (elem) {
                this._addRemovableEventHandler(elem, "mousedown", function() {
                    WinJS.UI.Animation.pointerDown(elem).done();
                }, false);
                this._addRemovableEventHandler(elem, "mouseup", function() {
                    WinJS.UI.Animation.pointerUp(elem).done();
                }, false);
            }
        }
    });

    function bindListView(listView, entities) {
        /// <summary>
        /// 绑定流行电台
        /// </summary>
        if (!listView) {
            return;
        }
        for (var i = 0; i < entities.length; i++) {
            var radio = entities[i];
            radio.wiki_title = radio.wiki_title.length > 25 ? (radio.wiki_title.substring(0, 25) + "...") : radio.wiki_title;
            entities[i].wiki_title = radio.wiki_title;
        }
        var hot_radios = new WinJS.Binding.List(entities);
        listView.winControl.itemDataSource = hot_radios.dataSource;
    }

    function bindNewMusic(listView) {
        /// <summary>
        /// 绑定新曲试听
        /// </summary>
        if (!listView) {
            return;
        }
        var dataKay = "__MainPageData_NewMusic__";
        var entities = Moefm.Helper.getDataFromSession(dataKay);
        if (entities) {
            bindListView(listView, entities);
        } else {
            try {
                WinJS.xhr({ url: "http://moe.fm/?r=" + Math.random() }).done(function(response) {
                    var page = new Moefm.Extensions.MoePage();
                    var json = page.getNewMusic(response.responseText);
                    entities = JSON.parse(json);
                    Moefm.Helper.setDataToSession(dataKay, entities);
                    bindListView(listView, entities);
                    taskResult[1] = 1;
                });
            } catch (e) {
                taskResult[1] = 1;
                Moefm.Helper.FailedFunction(e);
                setProgressBar(true);
            }
        }
    }

    function refreshEventHandler(e) {
        var context = this;
        var progHome = document.querySelector("#progHome");
        progHome && (progHome.removeAttribute("style"));
        //禁用刷新按钮
        var btnAppRefresh = appBar.getCommandById("btn_app_refresh");
        btnAppRefresh.disabled = true;
        var clearToken = setInterval(function() {
            if (taskResult.join("") === "11") {
                btnAppRefresh.disabled = false;
                taskResult[0] = 0;
                taskResult[1] = 0;
                clearInterval(clearToken);
            }
        }, 1000);

        WinJS.Promise.timeout(5).done(function () {
            Moefm.Helper.removeDataFromSession("__MainPageData__");
            Moefm.Helper.removeDataFromSession("__MainPageData_NewMusic__");
            context._loadData();
            appBar.hide();
        });
    }

    function itemInvokeHandler(e) {
    	/// <summary>
        /// 绑定点击事件
    	/// </summary>
        e.detail.itemPromise.done(function(args) {
            WinJS.Navigation.navigate("/pages/detail/detail.html", { data: args.data });
        });
    }

    function navItemsPageHandler(e) {
        var id = e.srcElement.getAttribute("id");
        var type = "music";
        if (id.indexOf("HotRadio") > -1) {
            type = "radio";
        }
        WinJS.Navigation.navigate("/pages/items/items.html", { wiki_type: type });
    }

    function setProgressBar(loaded) {
        if (loaded === true) {
            var progHome = document.querySelector("#progHome");
            progHome && (progHome.style.display = "none");
        }
    }
})();
