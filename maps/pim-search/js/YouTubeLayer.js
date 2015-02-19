define([
    "dojo/_base/declare",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/ready",
    "dojo/Stateful",
    "dojo/Evented",
    "dojo/on",
    "dojo/date/locale",
    "esri/InfoTemplate",
    "esri/layers/FeatureLayer",
    "esri/geometry/mathUtils",
    "esri/geometry/webMercatorUtils",
    "esri/geometry/Point",
    "esri/request",
    "esri/graphic",
    "esri/symbols/PictureMarkerSymbol"
],
    function (
        declare, array, lang,
        ready,
        Stateful, Evented, on,
        locale,
        InfoTemplate,
        FeatureLayer,
        mathUtils,
        webMercatorUtils,
        Point,
        esriRequest,
        Graphic,
        PictureMarkerSymbol
    ) {
        return declare("modules.YouTubeLayer", [Stateful, Evented], {
            options: {
                map: null,
                filterUsers: [],
                filterWords: [],
                autopage: true,
                visible: true,
                maxpage: 3,
                limit: 50,
                title: 'YouTube',
                id: 'youtube',
                searchTerm: '',
                time: 'all_time', // this_week, this_month, today
                datePattern: "MMM d, yyyy",
                timePattern: "h:mma",
                minScale: null,
                maxScale: null,
                symbol: null,
                infoTemplate: null,
                key: '',
                refreshTime: 4000,
                url: "https://gdata.youtube.com/feeds/api/videos",
            },
            constructor: function (options) {
                // mixin options
                var defaults = lang.mixin({}, this.options, options);
                // properties
                this.set("map", defaults.map);
                this.set("filterUsers", defaults.filterUsers);
                this.set("filterWords", defaults.filterWords);
                this.set("autopage", defaults.autopage);
                this.set("visible", defaults.visible);
                this.set("maxpage", defaults.maxpage);
                this.set("limit", defaults.limit);
                this.set("title", defaults.title);
                this.set("id", defaults.id);
                this.set("datePattern", defaults.datePattern);
                this.set("timePattern", defaults.timePattern);
                this.set("searchTerm", defaults.searchTerm);
                this.set("time", defaults.time);
                this.set("symbol", defaults.symbol);
                this.set("infoTemplate", defaults.infoTemplate);
                this.set("key", defaults.key);
                this.set("url", defaults.url);
                this.set("minScale", defaults.minScale);
                this.set("maxScale", defaults.maxScale);
                this.set("refreshTime", defaults.refreshTime);
                this.set("graphics", []);
                this.set("noGeo", []);
                // listeners
                this.watch("visible", this._visible);
                this.watch("searchTerm", this.update);
                this.watch("time", this.update);
                // private vars
                this._deferreds = [];
                this._events = [];
                this._dataIds = {};
                // classes
                this._css = {
                    container: "youtube-popup",
                    title: "title",
                    stats: "stats",
                    imageAnchor: "image-anchor",
                    image: "image",
                    ownername: "ownername",
                    content: "content",
                    date: "date"
                };
                // map required
                if (!this.map) {
                    console.log('YouTube::Reference to esri.Map object required');
                    return;
                }
                // default symbol
                if (!this.symbol) {
                    this.set("symbol", new PictureMarkerSymbol('images/map/youtube25x30.png', 25, 30).setOffset(0, 7));
                }
                // default infoTemplate
                if (!this.infoTemplate) {
                    this.set("infoTemplate", new InfoTemplate('YouTube', '<div class="' + this._css.container + '"><div class="' + this._css.title + '">${video_title}</div><a tabindex="0" class="' + this._css.imageAnchor + '" href="${link}" target="_blank"><span class="' + this._css.stats + '">${seconds}</span><img class="' + this._css.image + '" width="${width}" height="${height}" src="${thumbnail}"></a><div class="' + this._css.content + '">${descriptionText}</div><div class="' + this._css.ownername + '"><a tabindex="0" href="${link}" target="_blank">${full_name}</a></div><div class="' + this._css.date + '">${dateformatted}</div></div>'));
                }
                // layer
                this.featureCollection = {
                    layerDefinition: {
                        "geometryType": "esriGeometryPoint",
                        "drawingInfo": {
                            "renderer": {
                                "type": "simple",
                                "symbol": this.symbol
                            }
                        },
                        "fields": [{
                            "name": "OBJECTID",
                            "type": "esriFieldTypeOID"
                    }],
                        "globalIdField": "id",
                        "displayField": "title"
                    },
                    featureSet: {
                        "features": [],
                        "geometryType": "esriGeometryPoint"
                    }
                };
                // layer
                this.featureLayer = new FeatureLayer(this.featureCollection, {
                    id: this.id,
                    title: this.title,
                    minScale: this.minScale,
                    maxScale: this.maxScale,
                    outFields: ["*"],
                    infoTemplate: this.infoTemplate,
                    visible: this.visible
                });
                // add to map
                this.map.addLayer(this.featureLayer);
                // dom ready
                ready(lang.hitch(this, function () {
                    // query when map loads
                    if (this.map.loaded) {
                        this._init();
                    } else {
                        var onLoad = on.once(this.map, "load", lang.hitch(this, function () {
                            this._init();
                        }));
                        this._events.push(onLoad);
                    }
                    // loaded
                    this.set("loaded", true);
                    this.emit("load", {});
                }));
            },
            /* ---------------- */
            /* Public Events */
            /* ---------------- */
            // load
            // clear
            // update
            // update-end
            // error
            /* ---------------- */
            /* Public Functions */
            /* ---------------- */
            destroy: function () {
                // remove events
                if (this._events && this._events.length) {
                    for (var i = 0; i < this._events.length; i++) {
                        this._events[i].remove();
                    }
                }
                // clear data
                this.clear();
                // remove layer
                this.map.removeLayer(this.featureLayer);
            },
            update: function (ms) {
                if (this.featureLayer && this.featureLayer.visibleAtMapScale && this.featureLayer.visible) {
                    if (this._refreshTimer) {
                        clearTimeout(this._refreshTimer);
                    }
                    // default to refresh time
                    var refresh = this.refreshTime;
                    // use param time if set
                    if (typeof ms !== 'undefined') {
                        refresh = ms;
                    }
                    this._refreshTimer = setTimeout(lang.hitch(this, function () {
                        this._constructQuery();
                    }), refresh);
                }
            },
            clear: function () {
                // remove timer
                if (this._refreshTimer) {
                    clearTimeout(this._refreshTimer);
                }
                // cancel any outstanding requests
                this.query = null;
                array.forEach(this._deferreds, function (def) {
                    def.cancel();
                });
                this._deferreds = [];
                if (this.featureLayer.graphics.length > 0) {
                    this.featureLayer.applyEdits(null, null, this.featureLayer.graphics);
                }
                this.set("graphics", []);
                this._dataIds = {};
                this.emit("clear", {});
            },
            show: function () {
                this.featureLayer.setVisibility(true);
            },
            hide: function () {
                this.featureLayer.setVisibility(false);
            },
            setVisibility: function (val) {
                if (val) {
                    this.show();
                } else {
                    this.hide();
                }
            },
            /* ---------------- */
            /* Private Functions */
            /* ---------------- */
            _init: function () {
                // Events
                var extentChange = on(this.map, "extent-change", lang.hitch(this, function () {
                    this.update();
                }));
                this._events.push(extentChange);
                var visChange = on(this.featureLayer, "visibility-change", lang.hitch(this, function () {
                    this.clear();
                    this.update(0);
                }));
                this._events.push(visChange);
                this.update(0);
            },
            // Format Date Object
            _formatDate: function (dateObj) {
                if (dateObj) {
                    return locale.format(dateObj, {
                        datePattern: this.timePattern,
                        selector: "date"
                    }).toLowerCase() + ' &middot; ' + locale.format(dateObj, {
                        datePattern: this.datePattern,
                        selector: "date"
                    });
                }
            },
            _getRadius: function () {
                var map = this.map;
                var extent = this.map.extent;
                var center = extent.getCenter();
                this.maxRadius = 621;
                var radius = Math.min(this.maxRadius, Math.ceil(mathUtils.getLength(Point(extent.xmin, extent.ymin, map.spatialReference), Point(extent.xmax, extent.ymin, map.spatialReference)) * 3.281 / 5280 / 2));
                radius = Math.floor(radius);
                return {
                    lat: Math.round(center.getLatitude() * 10000) / 10000,
                    lng: Math.round(center.getLongitude() * 10000) / 10000,
                    distance: radius
                };
            },
            _constructQuery: function () {
                var search = lang.trim(this.searchTerm);
                if (search.length === 0) {
                    search = "";
                }
                var radius = this._getRadius();
                this.query = {
                    "q": search,
                    "max-results": this.limit,
                    "v": 2,
                    "location": radius.lat + "," + radius.lng,
                    "location-radius": radius.distance + "mi",
                    "start-index": 1,
                    "alt": "json",
                    "time": this.time,
                    "safeSearch": "moderate",
                    "orderby": "published",
                    "key": this.key
                };
                // make the actual API call
                this.pageCount = 1;
                this._sendRequest(this.url, this.query);
            },
            _sendRequest: function (url, content) {
                // get the results for each page
                var deferred = esriRequest({
                    url: url,
                    handleAs: "json",
                    timeout: 10000,
                    content: content,
                    callbackParamName: "callback",
                    preventCache: true,
                    load: lang.hitch(this, function (data) {
                        if (data.feed) {
                            if (data.feed.entry && data.feed.entry.length > 0) {
                                this._mapResults(data);
                                // display results for multiple pages
                                if ((this.autopage) && (this.maxpage > this.pageCount) && (data.feed.entry.length === this.limit) && (this.query)) {
                                    this.pageCount++;
                                    this.query["start-index"] += this.limit;
                                    this._sendRequest(this.url, this.query);
                                } else {
                                    this._updateEnd();
                                }
                            } else {
                                // No results found, try another search term
                                this._updateEnd();
                            }
                        } else {
                            if (data.meta) {
                                console.log('YouTube::' + data.meta.code + ' - ' + this.title + ': ' + data.meta.error_message);
                            }
                            // No results found, try another search term
                            this._updateEnd();
                        }
                    }),
                    error: lang.hitch(this, function (e) {
                        if (deferred.canceled) {
                            console.log('YouTube::Search Cancelled');
                        } else {
                            console.log('YouTube::Search error' + ": " + e.message.toString());
                        }
                        this._error(e);
                    })
                });
                this._deferreds.push(deferred);
            },
            _findWordInText: function (word, text) {
                if (word && text) {
                    // text
                    var searchString = text.toLowerCase();
                    // word
                    var badWord = ' ' + word.toLowerCase() + ' ';
                    // if found
                    if (searchString.indexOf(badWord) > -1) {
                        return true;
                    }
                }
                return false;
            },
            _mapResults: function (j) {
                if (j.error) {
                    console.log("YouTube::_mapResults error: " + j.error);
                    this._error(j.error);
                    return;
                }
                var b = [];
                var ng = [];
                var k = j.feed.entry;
                array.forEach(k, lang.hitch(this, function (result) {
                    // add social media type/id for filtering
                    result.smType = this.id;
                    result.filterType = 3;
                    result.filterContent = result.link[0].href;
                    result.filterAuthor = result.author[0].yt$userId.$t;
                    // add date to result
                    var date = new Date(result.published.$t);
                    result.dateformatted = this._formatDate(date);
                    // add location protocol to result
                    result.protocol = location.protocol;
                    result.link = result.link[0].href;
                    result.full_name = result.author[0].name.$t;
                    result.video_title = result.title.$t;
                    result.descriptionText = this._parseURL(result.media$group.media$description.$t);
                    result.height = result.media$group.media$thumbnail[0].height;
                    result.width = result.media$group.media$thumbnail[0].width;
                    result.thumbnail = result.media$group.media$thumbnail[0].url;
                    result.seconds = this._parseSeconds(result.media$group.yt$duration.seconds);
                    // eliminate geo photos which we already have on the map
                    if (this._dataIds[result.id.$t]) {
                        return;
                    }
                    // filter variable
                    var filter = false,
                        i;
                    // check for filterd user
                    if (this.filterUsers && this.filterUsers.length) {
                        for (i = 0; i < this.filterUsers.length; i++) {
                            if (this.filterUsers[i].toString() === result.author[0].yt$userId.$t.toString()) {
                                filter = true;
                                break;
                            }
                        }
                    }
                    // check if contains bad word
                    if (!filter && this.filterWords && this.filterWords.length) {
                        for (i = 0; i < this.filterWords.length; i++) {
                            if (this._findWordInText(this.filterWords[i], result.title.$t)) {
                                filter = true;
                                break;
                            }
                            if (this._findWordInText(this.filterWords[i], result.media$group.media$description.$t)) {
                                filter = true;
                                break;
                            }
                        }
                    }
                    // if this feature needs to be filtered
                    if (filter) {
                        //console.log('filtered', result);
                        return;
                    }
                    this._dataIds[result.id.$t] = true;
                    var geoPoint = null;
                    if (result.georss$where) {
                        if (result.georss$where.gml$Point) {
                            if (result.georss$where.gml$Point.gml$pos) {
                                var g = result.georss$where.gml$Point.gml$pos.$t.split(' ');
                                geoPoint = Point(parseFloat(g[1]), parseFloat(g[0]));
                            }
                        }
                    }
                    if (geoPoint && geoPoint.hasOwnProperty('x') && geoPoint.hasOwnProperty('y')) {
                        // convert the Point to WebMercator projection
                        var a = webMercatorUtils.geographicToWebMercator(geoPoint);
                        // make the Point into a Graphic
                        var graphic = new Graphic(a, this.symbol, result, this.infoTemplate);
                        b.push(graphic);
                    } else {
                        ng.push(result);
                    }
                }));
                // add new graphics to widget
                var graphics = this.get("graphics");
                graphics = graphics.concat(b);
                this.set("graphics", graphics);
                // add non geocode results to noGeo
                var noGeo = this.get("noGeo");
                noGeo.concat(ng);
                this.set("noGeo", noGeo);
                // add new graphics to layer
                this.featureLayer.applyEdits(b, null, null);
                // update event with new graphics
                this.emit("update", {
                    graphics: b,
                    noGeo: ng
                });
            },
            _parseSeconds: function (sec) {
                var hr = Math.floor(sec / 3600);
                var min = Math.floor((sec - (hr * 3600)) / 60);
                sec -= ((hr * 3600) + (min * 60));
                sec += '';
                min += '';
                while (min.length < 2) {
                    min = '0' + min;
                }
                while (sec.length < 2) {
                    sec = '0' + sec;
                }
                hr = (hr) ? ':' + hr : '';
                return hr + min + ':' + sec;
            },
            _parseURL: function (text) {
                return text.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&~\?\/.=]+/g, function (url) {
                    return '<a target="_blank" href="' + url + '">' + url + '</a>';
                });
            },
            _visible: function () {
                this.setVisibility(this.get("visible"));
            },
            _error: function (e) {
                this._updateEnd();
                this.emit("error", e);
            },
            _updateEnd: function () {
                this.query = null;
                this.emit("update-end", {});
            }
        });
    });