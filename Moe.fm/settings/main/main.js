// ページ コントロール テンプレートの概要については、次のドキュメントを参照してください:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function () {
    "use strict";

    WinJS.UI.Pages.define("/settings/main/main.html", {
        // この関数は、ユーザーがこのページに移動するたびに呼び出されます。
        // ページ要素にアプリケーションのデータを設定します。
        ready: function (element, options) {
            element.querySelector("#toggle1").addEventListener("change", imageToggleHandler, false);
            element.querySelector("#toggle2").addEventListener("change", tileToggleHandler, false);
            element.querySelector("#toggle3").addEventListener("change", tileHighQuality, false);

            //加载数据
            //图片
            var showImage = Windows.Storage.ApplicationData.current.localSettings.values["_show_image_"];
            if (showImage != null && typeof showImage != "undefined") {
                element.querySelector("#toggle1").winControl.checked = showImage;
            } else {
                element.querySelector("#toggle1").winControl.checked = true;
            }
            //磁贴
            var showTile = Windows.Storage.ApplicationData.current.localSettings.values["_show_tile_"];
            if (showTile != null && typeof showTile != "undefined") {
                element.querySelector("#toggle2").winControl.checked = showTile;
            } else {
                element.querySelector("#toggle2").winControl.checked = true;
            }
            //高品质音乐
            var highTile = Windows.Storage.ApplicationData.current.localSettings.values["__download_high_quality__"];
            if (highTile != null && typeof highTile != "undefined") {
                element.querySelector("#toggle3").winControl.checked = highTile;
            } else {
                element.querySelector("#toggle3").winControl.checked = true;
            }

        },

        unload: function () {
            document.querySelector("#toggle1").removeEventListener("change", imageToggleHandler);
            document.querySelector("#toggle2").removeEventListener("change", tileToggleHandler);
            document.querySelector("#toggle3").removeEventListener("change", tileHighQuality);
        },

        updateLayout: function (element) {
            /// <param name="element" domElement="true" />

            // TODO:  レイアウトの変更に対応します。
        }
    });

    function imageToggleHandler() {
        Windows.Storage.ApplicationData.current.localSettings.values["_show_image_"] = this.winControl.checked;
    }

    function tileToggleHandler() {
        if (this.winControl.checked == false) {
            Windows.UI.Notifications.TileUpdateManager.createTileUpdaterForApplication().clear();
        }
        Windows.Storage.ApplicationData.current.localSettings.values["_show_tile_"] = this.winControl.checked;
    }

    function tileHighQuality() {
        Windows.Storage.ApplicationData.current.localSettings.values["__download_high_quality__"] = this.winControl.checked;
    }
})();
