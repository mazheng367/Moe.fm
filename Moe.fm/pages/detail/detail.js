// ページ コントロール テンプレートの概要については、次のドキュメントを参照してください:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function() {
    "use strict";
    var appBar = document.getElementById("appBar").winControl;
    var _methodRebind = false;//重新绑定方法到当前对象
    var currentElem;
    WinJS.UI.Pages.define("/pages/detail/detail.html", {
        // この関数は、ユーザーがこのページに移動するたびに呼び出されます。
        // ページ要素にアプリケーションのデータを設定します。
        ready: function(element, options) {
            var wiki = options.data, thatObj = this;
            currentElem = element;

            function initData() {
                this.customerData.favInfo = { fav_obj_type: wiki.wiki_type, fav_obj_id: wiki.wiki_id, fav_type: 1 };
                document.getElementById("lblTitle").innerText = Moefm.Extensions.MoeHelper.htmlDecode(wiki.wiki_title); //标题
                document.getElementById("imgCover").setAttribute("src", wiki.wiki_cover.large); //封面
                var meta = wiki.wiki_meta && wiki.wiki_meta.where(function(item) { return item.meta_key === "简介"; });
                if (meta) {
                    document.getElementById("lblContent").value = Moefm.Extensions.MoeHelper.htmlDecode(meta.meta_value); //简介
                }

                if (!_methodRebind) { //重新绑定调用方法的对象
                    _methodRebind = true;
                    var invokeObj = this.customerData;
                    this.customerData.listViewScrollHandler = this.customerData.listViewScrollHandler.bind(invokeObj);
                    this.customerData.collectEventHandler = this.customerData.collectEventHandler.bind(invokeObj);
                    this.customerData.playAlbumEventHandler = this.customerData.playAlbumEventHandler.bind(invokeObj);
                    this.customerData.refreshListEventHandler = this.customerData.refreshListEventHandler.bind(invokeObj);
                    this.customerData.playListInvokeEventHandler = this.customerData.playListInvokeEventHandler.bind(invokeObj);
                }

                //绑定动画
                var btnPlayAlbum = element.querySelector("#btnPlayAlbum");
                btnPlayAlbum.addEventListener("pointerup", function (e) { WinJS.UI.Animation.pointerUp(e.srcElement); });
                btnPlayAlbum.addEventListener("pointerdown", function (e) { WinJS.UI.Animation.pointerDown(e.srcElement); });

                this.customerData.wiki = wiki;
                //设置ListView
                this.customerData.initListView();
                //初始化appbar
                this.customerData.initAppBar();
                //加载数据
                this.customerData.loadData(wiki);
            }

            if (!wiki.wiki_id) {//如果没有wiki_id，则表示从新曲试听专辑进入，重新加载数据
                var that = this,
                    datakey = "__NewMusic_" + wiki.id + "__",
                    url = Moefm.Extensions.MoeHelper.generateRequestUrl("http://api.moefou.org/music/detail.json?wiki_id=" + wiki.id);
                var enti = Moefm.Helper.getDataFromSession(datakey);
                if (enti) {
                    wiki = enti;
                    initData.call(that);
                } else {
                    WinJS.xhr({ url: url }).done(function(response) {
                        wiki = JSON.parse(response.responseText).response.wiki;
                        Moefm.Helper.setDataToSession(datakey, wiki);
                        initData.call(that);
                    });
                }
            } else {
                initData.call(this);
            }
            //定义重新刷新页面数据，收藏弹出框用
            WinJS.Namespace.define("Moefm.Nav", {
                NavDetail: function(data) {
                    thatObj.dispose();
                    wiki = data;
                    initData.call(thatObj);
                }
            });
        },

        unload: function() {
            // TODO: このページからの移動に対応します。
            this.dispose();
        },

        updateLayout: function(element) {
            /// <param name="element" domElement="true" />

            // TODO:  レイアウトの変更に対応します。
        },

        customerData: {
            wiki: {},
            songsList: new WinJS.Binding.List(),
            canceled: false,
            pageIndex: 1,
            hasNext: true,
            loadData: function() {
                /// <summary>
                /// 加载歌曲列表
                /// </summary>
                if (!this.hasNext) {
                    return;
                }
                var context = this;
                var wiki = this.wiki;
                var datakey = "__" + wiki.wiki_id + "_" + context.pageIndex + "__";
                var cacheData = Moefm.Helper.getDataFromSession(datakey);
                if (cacheData) {
                    if (typeof cacheData.hasNext == "boolean" && cacheData.hasNext === false) {
                        return;
                    }
                    cacheData && cacheData.forEach(function(item) { context.songsList.push(item); });
                    context.pageIndex++;
                    context.canceled = false;
                } else {
                    //没有缓存时，加载网络数据
                    var playListUrl = "http://moe.fm/listen/playlist?api=json&perpage=30&{0}={1}&page={2}".format(wiki.wiki_type, wiki.wiki_id, this.pageIndex);
                    var requestUrl = Moefm.Extensions.MoeHelper.generateRequestUrl(playListUrl, false);
                    WinJS.xhr({ url: requestUrl }).done(function(response) {
                        var data = JSON.parse(response.responseText).response;
                        if (data.information.is_target) {
                            data.playlist && data.playlist.forEach(function(item) { context.songsList.push(item); });
                            Moefm.Helper.setDataToSession(datakey, data.playlist); //缓存数据
                            context.pageIndex++;
                            context.canceled = false;
                            appBar.getCommandById("btn_app_play").disabled = false;
                        } else {
                            context.hasNext = false;
                            Moefm.Helper.setDataToSession(datakey, { hasNext: false }); //缓存数据
                        }
                    }, function(error) {
                        if (error.status === 404) {
                            context.pageIndex++;
                            context.loadData();
                        } else {
                            context.canceled = false;
                            Moefm.Helper.FailedFunction(error);
                        }
                    });
                }
            },
            listViewScrollHandler: function(e) {
                var listView = document.getElementById("lsvSongs").winControl;
                if (this.songsList.length > 0 && listView.loadingState == "complete") {
                    if (listView.indexOfLastVisible === this.songsList.length - 1 && !this.canceled) {
                        this.canceled = true;
                        this.loadData();
                    }
                }
            },
            collectEventHandler: function() {
                var params = "";
                for (var name in this.favInfo) {
                    params += (name + "=" + this.favInfo[name]);
                    params += "&";
                }
                params = encodeURI(params.substring(0, params.length - 1));
                var url = "http://api.moefou.org/fav/add.json?" + params;
                url = Moefm.Extensions.MoeHelper.generateRequestUrl(url);
                WinJS.xhr({ url: url }).then(function(response) {
                    Moefm.Helper.showNotify("收藏成功");
                }, function() {
                    Moefm.Helper.showNotify(Moefm.Messages.CollectFaild);
                });
            },
            playAlbumEventHandler: function() {
                Moefm.Data.PlayList.clear(); //清空播放列表
                Moefm.Data.CurrentPlayType = Moefm.Data.PlayingType.Wiki;
                Moefm.Data.ExtensionData.wiki = {
                    wiki_id: this.wiki.wiki_id,
                    wiki_type: this.wiki.wiki_type,
                    pageIndex: 1
                };
                playAlbum();
            },
            refreshListEventHandler: function() {
                //重置数据
                this.songsList = new WinJS.Binding.List();
                this.canceled = false;
                this.pageIndex = 1;
                this.hasNext = true;
                //清空缓存
                Moefm.Helper.removeListDataFromSession("__" + this.wiki.wiki_id);
                Moefm.Helper.removeListDataFromSession("__" + this.wiki.wiki_id + "_PlayList__");
                //重新绑定数据源
                var listView = document.querySelector("#lsvSongs").winControl;
                listView.itemDataSource = this.songsList.dataSource;
                listView.forceLayout();
                //加载数据
                this.loadData();
            },
            playListInvokeEventHandler: function (args) {
                var that = this;
                args.detail.itemPromise.then(function(e) {
                    Moefm.Data.PlayList.clear(); //清空播放列表
                    Moefm.Data.CurrentPlayType = Moefm.Data.PlayingType.Wiki;
                    //计算点击的项所在的页数
                    var num = e.index + 1;

                    Moefm.Data.ExtensionData.wiki = {
                        wiki_id: that.wiki.wiki_id,
                        wiki_type: that.wiki.wiki_type,
                        pageIndex: num % 30 === 0 ? (Math.ceil(num / 30) + 1) : (Math.ceil(num / 30)),
                        itemIndex: num - Math.floor(num / 30) * 30
                    };
                    Moefm.Data.PlayList.push({
                        id: e.data.sub_id,
                        url: e.data.url,
                        sub_title: e.data.sub_title,
                        cover: e.data.cover,
                        artist: e.data.artist.length > 0 ? e.data.artist : "",
                        wiki_title: e.data.wiki_title,
                        fav_sub: e.data.fav_sub
                    });
                    playAlbum();
                });
            },
            initListView: function() {
                var listView = document.querySelector("#lsvSongs").winControl;
                listView.addEventListener("loadingstatechanged", this.listViewScrollHandler);
                listView.addEventListener("iteminvoked", this.playListInvokeEventHandler);
                //更改布局
                var listLayout = new WinJS.UI.ListLayout();
                listView.layout = listLayout;
                //绑定数据
                listView.itemDataSource = this.songsList.dataSource;
                listView.forceLayout();
            },
            initAppBar: function() {
                //收藏
                appBar.hide();
                WinJS.Promise.timeout(10).then((function() {
                    var colBtn = appBar.getCommandById("btn_app_collect");
                    colBtn.hidden = false;
                    colBtn.addEventListener("click", this.collectEventHandler, false);
                    //播放专辑
                    var playBtn = appBar.getCommandById("btn_app_play");
                    playBtn.hidden = false;
                    playBtn.disabled = true;
                    playBtn.addEventListener("click", this.playAlbumEventHandler, false);
                    //刷新按钮
                    var refreshBtn = appBar.getCommandById("btn_app_refresh");
                    refreshBtn.addEventListener("click", this.refreshListEventHandler, false);

                    //绑定列表头按钮事件
                    var btnPlayAlbum = currentElem.querySelector("#btnPlayAlbum");
                    btnPlayAlbum.addEventListener("click", this.playAlbumEventHandler, false);
                }).bind(this));
            }
        },

        dispose: function() {
            /// <summary>
            /// 释放资源
            /// </summary>
            this.customerData.songsList = new WinJS.Binding.List();
            this.customerData.wiki = {};
            this.customerData.canceled = false;
            this.customerData.pageIndex = 1;
            this.customerData.hasNext = true;
            //释放listView
            var listView = document.getElementById("lsvSongs").winControl;
            listView.removeEventListener("loadingstatechanged", this.customerData.listViewScrollHandler, false);
            listView.removeEventListener("iteminvoked", this.customerData.playListInvokeEventHandler, false);
            //隐藏收藏按钮
            var colBtn = appBar.getCommandById("btn_app_collect");
            colBtn.removeEventListener("click", this.customerData.collectEventHandler);
            colBtn.hidden = true;
            //释放播放按钮
            var playBtn = appBar.getCommandById("btn_app_play");
            playBtn.hidden = true;
            playBtn.removeEventListener("click", this.customerData.playAlbumEventHandler);
            //释放刷新按钮
            var refreshBtn = appBar.getCommandById("btn_app_refresh");
            refreshBtn.removeEventListener("click", this.customerData.refreshListEventHandler, false);

            //释放列表头按钮事件
            var btnPlayAlbum = currentElem.querySelector("#btnPlayAlbum");
            btnPlayAlbum.removeEventListener("click", this.playAlbumEventHandler, false);
        }
    });

    function playAlbum() {
        var oMusicPlayer = document.getElementById("oMusicPlayer");
        try {
            var btnNext = document.querySelector("#__moe_btnNext__");
            btnNext && btnNext.click();
        } catch (e) {

        }
    }
})();
