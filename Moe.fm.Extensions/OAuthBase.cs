using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.Security.Cryptography;
using Windows.Security.Cryptography.Core;
using Windows.Storage.Streams;

namespace Moefm.Extensions
{
    /// <summary>
    /// Provides an internal structure to sort the query parameter
    /// </summary>
    public sealed class QueryParameter
    {
        private string name = null;
        private string value = null;

        public QueryParameter(string name, string value1)
        {
            this.name = name;
            this.value = value1;
        }

        public string Name
        {
            get { return name; }
        }

        public string Value
        {
            get { return value; }
        }
    }

    internal sealed class OAuthBase
    {
        /// <summary>
        /// Comparer class used to perform the sorting of the query parameters
        /// </summary>
        private class QueryParameterComparer : IComparer<QueryParameter>
        {

            #region IComparer<QueryParameter> Members

            public int Compare(QueryParameter x, QueryParameter y)
            {
                if (x.Name == y.Name)
                {
                    return string.Compare(x.Value, y.Value);
                }
                else
                {
                    return string.Compare(x.Name, y.Name);
                }
            }

            #endregion
        }

        public const string OAuthVersion = "1.0";
        public const string OAuthParameterPrefix = "oauth_";

        //
        // List of know and used oauth parameters' names
        //        
        public const string OAuthConsumerKeyKey = "oauth_consumer_key";
        public const string OAuthCallbackKey = "oauth_callback";
        public const string OAuthVersionKey = "oauth_version";
        public const string OAuthSignatureMethodKey = "oauth_signature_method";
        public const string OAuthSignatureKey = "oauth_signature";
        public const string OAuthTimestampKey = "oauth_timestamp";
        public const string OAuthNonceKey = "oauth_nonce";
        public const string OAuthTokenKey = "oauth_token";
        public const string OAuthTokenSecretKey = "oauth_token_secret";
        public const string OAuthVerifierKey = "oauth_verifier";

        public const string HMACSHA1SignatureType = "HMAC-SHA1";
        public const string PlainTextSignatureType = "PLAINTEXT";
        public const string RSASHA1SignatureType = "RSA-SHA1";

        private static Random random = new Random(Environment.TickCount);

        private string unreservedChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.~";

        /// <summary>
        /// Helper function to compute a hash value
        /// </summary>
        /// <param name="data">
        /// The hashing algoirhtm used. If that algorithm needs some initialization, like HMAC and its derivatives, they should be initialized prior to passing it to this function
        /// The data to hash
        /// </param>
        /// <returns>a Base64 string of the hash value</returns>
        private string ComputeHash(string data)
        {
            return string.Empty;
        }

        /// <summary>
        /// Internal function to cut out all non oauth query string parameters (all parameters not begining with "oauth_")
        /// </summary>
        /// <param name="parameters">The query string part of the Url</param>
        /// <returns>A list of QueryParameter each containing the parameter name and value</returns>
        public List<QueryParameter> GetQueryParameters(string parameters)
        {
            if (parameters.StartsWith("?"))
            {
                parameters = parameters.Remove(0, 1);
            }

            List<QueryParameter> result = new List<QueryParameter>();

            if (!string.IsNullOrEmpty(parameters))
            {
                string[] p = parameters.Split('&');
                foreach (string s in p)
                {
                    if (!string.IsNullOrEmpty(s))
                    {
                        if (s.IndexOf('=') > -1)
                        {
                            string[] temp = s.Split('=');
                            result.Add(new QueryParameter(temp[0], temp[1]));
                        }
                        else
                        {
                            result.Add(new QueryParameter(s, string.Empty));
                        }
                    }
                }
            }

            return result;
        }

        /// <summary>
        /// This is a different Url Encode implementation since the default .NET one outputs the percent encoding in lower case.
        /// While this is not a problem with the percent encoding spec, it is used in upper case throughout OAuth
        /// </summary>
        /// <param name="value">The value to Url encode</param>
        /// <returns>Returns a Url encoded string</returns>
        public string UrlEncode(string value)
        {
            StringBuilder result = new StringBuilder();

            foreach (char symbol in value)
            {
                if (unreservedChars.IndexOf(symbol) != -1)
                {
                    result.Append(symbol);
                }
                else
                {
                    result.Append('%' + String.Format("{0:X2}", (int)symbol));
                }
            }

            return result.ToString();
        }

        /// <summary>
        /// Normalizes the request parameters according to the spec
        /// </summary>
        /// <param name="parameters">The list of parameters already sorted</param>
        /// <returns>a string representing the normalized parameters</returns>
        public string NormalizeRequestParameters(IList<QueryParameter> parameters)
        {
            StringBuilder sb = new StringBuilder();
            QueryParameter p = null;
            for (int i = 0; i < parameters.Count; i++)
            {
                p = parameters[i];
                sb.AppendFormat("{0}={1}", p.Name, p.Value);

                if (i < parameters.Count - 1)
                {
                    sb.Append("&");
                }
            }

            return sb.ToString();
        }

        /// <summary>
        /// Generate the signature base that is used to produce the signature
        /// </summary>
        /// <param name="url">The full url that needs to be signed including its non OAuth url parameters</param>
        /// <param name="consumerKey">The consumer key</param>        
        /// <param name="token">The token, if available. If not available pass null or an empty string</param>
        /// <param name="tokenSecret">The token secret, if available. If not available pass null or an empty string</param>
        /// <param name="httpMethod">The http method used. Must be a valid HTTP method verb (POST,GET,PUT, etc)</param>
        /// <param name="verifier"></param>
        /// <param name="signatureType">The signature type. To use the default values use OAuthBase.SignatureTypes.</param>
        /// <param name="timeStamp"></param>
        /// <param name="nonce"></param>
        /// <param name="normalizedUrl"></param>
        /// <param name="normalizedRequestParameters"></param>
        /// <returns>The signature base</returns>
        public string GenerateSignatureBase(Uri url, string consumerKey, string token, string tokenSecret, string httpMethod, string timeStamp, string nonce, string verifier,string signatureType, out string normalizedUrl, out string normalizedRequestParameters)
        {
            if (token == null)
            {
                token = string.Empty;
            }

            if (tokenSecret == null)
            {
                tokenSecret = string.Empty;
            }

            if (string.IsNullOrEmpty(consumerKey))
            {
                throw new ArgumentNullException("consumerKey");
            }

            if (string.IsNullOrEmpty(httpMethod))
            {
                throw new ArgumentNullException("httpMethod");
            }

            if (string.IsNullOrEmpty(signatureType))
            {
                throw new ArgumentNullException("signatureType");
            }
            
            normalizedUrl = null;
            normalizedRequestParameters = null;

            List<QueryParameter> parameters = GetQueryParameters(url.Query);
            parameters.Add(new QueryParameter(OAuthVersionKey, OAuthVersion));
            parameters.Add(new QueryParameter(OAuthNonceKey, nonce));
            parameters.Add(new QueryParameter(OAuthTimestampKey, timeStamp));
            parameters.Add(new QueryParameter(OAuthSignatureMethodKey, signatureType));
            parameters.Add(new QueryParameter(OAuthConsumerKeyKey, consumerKey));

            if (!string.IsNullOrEmpty(token))
            {
                parameters.Add(new QueryParameter(OAuthTokenKey, token));
            }

            if (!string.IsNullOrEmpty(verifier))
            {
                parameters.Add(new QueryParameter(OAuthVerifierKey, verifier));
            }

            parameters.Sort(new QueryParameterComparer());

            normalizedUrl = string.Format("{0}://{1}", url.Scheme, url.Host);
            if (!((url.Scheme == "http" && url.Port == 80) || (url.Scheme == "https" && url.Port == 443)))
            {
                normalizedUrl += ":" + url.Port;
            }
            normalizedUrl += url.AbsolutePath;
            normalizedRequestParameters = NormalizeRequestParameters(parameters);

            StringBuilder signatureBase = new StringBuilder();
            signatureBase.AppendFormat("{0}&", httpMethod.ToUpper());
            signatureBase.AppendFormat("{0}&", UrlEncode(normalizedUrl));
            signatureBase.AppendFormat("{0}", UrlEncode(normalizedRequestParameters));

            return signatureBase.ToString();
        }

        /// <summary>
        /// Generates a signature using the specified signatureType 
        /// </summary>		
        /// <returns>A base64 string of the hash value</returns>
        public string GenerateSignature(Uri url, string consumerKey, string consumerSecret, string token, string tokenSecret, string httpMethod, string timeStamp, string nonce, string verifier, out string normalizedUrl, out string normalizedRequestParameters)
        {
            normalizedUrl = null;
            normalizedRequestParameters = null;
            string hmacKey = string.Format("{0}&{1}", UrlEncode(consumerSecret), string.IsNullOrEmpty(tokenSecret) ? "" : UrlEncode(tokenSecret));
            string signatureBase = GenerateSignatureBase(url, consumerKey, token, tokenSecret, httpMethod, timeStamp, nonce, verifier, HMACSHA1SignatureType, out normalizedUrl, out normalizedRequestParameters);
            var hmacSha1 = MacAlgorithmProvider.OpenAlgorithm(MacAlgorithmNames.HmacSha1);

            var key = hmacSha1.CreateKey(CryptographicBuffer.ConvertStringToBinary(hmacKey, BinaryStringEncoding.Utf8));
            IBuffer baseData = CryptographicBuffer.ConvertStringToBinary(signatureBase, BinaryStringEncoding.Utf8);

            IBuffer buffer = CryptographicEngine.Sign(key, baseData);
            return UrlEncode(CryptographicBuffer.EncodeToBase64String(buffer));
        }

        /// <summary>
        /// Generate the timestamp for the signature        
        /// </summary>
        /// <returns></returns>
        public string GenerateTimeStamp()
        {
            // Default implementation of UNIX time of the current UTC time
            TimeSpan ts = DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, 0);
            return Convert.ToInt64(ts.TotalMilliseconds).ToString();
        }

        /// <summary>
        /// Generate a nonce
        /// </summary>
        /// <returns></returns>
        public string GenerateNonce()
        {
            // Just a simple implementation of a random number between 123400 and 9999999
            return random.Next(123400, 9999999).ToString();
        }
    }

}
