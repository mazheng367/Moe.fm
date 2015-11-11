using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Windows.Data.Json;
using Windows.Foundation;
using Moefm.Extensions.Entities;
using Newtonsoft.Json;

namespace Moefm.Extensions
{
    public sealed class MoeHelper
    {
        public static IAsyncOperation<IList<PlayList>> FillPlayListAsync(string wiki_id, string wiki_type, bool useTask)
        {
            return Task.Run(() => FillDataToPlayList(wiki_id, wiki_type,useTask)).AsAsyncOperation();
        }

        /// <summary>
        /// 填充音乐播放列表
        /// </summary>
        /// <returns></returns>
        private static async Task<IList<PlayList>> FillDataToPlayList(string wiki_id, string wiki_type, bool useTask)
        {
            List<PlayList> playList = new List<PlayList>();
            int pageIndex = 1;
            bool isEnd = false;
            while (!isEnd)
            {
                string jsonStr = await GetJsonObject(wiki_id, wiki_type, pageIndex++);
                if (string.IsNullOrEmpty(jsonStr)) { continue; }
                JsonObject jsonObj = JsonObject.Parse(jsonStr);
                bool is_target = jsonObj.GetNamedObject("response").GetNamedObject("information").GetNamedBoolean("is_target");
                if (!is_target) //表示没有数据
                {
                    isEnd = true;
                    break; //并且列表中已经存在数据，则退出循环
                }
                JsonArray jsonArray = jsonObj.GetNamedObject("response").GetNamedArray("playlist");
                if (jsonArray != null && jsonArray.Count > 0)
                {
                    foreach (IJsonValue value in jsonArray)
                    {
                        var curObj = value.GetObject();
                        var playItem = new PlayList();

                        playItem.id = (int) curObj.GetNamedNumber("sub_id");
                        playItem.artist = curObj.GetNamedString("artist");
                        playItem.cover = curObj.GetNamedObject("cover").Stringify();
                        playItem.sub_title = curObj.GetNamedString("sub_title");
                        playItem.url = curObj.GetNamedString("url");
                        playItem.wiki_title = curObj.GetNamedString("wiki_title");
                        playItem.fav_sub = string.Empty;
                        if (curObj.ContainsKey("fav_sub"))
                        {
                            playItem.fav_sub = curObj["fav_sub"].Stringify();
                        }

                        playList.Add(playItem);
                    }
                }
            }
            return playList;
        }

        /// <summary>
        /// 生成Json
        /// </summary>
        /// <param name="wiki_id"></param>
        /// <param name="wiki_type"></param>
        /// <param name="pageIndex"></param>
        /// <returns></returns>
        private static async Task<string> GetJsonObject(string wiki_id, string wiki_type, int pageIndex)
        {
            string uri = string.Format("http://moe.fm/listen/playlist?api=json&perpage=30&{0}={1}&page={2}"
                , wiki_type
                , wiki_id
                , pageIndex.ToString());
            uri = MoeHelper.GenerateRequestUrl(uri);
            try
            {
                WebRequest request = WebRequest.Create(new Uri(uri));
                request.Method = "GET";
                var response = await request.GetResponseAsync();
                var jsonStr = string.Empty;
                using (StreamReader sr = new StreamReader(response.GetResponseStream()))
                {
                    jsonStr = await sr.ReadToEndAsync();
                }
                return jsonStr;
            }
            catch (WebException)
            {
                return string.Empty;
            }
        }

        /// <summary>
        /// 播放日志
        /// </summary>
        /// <param name="json"></param>
        /// <returns></returns>
        public static IAsyncOperation<bool> AddLogAsync(string json)
        {
            return Task.Run(() => AddLogInner(json)).AsAsyncOperation();
        }

        private static async Task<bool> AddLogInner(string json)
        {

            const string fileName = "PlayList.lst";
            var localFolder = Windows.Storage.ApplicationData.Current.LocalFolder;
            var file = await localFolder.CreateFileAsync(fileName, Windows.Storage.CreationCollisionOption.OpenIfExists);
            var item = JsonConvert.DeserializeObject<dynamic>(json);

            item.playedTime = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            var context = await Windows.Storage.FileIO.ReadTextAsync(file);
            if (string.IsNullOrEmpty(context))
            {
                context = "[]";
            }
            var logs = JsonConvert.DeserializeObject<List<dynamic>>(context);
            if (logs.Count == 0)
            {
                logs.Add(JsonConvert.DeserializeObject<dynamic>(json));
                await Windows.Storage.FileIO.WriteTextAsync(file, JsonConvert.SerializeObject(logs));
            }
            else
            {
                var findItem = logs.FirstOrDefault(f => f.id == item.id);
                if (findItem != null)
                {
                    //如果找到以前播放的历史，则修改播放时间
                    var index = logs.IndexOf(findItem);
                    logs[index].playedTime = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
                }
                else
                {
                    //加入播放历史
                    logs.Add(item);
                }
                await Windows.Storage.FileIO.WriteTextAsync(file, JsonConvert.SerializeObject(logs));
            }
            return true;
        }

        /// <summary>
        /// 生成资源访问URL
        /// </summary>
        /// <param name="url"></param>
        /// <returns></returns>
        public static string GenerateRequestUrl(string url)
        {
            var access_token = Convert.ToString(Windows.Storage.ApplicationData.Current.LocalSettings.Values[AppConst.AccessToken]);
            string appParam = string.Format("api_key={0}", AppConst.MoeAppKey);
            Uri uri = new Uri(url);
            OAuthBase oAuth = new OAuthBase();
            if (!string.IsNullOrEmpty(access_token))
            {
                string timeStamp = oAuth.GenerateTimeStamp();
                string nonce = oAuth.GenerateNonce();
                string nUrl = null;
                string pa = null;
                string access_token_secret = Windows.Storage.ApplicationData.Current.LocalSettings.Values[AppConst.AccessTokenSecret].ToString();
                var signature = oAuth.GenerateSignature(uri, AppConst.MoeAppKey, AppConst.ConsumerSecret, access_token, access_token_secret, "GET", timeStamp, nonce, string.Empty
                    , out nUrl, out pa);

                appParam = string.Format("{0}&oauth_signature={1}", pa, signature);
            }
            else
            {
                appParam = string.Format("api_key={0}&{1}&{2}", AppConst.MoeAppKey, uri.Query.Replace("?", string.Empty), "r=" + oAuth.GenerateTimeStamp());
            }
            string absoluteUri = string.IsNullOrEmpty(uri.Query) ? uri.AbsoluteUri : uri.AbsoluteUri.Replace(uri.Query, string.Empty);
            var requestUrl = string.Format("{0}?{1}", absoluteUri, appParam);
            return requestUrl;
        }

        /// <summary>
        /// 生成资源访问URL
        /// </summary>
        /// <param name="url"></param>
        /// <param name="useToken">是否采用AccessToken获取数据</param>
        /// <returns></returns>
        public static string GenerateRequestUrl(string url,bool useToken)
        {
            if (useToken)
            {
                return GenerateRequestUrl(url);
            }
            Uri uri = new Uri(url);
            OAuthBase oAuth = new OAuthBase();
            var appParam = string.Format("api_key={0}&{1}&{2}", AppConst.MoeAppKey, uri.Query.Replace("?", string.Empty), "r=" + oAuth.GenerateTimeStamp()); 
            string absoluteUri = string.IsNullOrEmpty(uri.Query) ? uri.AbsoluteUri : uri.AbsoluteUri.Replace(uri.Query, string.Empty);
            var requestUrl = string.Format("{0}?{1}", absoluteUri, appParam);
            return requestUrl;
        }

        /// <summary>
        /// 截取字符
        /// </summary>
        /// <param name="str">要截取的信息</param>
        /// <param name="size">显示个数</param>
        /// <returns>字符串</returns>
        public static string GetShowInfo2(string str, int size)
        {
            if (string.IsNullOrEmpty(str)) { return string.Empty; }
            str = NoHTML(WebUtility.HtmlDecode(str));
            int alpha = 0, word = 0;
            for (int i = 0; i < str.Length; i++)
            {
                if (Encoding.UTF8.GetByteCount(str[i].ToString()) == 1)
                {
                    alpha++;
                }
                else
                {
                    word++;
                }
            }
            int newSize = word + alpha/2;
            if (newSize <= size)
            {
                return str;
            }
            char[] charbuffer = new char[str.Length];
            int position = 0;
            var utf8 = Encoding.UTF8;
            for (int index = 0; index < size && position < str.Length - 2;)
            {
                if (position == str.Length - 2)
                {
                    charbuffer[position] = str[position++];
                    charbuffer[position] = str[position++];
                    break;
                }
                if (utf8.GetByteCount(str[position].ToString()) == 1 && utf8.GetByteCount(str[position + 1].ToString()) == 1)
                {
                    charbuffer[position] = str[position++];
                    charbuffer[position] = str[position++];
                    index++;
                }
                else
                {
                    if (utf8.GetByteCount(str[position].ToString()) > 1)
                    {
                        index++;
                    }
                    charbuffer[position] = str[position++];
                }
            }
            if (position != charbuffer.Length)
            {
                char[] newBuffer = new char[position];
                for (int i = 0; i < position; i++)
                {
                    newBuffer[i] = charbuffer[i];
                }
                var s = new string(newBuffer);
                return s.Trim() + "...";
            }
            return Regex.Replace(new string(charbuffer), @"\s\0", string.Empty, RegexOptions.IgnoreCase) + "...";
        }

        /// <summary>
        /// 去除HTML标记
        /// </summary>
        /// <param name="noHTML">包括HTML的源码 </param>
        /// <returns>已经去除后的文字</returns>
        public static string NoHTML(string noHTML)
        {
            string Htmlstring = noHTML;
            //删除脚本
            Htmlstring = Regex.Replace(Htmlstring, @"<script[^>]*?>.*?</script>", "", RegexOptions.IgnoreCase);
            //删除HTML
            Htmlstring = Regex.Replace(Htmlstring, @"<(.[^>]*)>", "", RegexOptions.IgnoreCase);
            Htmlstring = Regex.Replace(Htmlstring, @"([\r\n])[\s]+", "", RegexOptions.IgnoreCase);
            Htmlstring = Regex.Replace(Htmlstring, @"-->", "", RegexOptions.IgnoreCase);
            Htmlstring = Regex.Replace(Htmlstring, @"<!--.*", "", RegexOptions.IgnoreCase);
            Htmlstring = Regex.Replace(Htmlstring, @"&(quot|#34);", "\"", RegexOptions.IgnoreCase);
            Htmlstring = Regex.Replace(Htmlstring, @"&(amp|#38);", "&", RegexOptions.IgnoreCase);
            Htmlstring = Regex.Replace(Htmlstring, @"&(lt|#60);", "<", RegexOptions.IgnoreCase);
            Htmlstring = Regex.Replace(Htmlstring, @"&(gt|#62);", ">", RegexOptions.IgnoreCase);
            Htmlstring = Regex.Replace(Htmlstring, @"&(nbsp|#160);", " ", RegexOptions.IgnoreCase);
            Htmlstring = Regex.Replace(Htmlstring, @"&(iexcl|#161);", "\xa1", RegexOptions.IgnoreCase);
            Htmlstring = Regex.Replace(Htmlstring, @"&(cent|#162);", "\xa2", RegexOptions.IgnoreCase);
            Htmlstring = Regex.Replace(Htmlstring, @"&(pound|#163);", "\xa3", RegexOptions.IgnoreCase);
            Htmlstring = Regex.Replace(Htmlstring, @"&(copy|#169);", "\xa9", RegexOptions.IgnoreCase);
            Htmlstring = Regex.Replace(Htmlstring, @"&#(\d+);", "", RegexOptions.IgnoreCase);
            Htmlstring.Replace("<", "");
            Htmlstring.Replace(">", "");
            Htmlstring.Replace("\r\n", "");
            Htmlstring = WebUtility.HtmlEncode(Htmlstring).Trim();
            return Htmlstring;
        }

        /// <summary>
        /// 获取后缀名
        /// </summary>
        /// <param name="filename"></param>
        /// <returns></returns>
        public static string GetExtension(string filename)
        {
            return System.IO.Path.GetExtension(filename);
        }

        public static string HtmlEncode(string text)
        {
            return WebUtility.HtmlEncode(text);
        }

        public static string HtmlDecode(string text)
        {
            var decodeHtml = WebUtility.HtmlDecode(text);
            return WebUtility.HtmlDecode(NoHTML(decodeHtml));
        }
    }
}
