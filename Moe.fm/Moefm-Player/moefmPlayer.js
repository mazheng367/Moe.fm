// ページ コントロール テンプレートの概要については、次のドキュメントを参照してください:
// http://go.microsoft.com/fwlink/?LinkId=232511
(function() {
    "use strict";

    WinJS.UI.Pages.define("/Moefm-Player/moefmPlayer.html", {
        ready: function(element, options) {
            this.loadControls(); //加载控件集合
            this.bindDomListenerEvent();
            this.loadPlayList();
        },
        unload: function() {
            // TODO: このページからの移動に対応します。
        },
        updateLayout: function(element) {
            /// <param name="element" domElement="true" />
        },
        loadControls: function() {
            var controls = this.fields.controls;
            controls.player = document.querySelector("#oMusicPlayer");
            controls.lblTitle = document.querySelector("#__moe_lblTitle__");
            controls.imgCover = document.querySelector("#__moe_imgCover__");
            controls.lblAlbum = document.querySelector("#__moe_lblAlbum__");
            controls.lblArtist = document.querySelector("#__moe_lblArtist__");
            controls.btnNext = document.querySelector("#__moe_btnNext__");
            controls.btnPlay = document.querySelector("#__moe_btnPlay__");
            controls.progress_bar = document.querySelector("#__moe_progress_bar__");
            controls.progressPanel = document.querySelector("#__moe_progressPanel__");
            controls.bufferBar = document.querySelector("#__moe_bufferBar__");
            controls.lblTimeInfo = document.querySelector("#__moe_lblTimeInfo__");
            controls.volumePanel = document.querySelector("#__moe_volumePanel__");
            controls.btnLike = document.querySelector("#__moe_btnLike__");
            controls.btnDelete = document.querySelector("#__moe_btnDelete__");
        },
        loadPlayList: function() {
            /// <summary>
            /// 加载播放列表
            /// </summary>
            if (Moefm.Data.CurrentPlayType === Moefm.Data.PlayingType.Fav) {
                playFav(this);
            } else {
                playWikiAndNormal(this);
            }
        },
        bindDomListenerEvent: function() {
            /// <summary>
            /// 加载Dom监听事件
            /// </summary>
            if (!this.fields.registedDomListenerEvent) {
                var controls = this.fields.controls;
                var systemMedia = Windows.Media.SystemMediaTransportControls.getForCurrentView();
                //绑定方法
                bindEventHandler(controls.btnNext, "click", this.playNext.bind(this));
                bindEventHandler(controls.btnNext, "pointerup", function(e) {
                    WinJS.UI.Animation.pointerUp(e.srcElement);
                });
                bindEventHandler(controls.btnNext, "pointerdown", function(e) {
                    WinJS.UI.Animation.pointerDown(e.srcElement);
                });

                bindEventHandler(controls.player, "ended", this.playNext.bind(this));
                bindEventHandler(controls.player, "pause", function() {
                    systemMedia.playbackStatus = Windows.Media.MediaPlaybackStatus.paused;
                    WinJS.Utilities.removeClass(controls.btnPlay, "pause");
                    WinJS.Utilities.addClass(controls.btnPlay, "play");
                });
                bindEventHandler(controls.player, "play", function() {
                    controls.progress_bar.style.width = "0%";
                    systemMedia.playbackStatus = Windows.Media.MediaPlaybackStatus.playing;
                    WinJS.Utilities.removeClass(controls.btnPlay, "play");
                    WinJS.Utilities.addClass(controls.btnPlay, "pause");
                });
                bindEventHandler(controls.player, "timeupdate", function() {
                    controls.progress_bar.style.width = ((this.currentTime / this.duration) * 100.00) + "%"; //计算音频播放进度
                    if (controls.player.buffered && controls.player.buffered.length > 0 && controls.player.duration) { //计算歌曲缓冲进度
                        var endTime = controls.player.buffered.end(controls.player.buffered.length - 1);
                        controls.bufferBar.style.width = ((endTime / controls.player.duration) * 100) + "%";
                    }
                    //歌曲剩余时间
                    if (controls.player.duration) {
                        var remaining = parseInt(controls.player.duration - controls.player.currentTime);
                        var min = parseInt(remaining / 60);
                        min = min < 10 ? ("0" + min) : min;
                        var sec = remaining - 60 * min;
                        sec = sec < 10 ? ("0" + sec) : sec;
                        controls.lblTimeInfo.innerText = "-" + min + ":" + sec;
                    } else {
                        controls.lblTimeInfo.innerText = "-00:00";
                    }

                });
                bindEventHandler(controls.player, "error", function() {
                    controls.btnNext.click();
                });

                bindEventHandler(controls.btnPlay, "click", function() { //播放按钮点击事件
                    if (!controls.player.paused) {
                        controls.player.pause();
                    } else {
                        controls.player.play();
                    }
                });
                bindEventHandler(controls.progressPanel, "click", function(e) { //进度条点击事件
                    try {
                        var width = controls.progressPanel.clientWidth;
                        var widthPer = (e.x / width); //计算宽度百分比
                        if (!controls.player.ended) {
                            controls.player.currentTime = (controls.player.duration || 0) * widthPer;
                        }
                    } catch (ex) {
                    }
                });
                bindEventHandler(controls.volumePanel, "click", function(e) {
                    var width = controls.volumePanel.clientWidth;
                    var widthPer = (e.x / width); //计算宽度百分比
                    controls.volumePanel.querySelector(".bar").style.width = (100 * widthPer) + "%";
                    controls.player.volume = widthPer;
                });

                bindEventHandler(controls.btnLike, "click", function(e) {
                    var that = this;
                    if (this.sub_fav === true) { //已收藏
                        return;
                    }
                    if (!this.favInfo) { //收藏实体为空，退出
                        return;
                    }
                    this.sub_fav = true;
                    var params = '';
                    for (var name in this.favInfo) {
                        params += (name + "=" + this.favInfo[name]);
                        params += "&";
                    }
                    params = encodeURI(params.substring(0, params.length - 1));
                    var url = "http://api.moefou.org/fav/add.json?" + params;
                    url = Moefm.Extensions.MoeHelper.generateRequestUrl(url);
                    WinJS.xhr({ url: url }).then(function(response) {
                        Moefm.Helper.showNotify("收藏成功");
                        WinJS.Utilities.removeClass(that, "like");
                        WinJS.Utilities.addClass(that, "liked");
                    }, function() {
                        Moefm.Helper.showNotify(Moefm.Messages.CollectFaild);
                        that.sub_fav = false;
                    });
                });
                //系统音量面板事件
                var mediaControl = systemMedia;
                mediaControl.isEnabled = true;
                mediaControl.isPlayEnabled = true;
                mediaControl.isNextEnabled = true;
                mediaControl.isPauseEnabled = true;
                bindEventHandler(mediaControl, "buttonpressed", this.mediaControlButtonPressed.bind(this));
                this.fields.registedDomListenerEvent = true;
            }
        },
        playNext: function() {
            /// <summary>
            /// 播放下一首
            /// </summary>
            var MoeData = Moefm.Data;
            if (MoeData.PlayList.length == 0) {
                this.loadPlayList();
            } else {
                var item = MoeData.PlayList.pop();
                this.setInfo(item);
                Moefm.Helper.setNotification(item.cover.large, item.sub_title);
                //添加播放历史
                Moefm.PlayList.addLog(item);
            }
        },
        setInfo: function(playListInfo) {
            /// <summary>
            /// 设置页面
            /// </summary>
            var controls = this.fields.controls;
            controls.player.src = playListInfo.url;

            controls.player.itemInfo = playListInfo; //将当前播放的数据保存到播放元素上，用于下载文件
            controls.player.play();

            Moefm.Download.resetDownloadButton(); //重置下载按钮

            controls.lblTitle.innerText = Moefm.Extensions.MoeHelper.htmlDecode(playListInfo.sub_title);
            controls.imgCover.src = playListInfo.cover.large;
            controls.lblAlbum.innerText = Moefm.Extensions.MoeHelper.htmlDecode(playListInfo.wiki_title);
            controls.lblArtist.innerText = Moefm.Extensions.MoeHelper.htmlDecode(playListInfo.artist);
            controls.btnLike.favInfo = { fav_obj_id: playListInfo.id, fav_obj_type: "song", fav_type: 1 };

            if (playListInfo.fav_sub) {
                controls.btnLike.sub_fav = true;
                WinJS.Utilities.removeClass(controls.btnLike, "like");
                WinJS.Utilities.addClass(controls.btnLike, "liked");
            } else {
                controls.btnLike.sub_fav = false;
                WinJS.Utilities.addClass(controls.btnLike, "like");
                WinJS.Utilities.removeClass(controls.btnLike, "liked");
            }
            try {
                var systemMedia = Windows.Media.SystemMediaTransportControls.getForCurrentView();
                systemMedia.playbackStatus = Windows.Media.MediaPlaybackStatus.playing;
                var displayUpdater = systemMedia.displayUpdater;
                displayUpdater.type = Windows.Media.MediaPlaybackType.music;
                displayUpdater.musicProperties.artist = playListInfo.artist;
                displayUpdater.musicProperties.title = playListInfo.sub_title;
                displayUpdater.update();
            } catch (e) {

            }
        },
        mediaControlButtonPressed: function(e) {
            /// <summary>
            /// 系统面板按钮事件
            /// </summary>
            var controls = this.fields.controls;
            var systemMedia = Windows.Media.SystemMediaTransportControls.getForCurrentView();
            switch (e.button) {
            case Windows.Media.SystemMediaTransportControlsButton.pause:
                systemMedia.playbackStatus = Windows.Media.MediaPlaybackStatus.paused;
                controls.player.pause();
                break;
            case Windows.Media.SystemMediaTransportControlsButton.play:
                systemMedia.playbackStatus = Windows.Media.MediaPlaybackStatus.playing;
                controls.player.play();
                break;
            case Windows.Media.SystemMediaTransportControlsButton.next:
            case Windows.Media.SystemMediaTransportControlsButton.stop:
                this.playNext();
                break;
            default:
                break;
            }
        },
        progressClickHandler: function() {

        },
        fields: {
            controls: {},
            registedDomListenerEvent: false
        }
    });

    function bindEventHandler(target, event, handler) {
        /// <summary>
        /// 绑定事件
        /// </summary>
        target.removeEventListener(event, handler);
        target.addEventListener(event, handler);
    };

    function playWikiAndNormal(context) {
        /// <summary>
        /// 播放专辑和普通
        /// </summary>

        var extensions = Moefm.Extensions;
        var moeData = Moefm.Data;
        var url = "http://moe.fm/listen/playlist?api=json",
            wiki = moeData.ExtensionData.wiki;

        if (moeData.CurrentPlayType === moeData.PlayingType.Wiki && moeData.ExtensionData.wiki) { //如果当前播放类型为专辑，并且信息不为空
            if (wiki.itemIndex === 30) {
                wiki.pageIndex = wiki.pageIndex + 1;
            }
            url = (url + "&perpage=30&{0}={1}&page={2}").format(wiki.wiki_type, wiki.wiki_id, wiki.pageIndex);
            wiki.pageIndex = wiki.pageIndex + 1;
        }
        url = extensions.MoeHelper.generateRequestUrl(url);
        WinJS.xhr({ url: url }).done(function(response) {
            var entity = JSON.parse(response.responseText).response, low = 0;
            if (!entity.information.is_target) { //如果没有找到，则返回普通模式
                moeData.CurrentPlayType = moeData.PlayingType.Normal;
                if (moeData.ExtensionData) {
                    delete moeData.ExtensionData.wiki;
                }
            }
            if (moeData.CurrentPlayType === moeData.PlayingType.Wiki && moeData.ExtensionData.wiki) { //如果当前播放类型为专辑，并且信息不为空
                low = (wiki.itemIndex || 0);
                moeData.ExtensionData.wiki.itemIndex = 0;
            }
            for (var i = entity.playlist.length - 1; i >= low; i--) {
                var sub = entity.playlist[i];
                moeData.PlayList[entity.playlist.length - 1 - i] = {
                    id: sub.sub_id,
                    url: sub.url,
                    sub_title: sub.sub_title,
                    cover: sub.cover,
                    artist: sub.artist.length > 0 ? sub.artist : "",
                    wiki_title: sub.wiki_title,
                    fav_sub: sub.fav_sub
                };
            }
            context.playNext();
        }, function(e) {
            if (e.status === 404 && moeData.CurrentPlayType === moeData.PlayingType.Wiki) {
                context.loadPlayList();
            } else {
                Moefm.Helper.FailedFunction(e);
            }
        });
    }

    function playFav(context) {
        /// <summary>
        /// 播放收藏歌曲
        /// </summary>
        var nsData = Moefm.Data;
        nsData.ExtensionData.itemIndex = (nsData.ExtensionData.itemIndex || 0);
        if (nsData.ExtensionData.itemIndex === 5) {
            nsData.ExtensionData.pageIndex = nsData.ExtensionData.pageIndex + 1;
        }
        var url = Moefm.Extensions.MoeHelper.generateRequestUrl("http://api.moefou.org/user/favs/sub.json?perpage=5&page=" + nsData.ExtensionData.pageIndex);
        var list = [];
        WinJS.xhr({ url: url }).done(function(response) {
            var info = JSON.parse(response.responseText).response;
            if (info.information.count === 0) {
                Moefm.Data.CurrentPlayType = Moefm.Data.PlayingType.Normal;
                delete Moefm.Data.ExtensionData.pageIndex;
                playWikiAndNormal(context);
                return;
            }
            nsData.ExtensionData.pageIndex = nsData.ExtensionData.pageIndex + 1;
            var decode = Moefm.Extensions.MoeHelper.htmlDecode;
            for (var index = info.favs.length - 1; index >= nsData.ExtensionData.itemIndex; index--) {
                var sub = info.favs[index];
                var artist = decode(((sub.obj.sub_meta || []).where(function(item) { return item.meta_key === "演唱"; }) || { meta_value: "" }).meta_value);
                list[index - nsData.ExtensionData.itemIndex] = {
                    id: sub.obj.sub_id,
                    url: (sub.obj.sub_upload || [""])[0].up_url,
                    sub_title: decode(sub.obj.sub_title),
                    cover: sub.obj.wiki.wiki_cover,
                    artist: artist,
                    wiki_title: decode(sub.obj.wiki.wiki_title),
                    fav_sub: true
                };
            }
            nsData.ExtensionData.itemIndex = 0;
            for (var i = list.length - 1; i >= 0; i--) {
                nsData.PlayList.push(list[i]);
            }

            context.playNext();
        }, function (err) {
            if (err.status === 403) {
                Moefm.Data.CurrentPlayType = Moefm.Data.PlayingType.Normal;
                delete Moefm.Data.ExtensionData.pageIndex;
                playWikiAndNormal(context);
            } else {
                Moefm.Helper.FailedFunction();
            }
        });
    }
})();
