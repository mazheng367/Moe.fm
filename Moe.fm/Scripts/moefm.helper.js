(function() {
    WinJS.Namespace.define("Moefm.Helper", {
        showNotify: function(text) {
            var notifications = Windows.UI.Notifications;
            var toastXml = notifications.ToastNotificationManager.getTemplateContent(notifications.ToastTemplateType.toastImageAndText01);
            toastXml.getElementsByTagName("text").item(0).appendChild(toastXml.createTextNode(text)); //文字
            toastXml.getElementsByTagName("image").item(0).setAttribute("src", "ms-appx:///images-customer/myhomepage_fans_header.png"); //图片
            notifications.ToastNotificationManager.createToastNotifier().show(new notifications.ToastNotification(toastXml));
        },
        confirm: function(message) {
            var isOK = false;
            var popup = new Windows.UI.Popups.MessageDialog(message);
            popup.commands.append(new Windows.UI.Popups.UICommand("允许", function() { isOK = true; }, "true"));
            popup.commands.append(new Windows.UI.Popups.UICommand("阻止", function() { isOK = false; }, "false"));
            return popup.showAsync();
        },
        alert: function(message) {
            var popup = new Windows.UI.Popups.MessageDialog(message);
            popup.showAsync();
        },
        cutString: function(s, len) {
            return Moefm.Extensions.MoeHelper.getShowInfo2(s, len);
        },
        setValue: function() {

        },
        FailedFunction: function(error) {
            var settings = Windows.Storage.ApplicationData.current.localSettings.values;
            if ("status" in error && error.status == 401 && settings[Moefm.Extensions.AppConst.accessToken]) {
                //表示error对象为xmlhttprequest 表示授权失效
                Moefm.Helper.showNotify("登录状态已过期，请重新登录");
                //清除缓存文件
                Windows.Storage.ApplicationData.current.localSettings.values.remove(Moefm.Extensions.AppConst.accessToken);
                Windows.Storage.ApplicationData.current.localSettings.values.remove(Moefm.Extensions.AppConst.accessTokenSecret);
                //清除物理文件
                Windows.Storage.ApplicationData.current.localFolder.tryGetItemAsync(Moefm.Extensions.AppConst.tokenFileName).done(function(item) {
                    if (item) {
                        item.deleteAsync().then(function() {
                            //隐藏底部菜单
                            var appBar = document.getElementById("appBar").winControl;
                            if (appBar) {
                                var intervalToken = setInterval(function() {
                                    if (appBar.hidden === false) {
                                        return;
                                    } else {
                                        clearInterval(intervalToken);
                                    }
                                });
                            }
                        }).done(function() {
                            delete Moefm.Helper.FailedFunction.retryTimes;
                        }, function() {
                            delete Moefm.Helper.FailedFunction.retryTimes;
                        });
                    }
                });
            } else {
                Moefm.Helper.showNotify("加载数据失败");
            }
            return WinJS.Promise.as(error);
        },
        setNotification: function(image, text) {
            var showTile = Windows.Storage.ApplicationData.current.localSettings.values["_show_tile_"];
            var notifications = Windows.UI.Notifications;
            if (showTile === false) {
                notifications.TileUpdateManager.createTileUpdaterForApplication().clear();
                return;
            }
            notifications.TileUpdateManager.createTileUpdaterForApplication().enableNotificationQueue(true);
            var tileType = notifications.TileTemplateType.tileWide310x150ImageAndText01;
            var tileXml = notifications.TileUpdateManager.getTemplateContent(tileType);
            tileXml.getElementsByTagName("image")[0].setAttribute("src", image);
            tileXml.getElementsByTagName("text")[0].innerText = text;
            notifications.TileUpdateManager.createTileUpdaterForApplication().update(new notifications.TileNotification(tileXml));

            var tileType2 = notifications.TileTemplateType.tileSquare150x150PeekImageAndText04;
            var tileXml2 = notifications.TileUpdateManager.getTemplateContent(tileType2);
            tileXml2.getElementsByTagName("image")[0].setAttribute("src", image);
            tileXml2.getElementsByTagName("text")[0].innerText = text;
            notifications.TileUpdateManager.createTileUpdaterForApplication().update(new notifications.TileNotification(tileXml2));
        },
        oAuth: new Moefm.Extensions.MoeOAuth(),
        setDataToSession: function(key, value) {
            /// <summary>
            /// 设置缓存到会话中
            /// </summary>
            if (!key || typeof key != "string") {
                return false;
            }
            if (typeof value == "undefined" && value == null) {
                return false;
            }
            var app = WinJS.Application;
            app.sessionState[key] = value;
            return true;
        },
        getDataFromSession: function(key) {
            /// <summary>
            /// 从会话中获取数据
            /// </summary>
            if (!key || typeof key != "string") {
                return null;
            }
            var app = WinJS.Application;
            return app.sessionState[key];
        },
        removeDataFromSession: function(key) {
            /// <summary>
            /// 从缓存中删除数据
            /// </summary>
            if (!key || typeof key != "string") {
                return false;
            }
            var app = WinJS.Application;
            delete app.sessionState[key];
            return app.sessionState[key] === undefined;
        },
        removeListDataFromSession: function(key) {
            /// <summary>
            /// 从缓存中删除数据列表
            /// </summary>
            if (!key || typeof key != "string") {
                return false;
            }
            var app = WinJS.Application;
            for (var name in app.sessionState) {
                if (name.indexOf(key) > -1) {
                    delete app.sessionState[name];
                    //app.sessionState[name] = undefined;
                }
            }
            return true;
        },
        EventHelper: WinJS.Class.define(function() {
            this.eventList = [];
        }, {
            addRemovableEventHandler: function(elem, eventName, handler, capture) {
                elem.addEventListener(eventName, handler, capture);
                this.eventList.push(function() {
                    elem.removeEventListener(eventName, handler);
                });
            },
            dispose: function() {
                for (var i = 0; i < this.eventList.length; i++) {
                    this.eventList[i].call(null);
                }
            }
        }, null)
    });

    WinJS.Namespace.define("Moefm.Download", {
        DownloadListPromise: new WinJS.Binding.List(), //下载队列
        downloadMusic: function downloadMusic(args) {
            /// <summary>
            /// 下载音乐
            /// </summary>
            this.disabled = true;

            var player = document.getElementById("oMusicPlayer");
            //检查下载的文件是否在下载队列中
            var downloader = Windows.Networking.BackgroundTransfer.BackgroundDownloader;
            var savedFolder = Windows.Storage.KnownFolders.musicLibrary;
            var info = player.itemInfo;
            var filename = decodeURI(info.sub_title) + Moefm.Extensions.MoeHelper.getExtension(info.url);
            var specialChars = "\/:*?\"<>|";
            for (var i = 0; i < specialChars.length; i++) {
                filename = filename.replace(specialChars[i], "");
            }
            savedFolder.createFileAsync(filename, Windows.Storage.CreationCollisionOption.replaceExisting).done(function(file) {
                var d = new downloader();
                var dPromise = d.createDownload(new Windows.Foundation.Uri(info.url), file).startAsync();
                Moefm.Download.DownloadListPromise.push(dPromise);
            }, function(error) {
                Moefm.Helper.showNotify(Moefm.Messages.DownloadFailed);
            });
        },
        resetDownloadButton: function() {
            var info = document.getElementById("oMusicPlayer").itemInfo;
            var appbar = document.getElementById("appBar").winControl;
            var downloader = Windows.Networking.BackgroundTransfer.BackgroundDownloader;
            var savedFolder = Windows.Storage.KnownFolders.musicLibrary;
            var filename = decodeURI(info.sub_title) + Moefm.Extensions.MoeHelper.getExtension(info.url);
            downloader.getCurrentDownloadsAsync().done(function (arr) {
                appbar.getCommandById("btn_app_download").disabled = false;
                if (arr.size > 0) {
                    for (var i = 0; i < arr.size; i++) {
                        if (arr[i].resultFile.name == filename) {
                            appbar.getCommandById("btn_app_download").disabled = true;
                            break;
                        }
                    }
                }
            });
        }
    });

    WinJS.Namespace.define("Moefm.PlayList", {
        addLog: function(item) {
            Moefm.Extensions.MoeHelper.addLogAsync(JSON.stringify(item));
        }
    });

    WinJS.Namespace.define("Moefm.Converter", {
        timeConverter: WinJS.Binding.converter(function(timestamp) {
            if (!timestamp) {
                return "0000-00-00 00:00:00";
            }
            var date = new Date(timestamp * 1000).toLocaleString().replace(/年|月/g, "-").replace(/日/g, " ");
            return date;
        }),
        htmlEncode: WinJS.Binding.converter(function(s) {
            return Moefm.Extensions.MoeHelper.htmlEncode(s);
        }),
        htmlDecode: WinJS.Binding.converter(function(s) {
            return Moefm.Extensions.MoeHelper.htmlDecode(s);
        })
    });

    WinJS.Utilities.markSupportedForProcessing(Moefm.Download.downloadMusic);
}());


