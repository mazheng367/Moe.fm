using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using Windows.Data.Json;
using Windows.Foundation;
using Windows.Storage;
using UnicodeEncoding = Windows.Storage.Streams.UnicodeEncoding;

namespace Moefm.Extensions
{
    public sealed class MoeOAuth
    {
        private OAuthBase _oAuth;

        private OAuthBase OAuth
        {
            get
            {
                if (this._oAuth == null)
                {
                    this._oAuth = new OAuthBase();
                }
                return this._oAuth;
            }
        }

        /// <summary>
        /// 获取RequestToken
        /// </summary>
        /// <returns></returns>
        public IAsyncOperation<string> GetRequestTokenAsync()
        {
            return Task.Run(() => { return this.GetRequestToken(); }).AsAsyncOperation();     
        }

        private async Task<string> GetRequestToken()
        {
            try
            {
                const string requestTokenUrl = "http://api.moefou.org/oauth/request_token";
                const string httpMethod = "GET";
                Uri url = new Uri(requestTokenUrl);
                string timeStamp = this.OAuth.GenerateTimeStamp();
                string nonce = this.OAuth.GenerateNonce();
                string nUrl = null;
                string pa = null;
                string signature = this.OAuth.GenerateSignature(url, AppConst.MoeAppKey, AppConst.ConsumerSecret, string.Empty, string.Empty, httpMethod, timeStamp, nonce, string.Empty, out nUrl, out pa);
                List<QueryParameter> parameters = new List<QueryParameter>();


                string requestUrl = string.Format("{0}?{1}&{2}={3}", nUrl, pa, OAuthBase.OAuthSignatureKey, signature);
                WebRequest request = WebRequest.Create(requestUrl);
                WebResponse response = await request.GetResponseAsync();
                using (StreamReader sr = new StreamReader(response.GetResponseStream()))
                {
                    List<QueryParameter> reqPa = this.OAuth.GetQueryParameters(await sr.ReadToEndAsync());
                    var oauth_token = reqPa.Find(qp => qp.Name.Equals("oauth_token")).Value;
                    var oauth_token_secret = reqPa.Find(qp => qp.Name.Equals("oauth_token_secret")).Value;
                    //将为授权的token放入到
                    Windows.Storage.ApplicationData.Current.LocalSettings.Values["oauth_token"] = oauth_token;
                    Windows.Storage.ApplicationData.Current.LocalSettings.Values["oauth_token_secret"] = oauth_token_secret;
                }
                return string.Empty;
            }
            catch (Exception)
            {
                throw;
            }
        }

        /// <summary>
        /// 获取授权URL
        /// </summary>
        /// <returns></returns>
        public IAsyncOperation<string> GetAuthorizeUrlAsync()
        {
            return Task.Run(() => { return this.GetAuthorizeUrl(); }).AsAsyncOperation();
        }

        private string GetAuthorizeUrl()
        {
            const string authorizeUrl = "http://api.moefou.org/oauth/authorize";
            const string httpMethod = "GET";
            Uri url = new Uri(authorizeUrl);
            string timeStamp = this.OAuth.GenerateTimeStamp();
            string nonce = this.OAuth.GenerateNonce();
            string nUrl = null;
            string pa = null;
            string oauth_token = Windows.Storage.ApplicationData.Current.LocalSettings.Values["oauth_token"].ToString();
            string oauth_token_secret = Windows.Storage.ApplicationData.Current.LocalSettings.Values["oauth_token_secret"].ToString();

            string signature = this.OAuth.GenerateSignature(url, AppConst.MoeAppKey, AppConst.ConsumerSecret, oauth_token, oauth_token_secret
                , httpMethod, timeStamp, nonce, string.Empty, out nUrl, out pa);
            return string.Format("{0}?{1}&{2}={3}", nUrl, pa, OAuthBase.OAuthSignatureKey, signature);
        }

        /// <summary>
        /// 获取AccessToken
        /// </summary>
        /// <param name="uri"></param>
        /// <returns></returns>
        public IAsyncOperation<bool> GetAccessTokenAsync(string uri)
        {
            return Task.Run(() => { return this.GetAccessToken(uri); }).AsAsyncOperation();
        }

        private async Task<bool> GetAccessToken(string url)
        {
            Uri oldUri = new Uri(url);
            var parameters = this.OAuth.GetQueryParameters(oldUri.Query);
            var verifier = parameters.Find(qp => qp.Name.Equals("verifier")).Value;

            const string accessTokenUrl = "http://api.moefou.org/oauth/access_token";
            const string httpMethod = "GET";

            Uri uri = new Uri(accessTokenUrl);
            string timeStamp = this.OAuth.GenerateTimeStamp();
            string nonce = this.OAuth.GenerateNonce();
            string nUrl = null;
            string pa = null;
            string oauth_token = Windows.Storage.ApplicationData.Current.LocalSettings.Values["oauth_token"].ToString();
            string oauth_token_secret = Windows.Storage.ApplicationData.Current.LocalSettings.Values["oauth_token_secret"].ToString();

            string signature = this.OAuth.GenerateSignature(uri, AppConst.MoeAppKey, AppConst.ConsumerSecret, oauth_token, oauth_token_secret
                , httpMethod, timeStamp, nonce, verifier, out nUrl, out pa);

            string requestUrl = string.Format("{0}?{1}&{2}={3}&oauth_verifier={4}", nUrl, pa, OAuthBase.OAuthSignatureKey, signature, verifier);

            WebRequest request = WebRequest.Create(requestUrl);
            WebResponse response = await request.GetResponseAsync();
            using (StreamReader sr = new StreamReader(response.GetResponseStream()))
            {
                string para = await sr.ReadToEndAsync();
                var finalParams = this.OAuth.GetQueryParameters(para);
                string access_token = finalParams.Find(qp => qp.Name.Equals("oauth_token")).Value;
                string access_token_secret = finalParams.Find(qp => qp.Name.Equals("oauth_token_secret")).Value;

                //删除前两步用到的token
                Windows.Storage.ApplicationData.Current.LocalSettings.Values.Remove("oauth_token");
                Windows.Storage.ApplicationData.Current.LocalSettings.Values.Remove("oauth_token_secret");

                //缓存已授权的token
                JsonObject jObj = new JsonObject();
                jObj.Add("access_token", JsonValue.CreateStringValue(access_token));
                jObj.Add("access_token_secret", JsonValue.CreateStringValue(access_token_secret));

                string data = jObj.Stringify();
                var item = await Windows.Storage.ApplicationData.Current.LocalFolder.TryGetItemAsync(AppConst.TokenFileName);
                IStorageFile file = item as StorageFile;
                if (file == null)
                {
                    file = await Windows.Storage.ApplicationData.Current.LocalFolder.CreateFileAsync(AppConst.TokenFileName);
                }
                await FileIO.WriteTextAsync(file, data, UnicodeEncoding.Utf8);
                Windows.Storage.ApplicationData.Current.LocalSettings.Values[AppConst.AccessToken] = access_token;
                Windows.Storage.ApplicationData.Current.LocalSettings.Values[AppConst.AccessTokenSecret] = access_token_secret;
            }
            return true;
        }
    }
}
