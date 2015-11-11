// ページ コントロール テンプレートの概要については、次のドキュメントを参照してください:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";

    WinJS.UI.Pages.define("/pages/download/download.html", {
        // この関数は、ユーザーがこのページに移動するたびに呼び出されます。
        // ページ要素にアプリケーションのデータを設定します。
        ready: function(element, options) {
            var appBar = document.getElementById("appBar").winControl;
            appBar.getCommandById("btn_app_refresh").hidden = true;

            //绑定下载列表
            var dList = Moefm.Download.DownloadListPromise;
            if (dList.length == 0) {
                var oNoData = document.querySelector("#oNoData");
                WinJS.Utilities.removeClass(oNoData, "moe-hidden")
            }
            var lsvDownloads = element.querySelector("#lsvDownloads").winControl;
            lsvDownloads.itemDataSource = dList.dataSource;
            lsvDownloads.itemTemplate = renderItemFunc;
            
            //var baseUrl = "http://moe.fm/explore?api=json&musics=1";
            //var MoeHelper = Moefm.Extensions.MoeHelper;
            //var musicUrl = MoeHelper.generateRequestUrl(baseUrl, false);
            //WinJS.xhr({ url: musicUrl }).done(function (response) {
            //    var entities = JSON.parse(response.responseText);                
            //    var lsvDownloads = document.querySelector("#lsvDownloads").winControl;
            //    lsvDownloads.itemDataSource = new WinJS.Binding.List(entities.response.musics).dataSource;

            //}, function (e) {
            //});
        },

        unload: function () {
            // TODO: このページからの移動に対応します。
            var appBar = document.getElementById("appBar").winControl;
            appBar.getCommandById("btn_app_refresh").hidden = false;
        },

        updateLayout: function (element) {
            /// <param name="element" domElement="true" />

            // TODO:  レイアウトの変更に対応します。
        }
    });


    function renderItemFunc(itemPromise, recycledElement) {
        return itemPromise.then(function (item) {
            var oNoData = document.querySelector("#oNoData");
            WinJS.Utilities.addClass(oNoData, "moe-hidden");
            

            var div = document.createElement("div");
            div.className = "search-item";
            //创建img
            var img = document.createElement("img");
            img.setAttribute("src", "/images-customer/cover_medium.png");
            div.appendChild(img);
            //创建标题
            var titleDiv = document.createElement("div");
            titleDiv.className = "title";
            div.appendChild(titleDiv);
            //创建进度条
            var progressDiv = document.createElement("div");
            progressDiv.className = "intro";
            var progress = document.createElement("progress");
            progress.setAttribute("value", "0");
            progressDiv.appendChild(progress);
            div.appendChild(progressDiv);
            //创建提示信息
            var toolTipDiv = document.createElement("div");
            toolTipDiv.className = "intro";
            toolTipDiv.innerText = "挂起";
            div.appendChild(toolTipDiv);

            function completed(xhr) {
                titleDiv.innerText = xhr.resultFile.name;
                toolTipDiv.innerText = "完成";
                progress.setAttribute("value", "1");
                var dList = Moefm.Download.DownloadListPromise;
                var itemIndex = dList.indexOf(item.data, 0);
                dList.splice(itemIndex, 1);
                if (dList.length == 0) {
                    WinJS.Utilities.removeClass(oNoData, "moe-hidden")
                }
            }

            function progressing(xhr) {
                var p = xhr.progress;
                titleDiv.innerText = xhr.resultFile.name;
                toolTipDiv.innerText = "正在下载";
                progress.setAttribute("value", p.bytesReceived / p.totalBytesToReceive);
            }

            function failed(xhr) {
                titleDiv.innerText = xhr.resultFile.name;
                toolTipDiv.innerText = "失败，请重试";
                toolTipDiv.style.color = "red";
            }

            if (item.data && WinJS.Promise.is(item.data)) {
                item.data.then(completed, failed, progressing);
            }

            return div;
        });
    }
})();