// ページ コントロール テンプレートの概要については、次のドキュメントを参照してください:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function() {
    "use strict";
    var appBar = document.querySelector("#appBar").winControl;

    WinJS.UI.Pages.define("/pages/items/items.html", {
        // この関数は、ユーザーがこのページに移動するたびに呼び出されます。
        // ページ要素にアプリケーションのデータを設定します。
        ready: function(element, options) {
            this.EventHelper = new Moefm.Helper.EventHelper();
            this.wiki.wiki_type = options.wiki_type;
            this.wiki.pageIndex = 1;
            this.wiki.data = new WinJS.Binding.List();
            this.wiki.element = element;

            initAppBar.call(this);
            initFilterPage.call(this);
            initControl.call(this);

            this.loadData(element);
        },

        unload: function() {
            // TODO: このページからの移動に対応します。
            this.EventHelper.dispose();
            var btn_app_filter = appBar.getCommandById("btn_app_filter");
            btn_app_filter.hidden = true;
        },

        updateLayout: function(element) {
            /// <param name="element" domElement="true" />
            // TODO:  レイアウトの変更に対応します。
        },

        loadData: function() {
            var that = this, elem = arguments[0], lsvWikis = elem.querySelector("#lsvWikis").winControl;
            var url = this.getPostUrl();
            var dataKey = this.getDataKeyPrefix() + "_" + this.wiki.pageIndex + "__";
            showProgress(elem, true);
            var cacheData = Moefm.Helper.getDataFromSession(dataKey);
            if (cacheData) {
                lsvWikis.canceled = true;
                cacheData.forEach(function(item) { that.wiki.data.push(item); });
                that.wiki.pageIndex = that.wiki.pageIndex + 1;
                if (cacheData.length == 30) {
                    lsvWikis.canceled = false;
                }
                showProgress(elem, false);
            } else {
                WinJS.xhr({ url: url }).done(function(response) {
                    showProgress(elem, false);
                    var entity = JSON.parse(response.responseText);
                    var wikis = entity.response.wikis;
                    if (wikis && wikis.length > 0) {
                        wikis.forEach(function (item) {
                            var intro = "木有简介(～￣▽￣～)";
                            if (item.wiki_meta && item.wiki_meta.length > 0) {
                                var meta = item.wiki_meta.where(function(m) { return m.meta_key == "简介"; });
                                if (meta) {
                                    intro = Moefm.Helper.cutString(meta.meta_value, 50);
                                }
                            }
                            item.wiki_intro = intro;
                            that.wiki.data.push(item);
                        });
                        Moefm.Helper.setDataToSession(dataKey, wikis); //缓存数据
                        that.wiki.pageIndex = that.wiki.pageIndex + 1;
                        if (wikis.length >= 30) {
                            lsvWikis.canceled = false;
                        }
                    } else {
                        if (that.wiki.data.length == 0) {
                            displayResult(arguments[0], false);
                        }
                    }
                }, function(e) {
                    lsvWikis.canceled = false;
                    Moefm.Helper.FailedFunction(e);
                    showProgress(elem, false);
                });
            }
        },

        wiki: {},

        getDataKeyPrefix: function() {
            var wiki = this.wiki;
            var dataKey = "__M_" + wiki.wiki_type;
            if (wiki.year) {
                dataKey += "_" + wiki.year;
            }
            if (wiki.month) {
                dataKey += "_" + wiki.month;
            }
            if (wiki.alpha) {
                dataKey += "_" + wiki.alpha;
            }
            return dataKey;
        },

        getPostUrl: function() {
            var url = "http://api.moefou.org/wikis.json?wiki_type={0}&perpage=30&page={1}".format(this.wiki.wiki_type, this.wiki.pageIndex);
            var wiki = this.wiki;
            if (wiki.year && wiki.month) {
                url += "&date=" + encodeURI(wiki.year + "-" + wiki.month);
            } else if (wiki.year) {
                url += "&date=" + wiki.year;
            }
            if (wiki.alpha) {
                url += "&initial=" + wiki.alpha;
            }
            url = Moefm.Extensions.MoeHelper.generateRequestUrl(url, false);
            return url;
        }
    });

    function initAppBar() {
        var that = this;

        var btn_app_filter = appBar.getCommandById("btn_app_filter");
        btn_app_filter.hidden = false;
        this.EventHelper.addRemovableEventHandler(btn_app_filter, "click", function() {
            WinJS.UI.SettingsFlyout.showSettings("settingFilter");
            appBar.hide();
        }, false);

        var btn_app_refresh = appBar.getCommandById("btn_app_refresh");
        this.EventHelper.addRemovableEventHandler(btn_app_refresh, "click", function () {
            that.wiki.pageIndex = 1;
            delete that.wiki.year;
            delete that.wiki.month;
            delete that.wiki.alpha;

            that.wiki.data = new WinJS.Binding.List();

            var lsvWikis = document.getElementById("lsvWikis").winControl;
            lsvWikis.itemDataSource = that.wiki.data.dataSource;

            var dataKey = "__M_" + that.wiki.wiki_type + "_";
            Moefm.Helper.removeListDataFromSession(dataKey);
            that.loadData(that.wiki.element);
        }, false);
    }

    function initFilterPage() {
        var alphaFilter = document.getElementById("alphaFilter");
        for (var i = 65; i <= 90; i++) {
            var oDiv = document.createElement("div");
            oDiv.appendChild(document.createTextNode(String.fromCharCode(i)));
            oDiv.setAttribute("data-filter-value", String.fromCharCode(i));
            oDiv.setAttribute("data-filter-type", "alpha");
            alphaFilter.appendChild(oDiv);
        }

        var monthFilter = document.getElementById("monthFilter");
        for (var i = 1; i <= 12; i++) {
            var oDiv = document.createElement("div");
            oDiv.appendChild(document.createTextNode(i + "月"));
            oDiv.setAttribute("data-filter-value", i);
            oDiv.setAttribute("data-filter-type", "month");
            monthFilter.appendChild(oDiv);
        }

        var yearFilter = document.getElementById("yearFilter");
        var today = new Date();
        for (var i = today.getFullYear(); i >= today.getFullYear() - 10; i--) {
            var oDiv = document.createElement("div");
            oDiv.appendChild(document.createTextNode(i + "年"));
            oDiv.setAttribute("data-filter-value", i);
            oDiv.setAttribute("data-filter-type", "year");
            yearFilter.appendChild(oDiv);
        }

        //设置点击事件
        setFilterItem.call(this, alphaFilter);
        setFilterItem.call(this, monthFilter);
        setFilterItem.call(this, yearFilter);
    }

    function initControl() {
        var that = this;
        var lsvWikis = document.getElementById("lsvWikis").winControl;
        lsvWikis.itemDataSource = this.wiki.data.dataSource;

        this.EventHelper.addRemovableEventHandler(lsvWikis, "iteminvoked", function(args) {
            args.detail.itemPromise.then(function(item) {
                WinJS.Navigation.navigate("/pages/detail/detail.html", { data: item.data });
            });
        }, false);

        this.EventHelper.addRemovableEventHandler(lsvWikis, "loadingstatechanged", function(args) {
            lsvWikis.itemDataSource.getCount().then(function (count) {
                if (count > 0 && lsvWikis.loadingState == "complete") {
                    if (lsvWikis.indexOfLastVisible === count - 1 && !lsvWikis.canceled) {
                        lsvWikis.canceled = true;
                        that.loadData(that.wiki.element);
                    }
                }
            });
        }, false);
    }

    function displayResult(elem, display) {
        var listView = elem.querySelector("#lsvWikis");
        var panel = elem.querySelector("#oNoData");
        if (!listView) {
            return;
        }
        if (display) {
            WinJS.Utilities.removeClass(listView, "moe-hidden");
            WinJS.Utilities.addClass(panel, "moe-hidden");
        } else {
            WinJS.Utilities.addClass(listView, "moe-hidden");
            WinJS.Utilities.removeClass(panel, "moe-hidden");
        }
    }

    function showProgress(elem, show) {
        var bar = elem.querySelector("#pgLoadingBar");
        if (!bar) {
            return;
        }

        if (show) {
            WinJS.Utilities.removeClass(bar, "moe-hidden");
        } else {
            WinJS.Utilities.addClass(bar, "moe-hidden");
        }
    }

    function setFilterItem(oDiv) {
        var that = this;
        var arrDiv = oDiv.querySelectorAll("div");
        for (var index = 0; index < arrDiv.length; index++) {
            this.EventHelper.addRemovableEventHandler(arrDiv[index], "click", itemInvoked, false);
        }

        function itemInvoked() {
            //设置点击选中的颜色
            for (var j = 0; j < arrDiv.length; j++) {
                var item = arrDiv[j];
                WinJS.Utilities.removeClass(item, "item-selected");
                if (item === this) {
                    WinJS.Utilities.addClass(item, "item-selected");
                }
            }
            //设置查询条件
            var val = this.getAttribute("data-filter-value");
            var type = this.getAttribute("data-filter-type");
            that.wiki[type] = val;

            //根据查询条件，查询数据
            that.wiki.pageIndex = 1;
            that.wiki.data = new WinJS.Binding.List();

            var lsvWikis = that.wiki.element.querySelector("#lsvWikis").winControl;
            lsvWikis.itemDataSource = that.wiki.data.dataSource;
            var dataKey = that.getDataKeyPrefix();
            Moefm.Helper.removeListDataFromSession(dataKey);
            that.loadData(that.wiki.element);
        }
    }
})();
