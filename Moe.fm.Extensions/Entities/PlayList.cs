using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using Windows.UI.Xaml.Controls.Primitives;

namespace Moefm.Extensions.Entities
{
    public struct PlayList
    {
        public int id;
        public string url;
        public string sub_title;
        public string cover;
        public string artist;
        public string wiki_title;
        public string fav_sub;
    }

    public struct WikiEntity
    {
        public int id;
        public string url;
        public string sub_title;
        public CoverEntity wiki_cover;
        public string artist;
        public string wiki_title;
        public string fav_sub;
        public bool refresh;
    }

    public struct CoverEntity
    {
        public string square;
    }
}
