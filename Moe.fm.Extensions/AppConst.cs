using System;
using System.Threading.Tasks;
using Windows.Data.Json;
using Windows.Foundation;
using Windows.Storage;
using UnicodeEncoding = Windows.Storage.Streams.UnicodeEncoding;

namespace Moefm.Extensions
{
    public sealed class AppConst
    {
        public static string TokenFileName
        {
            get { return "TokenFileName.bin"; }
        }

        public static string AccessToken
        {
            get { return "access_token"; }
        }

        public static string AccessTokenSecret
        {
            get { return "access_token_secret"; }
        }

        public static string MoeAppKey
        {
            get { return "96e9b6fd2b0d408290031f1f36b8ff1a053bb80f7"; }
        }

        public static string ConsumerSecret
        {
            get { return "a684fb82fe6407af53fffb805ff3e2cf"; }
        }

        public static IAsyncOperation<bool> GetAppKeyAsync()
        {
            return Task.Run(async () =>
            {
                var item = await ApplicationData.Current.LocalFolder.TryGetItemAsync(TokenFileName);
                var file = item as StorageFile;
                if (file == null) //如果没有授权，则返回原始APP
                {ApplicationData.Current.LocalSettings.Values.Remove(AccessToken);
                    ApplicationData.Current.LocalSettings.Values.Remove(AccessTokenSecret);
                    return false;
                }
                var data = await FileIO.ReadTextAsync(file, UnicodeEncoding.Utf8);
                var jObj = JsonObject.Parse(data);

                ApplicationData.Current.LocalSettings.Values[AccessToken] = jObj.GetNamedString(AccessToken);
                ApplicationData.Current.LocalSettings.Values[AccessTokenSecret] = jObj.GetNamedString("access_token_secret");
                return true;
            }).AsAsyncOperation();
        }
    }
}
