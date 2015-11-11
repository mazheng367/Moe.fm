(function() {
    WinJS.Namespace.define("Moefm.Messages", {
        NotConnectedNetwork: "未连接到网络的说( >﹏<。)～",
        NotConnectWlan: "亲~您未接到Wifi或以太网,是否继续？",
        ApproachingDataLimit: "流量已到极限，请注意!!!",
        OverDataLimit: "流量已超出上限!!!!",
        LoadDataError: "数据加载失败",
        CollectFaild: "收藏失败，可能由于您没有登录，请登录后重试",
        ExistsInDownloadList: "当前下载的歌曲已在缓存队列中存在，请不要重复添加",
        DownloadFailed: "下载失败，请稍后再试"
    });

    WinJS.Namespace.define("Moefm.Data", {
        PlayList: [],
        PlayingType: { Normal: 0, Wiki: 1, Fav: 2 },
        CurrentPlayType: undefined,
        ExtensionData: {}
    });
}());