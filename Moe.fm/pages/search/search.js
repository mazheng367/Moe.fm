// ページ コントロール テンプレートの概要については、次のドキュメントを参照してください:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";
    var appBar = document.getElementById("appBar").winControl;
    var lastPosition = 0, dataKey = "__Q_SearchBox_Any__";

    WinJS.UI.Pages.define("/pages/search/search.html", {
        // この関数は、ユーザーがこのページに移動するたびに呼び出されます。
        // ページ要素にアプリケーションのデータを設定します。
        ready: function (element, options) {
            //删除前面搜索页面的记录
            var nav = WinJS.Navigation;
            var stack = nav.history.backStack;
            if (stack && stack.length > 0) {
                var current = stack.where(function (item) { return item.location === "/pages/search/search.html"; });
                if (current) {
                    nav.history.backStack.cRemove(current);
                    Moefm.Helper.removeDataFromSession(dataKey);
                }
            }

            if (!options.queryText || !options.queryText.replace(" ", "")) {
                displayResult(element, false);
                return;
            }
            //定义临时存储区，用于存放临时数据
            this.customerData = {
                pageIndex: 1,
                dataList: new WinJS.Binding.List()
            };
            this.element = element;
            this.removeEventHandlers = [];

            this._initListView();
            this._loadData(options.goBack);
            this._initAppBar();
        },

        unload: function() {
            this.removeEventHandlers.forEach(function(handler) { handler.call(null); });
        },

        updateLayout: function(element) {
            /// <param name="element" domElement="true" />

            // TODO:  レイアウトの変更に対応します。
        },

        _loadData: function(isLoadCache) {
            /// <summary>
            /// 加载数据
            /// </summary>

            var element = this.element, that = this;
            showProgress(element, true);
            var queryText = encodeURI(document.querySelector("#searchBox").winControl.queryText);
            
            var cacheData = Moefm.Helper.getDataFromSession(dataKey);
            if (cacheData && isLoadCache) { //尝试从缓存中加载数据
                var listView = element.querySelector("#lsvSearchResult").winControl;
                listView.canceled = true;
                cacheData.forEach(function(items) {
                    items.data.forEach(function (item) { that.customerData.dataList.push(item); });
                    that.customerData.pageIndex = that.customerData.pageIndex + 1;
                });
                showProgress(element, false);
                listView.ensureVisible(lastPosition);
                lastPosition = 0;
                WinJS.Promise.timeout(1000).then(function() { listView.canceled = false; });
            } else {
                var postedUrl = 'http://api.moefou.org/search/wiki.json?wiki_type=music%2Cradio&keyword={0}&perpage=50&page={1}'
                    .format(queryText, this.customerData.pageIndex);
                postedUrl = Moefm.Extensions.MoeHelper.generateRequestUrl(postedUrl, false);
                WinJS.xhr({ url: postedUrl }).then(function(response) {
                    showProgress(element, false);
                    var responseEntity = JSON.parse(response.responseText).response;
                    var wikis = responseEntity.wikis;
                    var listView = element.querySelector("#lsvSearchResult");
                    if (!wikis || wikis.length == 0 || !listView) {
                        if (that.customerData.dataList.length == 0) {
                            displayResult(element, false);
                        }
                        that.customerData.pageIndex = 1;
                    } else {
                        listView = listView.winControl;
                        listView.canceled = true;
                        wikis.forEach(function(item) {
                            var intro = "木有简介(～￣▽￣～)";
                            if (item.wiki_meta && item.wiki_meta.length > 0) {
                                var meta = item.wiki_meta.where(function(m) { return m.meta_key == "简介"; });
                                if (meta) {
                                    intro = Moefm.Helper.cutString(meta.meta_value, 50);
                                }
                            }
                            item.wiki_intro = intro;
                            that.customerData.dataList.push(item);
                        });
                        var prevCache = Moefm.Helper.getDataFromSession(dataKey) || [];
                        prevCache.push({ pageIndex: that.customerData.pageIndex, data: wikis });
                        Moefm.Helper.setDataToSession(dataKey, prevCache); //缓存数据
                        that.customerData.pageIndex = that.customerData.pageIndex + 1;
                        if (wikis.length == 50) {
                            listView.canceled = false;
                        }
                    }
                }, function(e) {
                    showProgress(element, false);
                    Moefm.Helper.FailedFunction(e);
                    that.customerData.pageIndex = that.customerData.pageIndex + 1;
                    var listView = element.querySelector("#lsvSearchResult").winControl;
                    listView.canceled = false;
                });
            }
        },

        _initListView: function() {
            /// <summary>
            /// 初始化ListView
            /// </summary>
            var elem = this.element;
            var listView = elem.querySelector("#lsvSearchResult").winControl;
            this._addRemovableEventHandler(listView, "iteminvoked", searchResultItemInvokeHandler.bind(this), false);
            this._addRemovableEventHandler(listView, "loadingstatechanged", searchResultScrollHandler.bind(this), false);
            listView.itemDataSource = this.customerData.dataList.dataSource;
        },

        _initAppBar: function() {
            //刷新按钮
            var refreshBtn = appBar.getCommandById("btn_app_refresh");
            this._addRemovableEventHandler(refreshBtn, "click", refreshListEventHandler.bind(this), false);
        },

        _addRemovableEventHandler: function(elem, eventName, handler, capture) {
            elem.addEventListener(eventName, handler, capture);
            this.removeEventHandlers.push(function() {
                elem.removeEventListener(eventName, handler);
            });
        }
    });

    function displayResult(elem, display) {
        var listView = elem.querySelector("#lsvSearchResult");
        var panel = elem.querySelector("#oNoData");
        if (!listView) {
            return;
        }
        if (display) {
            WinJS.Utilities.removeClass(listView, "display-none");
            WinJS.Utilities.addClass(panel, "display-none");
        } else {
            WinJS.Utilities.addClass(listView, "display-none");
            WinJS.Utilities.removeClass(panel, "display-none");
        }
    }

    function searchResultItemInvokeHandler(args) {
    	/// <summary>
    	/// 查询项点击事件
    	/// </summary>
        args.detail.itemPromise.then(function (item) {
            //记录ListView最后点击的位置
            WinJS.Navigation.history.current.state.goBack = true;
            lastPosition = document.querySelector("#lsvSearchResult").winControl.indexOfLastVisible;
            WinJS.Navigation.navigate("/pages/detail/detail.html", { data: item.data });
        });
    }

    function searchResultScrollHandler(args) {
        /// <summary>
        /// 查询结果滚动事件
        /// </summary>
        var that = this;
        var listView = that.element.querySelector("#lsvSearchResult").winControl;
        listView.itemDataSource.getCount().then(function(count) {
            if (count > 0 && listView.loadingState == "complete") {
                if (listView.indexOfLastVisible === count - 1 && !listView.canceled) {
                    listView.canceled = true;
                    that._loadData();
                }
            }
        });
    }

    function refreshListEventHandler() {
    	/// <summary>
    	/// 刷新按钮
        /// </summary>
        //清空缓存
        var queryText = encodeURI(document.querySelector("#searchBox").winControl.queryText);
        var dataKey = "__Q_" + queryText + "_";
        Moefm.Helper.removeListDataFromSession(dataKey);

        var listView = this.element.querySelector("#lsvSearchResult").winControl;
        this.customerData.dataList = new WinJS.Binding.List();
        listView.itemDataSource = this.customerData.dataList.dataSource;
        this.customerData.pageIndex = 1;
        this._loadData();
    }

    function showProgress(elem, show) {
        ///进度条的隐藏与显示

        var bar = elem.querySelector("#pgSearchLoading");
        if (!bar) {
            return;
        }

        if (show) {
            WinJS.Utilities.removeClass(bar, "display-none");
        } else {
            WinJS.Utilities.addClass(bar, "display-none");
        }
    }
})();
