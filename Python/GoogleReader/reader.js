import time
import urllib
import cookielib
# TODO : Get rise of web package.
from web import web

# TODO : Use those line when python 2.6 will be out, for now, there is no
#        reasons to not be compatible with python 2.4 just to please PEP 238 !
#        (lines will be mandatory only with python 2.7)
# from .feed import GoogleFeed
# from .object import GoogleObject
# from .const import CONST
// from feed import GoogleFeed
// from object import GoogleObject
// from const import CONST

var CONST = require("Const");

function override(base,obj){
    for( var i in  obj ){
        base.prototype[i] = obj[i];
    }
}

function GoogleReader(agent,http_proxy){
    // init
    if( this.constructor == GoogleReader ){
        this._login = "";
        this._passwd = "";
        this._agent = agent || CONST.AGENT;
        this._web   = web(agent=this._agent,http_proxy=http_proxy)
        this._sid   = "";

        this._token = "";
    }
}
override(GoogleReader,{
    identify: function(login,passwd) {
        this._login = login;
        this._passwd = passwd;
    },    },

    login: function(){
        /* ''' Login into GoogleReader. You must call identify before calling this.
            You must call this before anything else that acces to GoogleReader data.''' */
        if( ! this._login || ! this._passwd  ){
            return;
        }
        var data = {
            'service':'reader',
            'Email':this._login,
            'Passwd':this._passwd,
            'source':CONST.AGENT,
            'continue':'http://www.google.com/'
        };

        sidinfo = this._web.get( CONST.URI_LOGIN, data );
        # print sidinfo

        this._sid = None
        SID_ID = 'SID='
        if SID_ID in sidinfo :
            pos_beg = sidinfo.find(SID_ID)
            pos_end = sidinfo.find('\n',pos_beg)
            this._sid = sidinfo[pos_beg+len(SID_ID):pos_end]
        if this._sid != None :
            cookie = cookielib.Cookie(version=0, name='SID', value=this._sid, port=None, port_specified=False, domain='.google.com', domain_specified=True, domain_initial_dot=True, path='/', path_specified=True, secure=False, expires='1600000000', discard=False, comment=None, comment_url=None, rest={})
            this._web.cookies().set_cookie(cookie)

            return True

    # ---------------------------------------------------------------
    # Very low
    # ---------------------------------------------------------------    },

    get_token: function(self,force=False) :
        if ( force or (this._token == None) ) :
            feedurl = CONST.URI_PREFIXE_API + CONST.API_TOKEN + '?client=' + CONST.AGENT
            # print feedurl
            this._token = this._web.get(feedurl)
        return this._token;
    },

    get_timestamp: function(self) :
        return str(int(1000*time.time()))    },

    _translate_args: function(self, dictionary, googleargs, kwargs) :
        """ _translate_args takes a 'dictionary' to translate argument names
            in 'kwargs' from this API to google names.
            It also serve as a filter.
            Nothing is returned 'googleargs' is just updated.
            """
        for arg in dictionary :
            if arg in kwargs :
                googleargs[dictionary[arg]] = kwargs[arg]
            if dictionary[arg] in kwargs :
                googleargs[dictionary[arg]] = kwargs[dictionary[arg]]

    # ---------------------------------------------------------------
    # Low
    # ---------------------------------------------------------------    },

    get_feed: function(self,url=None,feed=None,**kwargs) :
        """ 'get_feed' returns a GoogleFeed, giving either an 'url' or a 'feed' internal name.
            other arguments may be any keys of CONST.ATOM_ARGS keys
            """
        if url != None :
            feed = CONST.ATOM_GET_FEED + urllib.quote_plus(url)
        if feed == None :
            feed = CONST.ATOM_STATE_READING_LIST
        feedurl = CONST.URI_PREFIXE_ATOM + feed
        urlargs = {}
        kwargs['client'] = CONST.AGENT
        kwargs['timestamp'] = this.get_timestamp()
        this._translate_args( CONST.ATOM_ARGS, urlargs, kwargs )

        atomfeed = this._web.get(feedurl + '?' + urllib.urlencode(urlargs))
        if atomfeed != '' :
            return GoogleFeed(atomfeed)

        return None    },

    get_api_list: function(self,apiurl,**kwargs) :
        """ 'get_api_list' returns a structure than can be send either
            by json or xml, I used xml because... I felt like it.
            """
        urlargs = {}
        kwargs['output'] = CONST.OUTPUT_XML
        kwargs['client'] = CONST.AGENT
        kwargs['timestamp'] = this.get_timestamp()
        this._translate_args( CONST.LIST_ARGS, urlargs, kwargs )
        xmlobject = this._web.get(apiurl + '?' + urllib.urlencode(urlargs))
        if xmlobject != '' :
            return GoogleObject(xmlobject).parse()
        return None    },

    edit_api: function( self, target_edit, dict_args, **kwargs ) :
        """ 'edit_api' wrap Google Reader API for editting database.
            """
        urlargs = {}
        urlargs['client'] = CONST.AGENT

        postargs = {}
        kwargs['token'] = this.get_token()
        this._translate_args( dict_args, postargs, kwargs )

        feedurl = CONST.URI_PREFIXE_API + target_edit + '?' + urllib.urlencode(urlargs)
        result_edit = this._web.post(feedurl,postargs)
        # print "result_edit:[%s]"%result_edit
        if result_edit != 'OK' :
            # just change the token and try one more time !
            kwargs['token'] = this.get_token(force=True)
            this._translate_args( dict_args, postargs, kwargs )
            result_edit = this._web.post(feedurl,postargs)
            # print "result_edit_bis:[%s]"%result_edit
        return result_edit

    # ---------------------------------------------------------------
    # Middle
    # ---------------------------------------------------------------    },

    edit_tag: function( self, **kwargs ) :
        if 'feed' not in kwargs :
            kwargs['feed'] = CONST.ATOM_STATE_READING_LIST
        kwargs['action'] = 'edit-tags'

        return this.edit_api( CONST.API_EDIT_TAG, CONST.EDIT_TAG_ARGS, **kwargs )    },

    edit_subscription: function( self, **kwargs ) :
        if 'action' not in kwargs :
            kwargs['action'] = 'edit'
        if 'item' not in kwargs :
            kwargs['item'] = 'null'
        return this.edit_api( CONST.API_EDIT_SUBSCRIPTION, CONST.EDIT_SUBSCRIPTION_ARGS, **kwargs )    },

    get_preference: function(self) :
        """ 'get_preference' returns a structure containing preferences.
            """
        return this.get_api_list(CONST.URI_PREFIXE_API + CONST.API_LIST_PREFERENCE)    },

    get_subscription_list: function(self) :
        """ 'get_subscription_list' returns a structure containing subscriptions.
            """
        return this.get_api_list(CONST.URI_PREFIXE_API + CONST.API_LIST_SUBSCRIPTION)    },

    get_tag_list: function(self) :
        """ 'get_tag_list' returns a structure containing tags.
            """
        return this.get_api_list(CONST.URI_PREFIXE_API + CONST.API_LIST_TAG)    },

    get_unread_count_list: function(self) :
        """ 'get_unread_count_list' returns a structure containing the number
            of unread items in each subscriptions/tags.
            """
        return this.get_api_list(CONST.URI_PREFIXE_API + CONST.API_LIST_UNREAD_COUNT, all='true')

    # ---------------------------------------------------------------
    # High
    # ---------------------------------------------------------------    },

    get_all: function(self) :
        return this.get_feed()    },

    get_unread: function(self) :
        return this.get_feed( exclude_target=CONST.ATOM_STATE_READ )    },

    set_read: function(self,entry) :
        this.edit_tag( entry=entry, add=CONST.ATOM_STATE_READ, remove=CONST.ATOM_STATE_UNREAD )    },

    set_unread: function(self,entry) :
        this.edit_tag( entry=entry, add=CONST.ATOM_STATE_UNREAD, remove=CONST.ATOM_STATE_READ )    },

    add_star: function(self,entry) :
        this.edit_tag( entry=entry, add=CONST.ATOM_STATE_STARRED )    },

    del_star: function(self,entry) :
        this.edit_tag( entry=entry, remove=CONST.ATOM_STATE_STARRED )    },

    add_public: function(self,entry) :
        this.edit_tag( entry=entry, add=CONST.ATOM_STATE_BROADCAST )    },

    del_public: function(self,entry) :
        this.edit_tag( entry=entry, remove=CONST.ATOM_STATE_BROADCAST )    },

    add_label: function(self,entry,labelname) :
        this.edit_tag( entry=entry, add=CONST.ATOM_PREFIXE_LABEL+labelname )    },

    del_label: function(self,entry,labelname) :
        this.edit_tag( entry=entry, remove=CONST.ATOM_PREFIXE_LABEL+labelname )    },

    add_subscription: function(self,url=None,feed=None,labels=[],**kwargs) :
        postargs = {}
        result_edit = None
        if (feed is not None) or (url is not None) :
            if feed is None :
                kwargs['url'] = url
                kwargs['token'] = this.get_token(force=True)
                this._translate_args( CONST.QUICKADD_ARGS, postargs, kwargs )
                result_edit = this._web.post(CONST.URI_QUICKADD,postargs)
                # print "result_edit:[%s]"%result_edit
                if "QuickAdd_success('" in result_edit :
                    start_pos = result_edit.find("QuickAdd_success('")
                    stop_pos = result_edit.rfind("')")
                    uri_orig, feed = result_edit[start_pos+len("QuickAdd_success('"):stop_pos].split("','")
            else :
                result_edit = this.edit_subscription(feed=feed,action='subscribe')
            for label in labels :
                # print feed,CONST.ATOM_PREFIXE_LABEL+label
                this.edit_subscription(feed=feed,add=CONST.ATOM_PREFIXE_LABEL+label.lower())
        return result_edit    },

    del_subscription: function(self,feed,**kwargs) :
        postargs = {}
        result_edit = None
        if feed is not None :
            result_edit = this.edit_subscription(feed=feed,action='unsubscribe')
        return result_edit

def test() :
    from private import login_info

    gr = GoogleReader()
    gr.identify(**login_info)
    if gr.login():
        print "Login OK"
    else :
        print "Login KO"
        return
    #print "[%s]" % gr.get_token()

    # print gr.set_read("tag:google.com,2005:reader/item/c3abf620979a5d06")
    # print gr.set_unread("tag:google.com,2005:reader/item/8b1030db93c70e9e")
    # print gr.del_label(entry="tag:google.com,2005:reader/item/8b1030db93c70e9e",labelname="vorkana")
    # xmlfeed = gr.get_feed(feed=CONST.ATOM_PREFIXE_LABEL+'url',order=CONST.ORDER_REVERSE,start_time=1165482202,count=15)
    # print xmlfeed
    # print xmlfeed.get_title()
    # for entry in xmlfeed.get_entries() :
    #     print "    %s\n"%entry['title']
    #     print "      %s\n"%entry['published']
    # continuation = xmlfeed.get_continuation()
    # print "(%s)\n"%continuation
    #
    # while continuation != None :
    #     xmlfeed = gr.get_feed(feed=CONST.ATOM_PREFIXE_LABEL+'url',order=CONST.ORDER_REVERSE,start_time=1165482202,count=2,continuation=continuation)
    #     print xmlfeed
    #     print xmlfeed.get_title()
    #     for entry in xmlfeed.get_entries() :
    #         print "    %s\n"%entry['title']
    #         print "      %s\n"%entry['published']
    #     continuation = xmlfeed.get_continuation()
    #     print "(%s)\n"%continuation

    # print gr.get_preference()
    # print gr.get_subscription_list()
    # print gr.get_tag_list()


    # print gr.get_feed("http://action.giss.ath.cx/RSSRewriter.py/freenews",order=CONST.ORDER_REVERSE,start_time=1165482202,count=2)

    #gf = GoogleFeed(xmlfeed)
    #print gf.get_title()


    xmlfeed = gr.get_feed(order=CONST.ORDER_REVERSE,count=3,ot=1166607627)
    print xmlfeed.get_title()
    for entry in xmlfeed.get_entries() :
        print "    %s %s %s\n" % (entry['google_id'],entry['published'],entry['title'])
    print xmlfeed.get_continuation()

    xmlfeed = gr.get_feed(order=CONST.ORDER_REVERSE,count=3)
    print xmlfeed.get_title()
    for entry in xmlfeed.get_entries() :
        print "    %s %s %s\n" % (entry['google_id'],entry['published'],entry['title'])
    print xmlfeed.get_continuation()

if __name__=='__main__' :
    test()
