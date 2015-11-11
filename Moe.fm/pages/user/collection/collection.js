// 有关“页面控制”模板的简介，请参阅以下文档: 
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";

    var wikiList, songList, radioList;//列表

    var oAlbum, oSong, oRadio;//Div

    var optionAlbum, optionSong, optionRadio;//标签

    var currentElem;

    var wikiPageIndex = 1, songPageIndex = 1, radioPageIndex = 1;

    var lsvAlbum, lsvSong, lsvRadio;

    WinJS.UI.Pages.define("/pages/user/collection/collection.html", {
        // 每当用户导航至此页面时都要调用此功能。它
        // 使用应用程序的数据填充页面元素。
        ready:function(element, options) {
            currentElem = element;
            //检查是否登录
            var localSettings = Windows.Storage.ApplicationData.current.localSettings.values;
            var accessToken = localSettings[Moefm.Extensions.AppConst.accessToken];
            if (!accessToken) { //已登录
                var oNotLogin = element.querySelector("#oNotLogin");
                WinJS.Utilities.removeClass(oNotLogin, "hideThis");
                return;
            }
            //绑定元素
            oAlbum = element.querySelector("#oAlbum");
            oSong = element.querySelector("#oSong");
            oRadio = element.querySelector("#oRadio");

            //绑定点击标签页
            optionAlbum = element.querySelector("#optionAlbum");
            optionSong = element.querySelector("#optionSong");
            optionRadio = element.querySelector("#optionRadio");

            //初始化绑定集合
            wikiList = new WinJS.Binding.List();
            songList = new WinJS.Binding.List();
            radioList = new WinJS.Binding.List();

            //ListView与列表相关联
            lsvAlbum = element.querySelector("#lsvCollectionAlbum").winControl;
            lsvAlbum.itemDataSource = wikiList.dataSource;
            lsvAlbum.addEventListener("loadingstatechanged", wikiPagingHandler);
            lsvAlbum.addEventListener("iteminvoked", listViewItemInvoke);

            lsvSong = element.querySelector("#lsvCollectionSong").winControl;
            lsvSong.itemDataSource = songList.dataSource;
            lsvSong.addEventListener("loadingstatechanged", songPagingHandler);
            lsvSong.addEventListener("iteminvoked", songlistViewItemInvoke);

            lsvRadio = element.querySelector("#lsvCollectionRadio").winControl;
            lsvRadio.itemDataSource = radioList.dataSource;
            lsvRadio.addEventListener("loadingstatechanged", radioPagingHandler);
            lsvRadio.addEventListener("iteminvoked", listViewItemInvoke);

            //绑定点击按钮动画
            var btnPlayBtns = element.querySelector("#btnPlayBtns");
            btnPlayBtns.addEventListener("pointerdown", function (e) { WinJS.UI.Animation.pointerDown(e.srcElement); });
            btnPlayBtns.addEventListener("pointerup", function (e) { WinJS.UI.Animation.pointerUp(e.srcElement); });
            btnPlayBtns.addEventListener("click", playAlbum);
            //绑定点击切换标签页事件
            bindTabSlide(element);

            //初次进入页面时，绑定收藏专辑页面，滑动时在加载另外条目
            bindWiki(element);

            //退出时，清空数据
            element.querySelector("#flyoutCollection").addEventListener("afterhide", function() {
                lsvAlbum.removeEventListener("loadingstatechanged", wikiPagingHandler);
                lsvSong.removeEventListener("loadingstatechanged", songPagingHandler);
                lsvRadio.removeEventListener("loadingstatechanged", radioPagingHandler);

                lsvAlbum.removeEventListener("iteminvoked", listViewItemInvoke);
                lsvRadio.removeEventListener("iteminvoked", listViewItemInvoke);

                btnPlayBtns.removeAttribute("click", btnPlayBtns, false);

                lsvAlbum.canceled = lsvSong.canceled = lsvRadio.canceled = undefined;
                lsvAlbum = lsvSong = lsvRadio = undefined;
                wikiList = songList = radioList = undefined;
                oAlbum = oSong = oRadio = undefined;
                optionAlbum = optionSong = optionRadio = undefined;
                currentElem = undefined;
                wikiPageIndex = songPageIndex = radioPageIndex = 1;
            });
        },

        unload: function () {

        },

        updateLayout: function (element) {
            /// <param name="element" domElement="true" />
            // TODO:  响应布局的更改。
        }
    });

    function bindTabSlide(element) {
        /// <summary>
        /// 绑定标签页滑动
        /// </summary>
        optionAlbum.addEventListener("click", albumDivEnter, false);
        optionSong.addEventListener("click", songDivEnter, false);
        optionRadio.addEventListener("click", radioDivEnter, false);
    }

    function albumDivEnter() {
        WinJS.UI.Animation.exitContent(oRadio).done(function() { WinJS.Utilities.addClass(oRadio, "hideThis"); });
        WinJS.UI.Animation.exitContent(oSong).done(function() { WinJS.Utilities.addClass(oSong, "hideThis"); });
        WinJS.Utilities.removeClass(oAlbum, "hideThis");
        WinJS.UI.Animation.enterContent(oAlbum);

        //标签头
        WinJS.Utilities.removeClass(optionRadio, "col_current");
        WinJS.Utilities.removeClass(optionSong, "col_current");
        WinJS.Utilities.addClass(optionAlbum, "col_current");

        if (wikiList.length === 0) {//如果没有数据，加载数据
            bindWiki(currentElem);
        }
    }

    function songDivEnter() {
        WinJS.UI.Animation.exitContent(oAlbum).done(function () { WinJS.Utilities.addClass(oAlbum, "hideThis"); });
        WinJS.UI.Animation.exitContent(oRadio).done(function () { WinJS.Utilities.addClass(oRadio, "hideThis"); });
        WinJS.Utilities.removeClass(oSong, "hideThis");
        WinJS.UI.Animation.enterContent(oSong);

        //标签头
        WinJS.Utilities.removeClass(optionRadio, "col_current");
        WinJS.Utilities.removeClass(optionAlbum, "col_current");
        WinJS.Utilities.addClass(optionSong, "col_current");

        if (songList.length === 0) {//如果没有数据，加载数据
            bindSong(currentElem);
        }
    }

    function radioDivEnter() {
        WinJS.UI.Animation.exitContent(oAlbum).done(function () { WinJS.Utilities.addClass(oAlbum, "hideThis"); });
        WinJS.UI.Animation.exitContent(oSong).done(function () { WinJS.Utilities.addClass(oSong, "hideThis"); });
        WinJS.Utilities.removeClass(oRadio, "hideThis");
        WinJS.UI.Animation.enterContent(oRadio);

        //标签头
        WinJS.Utilities.removeClass(optionAlbum, "col_current");
        WinJS.Utilities.removeClass(optionSong, "col_current");
        WinJS.Utilities.addClass(optionRadio, "col_current");

        if (radioList.length === 0) {//如果没有数据，加载数据
            bindRadio(currentElem);
        }
    }

    function bindWiki(element) {
        /// <summary>
        /// 绑定收藏专辑
        /// </summary>
        /// <param name="element"></param>
        var colRing = element.querySelector("#colRing");
        WinJS.Utilities.removeClass(colRing, "hideThis");
        var url = Moefm.Extensions.MoeHelper.generateRequestUrl("http://api.moefou.org/user/favs/wiki.json?obj_type=music&page=" + wikiPageIndex);
        WinJS.xhr({ url: url }).done(function(response) {
            wikiPageIndex += 1;
            WinJS.Utilities.addClass(colRing, "hideThis");
            var favs = JSON.parse(response.responseText).response.favs;
            if (!favs || favs.length === 0) {
                return;
            }
            lsvAlbum.canceled = false;
            favs.forEach(function(item) { wikiList.push (item); });
        }, function() {
            WinJS.Utilities.addClass(colRing, "hideThis");
        });
    }

    function bindSong(element) {
        /// <summary>
        /// 绑定歌曲
        /// </summary>
        var colRing = element.querySelector("#colRing");
        WinJS.Utilities.removeClass(colRing, "hideThis");
        var url = Moefm.Extensions.MoeHelper.generateRequestUrl("http://api.moefou.org/user/favs/sub.json?page=" + songPageIndex);
        WinJS.xhr({ url: url }).done(function (response) {
            songPageIndex += 1;
            WinJS.Utilities.addClass(colRing, "hideThis");
            var favs = JSON.parse(response.responseText).response.favs;
            if (!favs || favs.length === 0) {
                return;
            }
            lsvSong.canceled = false;
            favs.forEach(function (item) { songList.push(item); });
        }, function () {
            WinJS.Utilities.addClass(colRing, "hideThis");
        });
    }

    function bindRadio(element) {
        /// <summary>
        /// 绑定电台
        /// </summary>
        var colRing = element.querySelector("#colRing");
        WinJS.Utilities.removeClass(colRing, "hideThis");
        var url = Moefm.Extensions.MoeHelper.generateRequestUrl("http://api.moefou.org/user/favs/wiki.json?obj_type=radio&page=" + radioPageIndex);
        WinJS.xhr({ url: url }).done(function (response) {
            radioPageIndex += 1;
            WinJS.Utilities.addClass(colRing, "hideThis");
            var favs = JSON.parse(response.responseText).response.favs;
            if (!favs || favs.length === 0) {
                return;
            }
            lsvRadio.canceled = false;
            favs.forEach(function (item) { radioList.push(item); });
        }, function () {
            WinJS.Utilities.addClass(colRing, "hideThis");
        });
    }

    function wikiPagingHandler() {
        listViewScrollHandler(lsvAlbum, bindWiki);
    }

    function songPagingHandler() {
        listViewScrollHandler(lsvSong, bindWiki);
    }

    function radioPagingHandler() {
        listViewScrollHandler(lsvRadio, bindWiki);
    }

    function listViewScrollHandler(listView, callback) {
        listView.itemDataSource.getCount().then(function(count) {
            if (count > 0 && listView.loadingState === "complete") {
                if (listView.indexOfLastVisible === count - 1 && !listView.canceled) {
                    listView.canceled = true;
                    callback(currentElem);
                }
            }
        });
    }

    function listViewItemInvoke(args) {
        args.detail.itemPromise.then(function(item) {
            var nav = WinJS.Navigation;
            if (nav.location !== "/pages/detail/detail.html") {
                nav.navigate("/pages/detail/detail.html", { data: item.data.obj });
            } else {
                Moefm.Nav.NavDetail(item.data.obj);
            }
        });
    }

    function songlistViewItemInvoke(args) {
        args.detail.itemPromise.then(function(item) {
            Moefm.Data.PlayList.clear(); //清空播放列表
            Moefm.Data.CurrentPlayType = Moefm.Data.PlayingType.Fav;
            var num = item.index + 1;
            Moefm.Data.ExtensionData.pageIndex = num % 5 === 0 ? (Math.ceil(num / 5) + 1) : (Math.ceil(num / 5));
            Moefm.Data.ExtensionData.itemIndex = num - Math.floor(num / 5) * 5;
            var artist = (item.data.obj.wiki.wiki_meta.where(function(o) { return["艺术家", "演唱", "录音"].indexOf(o.meta_key) > -1; }) || {}).meta_value;
            Moefm.Data.PlayList.push({
                id: item.data.obj.sub_id,
                url: item.data.obj.sub_upload[0].up_url,
                sub_title: item.data.obj.sub_title,
                cover: item.data.obj.wiki.wiki_cover,
                artist: artist || "",
                wiki_title: item.data.obj.wiki.wiki_title,
                fav_sub: true
            });

            var btnNext = document.querySelector("#__moe_btnNext__");
            btnNext && btnNext.click();
        });
    }

    function playAlbum() {
        Moefm.Data.PlayList.clear(); //清空播放列表
        Moefm.Data.CurrentPlayType = Moefm.Data.PlayingType.Fav;
        Moefm.Data.ExtensionData.pageIndex = 1;
        try {
            var btnNext = document.querySelector("#__moe_btnNext__");
            btnNext && btnNext.click();
        } catch (e) {

        }
    }
})();