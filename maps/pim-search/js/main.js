define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "esri/arcgis/utils",
    "dojo/dom-construct",
    "dojo/dom",
    "dojo/on",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/dom-class",
    "application/TableOfContents",
    "application/ShareDialog",
    "application/Drawer",
    "application/DrawerMenu",
    "esri/layers/FeatureLayer",
    "esri/dijit/HomeButton",
    "esri/dijit/LocateButton",
    "esri/dijit/BasemapToggle",
    "esri/dijit/Geocoder",
    "esri/dijit/Popup",
    "esri/dijit/Legend",
    "esri/dijit/Search",
    "application/About",
    "application/SocialLayers",
    "esri/dijit/OverviewMap",
    "dijit/registry",
    "dojo/_base/array",
    "esri/lang"
],
function(
    declare,
    lang,
    arcgisUtils,
    domConstruct,
    dom,
    on,
    domStyle,
    domAttr,
    domClass,
    TableOfContents, ShareDialog, Drawer, DrawerMenu, FeatureLayer,
    HomeButton, LocateButton, BasemapToggle,
    Geocoder,
    Popup,
    Legend,
    Search,
    About,
    SocialLayers,
    OverviewMap,
    registry,
    array,
    esriLang
) {
    return declare("", [About, SocialLayers], {
        config: {},
        constructor: function(){
            // css classes
            this.css = {
                mobileSearchDisplay: "mobile-locate-box-display",
                toggleBlue: 'toggle-grey',
                toggleBlueOn: 'toggle-grey-on',
                panelPadding: "panel-padding",
                panelContainer: "panel-container",
                panelHeader: "panel-header",
                panelSection: "panel-section",
                panelSummary: "panel-summary",
                panelDescription: "panel-description",
                panelModified: "panel-modified-date",
                panelViews: "panel-views-count",
                panelMoreInfo: "panel-more-info",
                pointerEvents: "pointer-events",
                iconRight: "icon-right",
                iconList: "icon-list",
                iconLayers: "icon-layers",
                iconAbout: "icon-info-circled-1",
                iconText: "icon-text",
                locateButtonTheme: "LocateButtonCalcite",
                homebuttonTheme: "HomeButtonCalcite",
                desktopGeocoderTheme: "geocoder-desktop",
                desktopSearchTheme: "search-desktop",
                mobileGeocoderTheme: "geocoder-mobile",
                appLoading: "app-loading",
                appError: "app-error"
            };
            // pointer event support
            if(this._pointerEventsSupport()){
                domClass.add(document.documentElement, this.css.pointerEvents);
            }
            // mobile size switch domClass
            this._showDrawerSize = 850;
        },
        startup: function (config) {
            // config will contain application and user defined info for the template such as i18n strings, the web map id
            // and application id
            // any url parameters and any application specific configuration information.
            if (config) {
                //config will contain application and user defined info for the template such as i18n strings, the web map id
                // and application id
                // any url parameters and any application specific configuration information.
                this.config = config;
                // drawer
                this._drawer = new Drawer({
                    showDrawerSize: this._showDrawerSize,
                    borderContainer: 'bc_outer',
                    contentPaneCenter: 'cp_outer_center',
                    contentPaneSide: 'cp_outer_left',
                    toggleButton: 'hamburger_button'
                });
                // drawer resize event
                on(this._drawer, 'resize', lang.hitch(this, function () {
                    // check mobile button status
                    this._checkMobileGeocoderVisibility();
                }));
                // startup drawer
                this._drawer.startup();
                //supply either the webmap id or, if available, the item info
                var itemInfo = this.config.itemInfo || this.config.webmap;
                this._createWebMap(itemInfo);
            } else {
                var error = new Error("Main:: Config is not defined");
                this.reportError(error);
            }
        },
        reportError: function (error) {
            // remove spinner
            this._hideLoadingIndicator();
            // add app error
            domClass.add(document.body, this.css.appError);
            // set message
            var node = dom.byId('error_message');
            if(node){
                if (this.config && this.config.i18n) {
                    node.innerHTML = this.config.i18n.map.error + ": " + error.message;
                } else {
                    node.innerHTML = "Unable to create map: " + error.message;
                }
            }
        },
        // if pointer events are supported
        _pointerEventsSupport: function(){
            var element = document.createElement('x');
            element.style.cssText = 'pointer-events:auto';
            return element.style.pointerEvents === 'auto';
        },
        _initLegend: function(){
            var legendNode = dom.byId('LegendDiv');
            if(legendNode){
                this._mapLegend = new Legend({
                    map: this.map,
                    layerInfos: this.layerInfos
                }, legendNode);
                this._mapLegend.startup();
            }
        },
        _initTOC: function(){
            // layers
            var tocNode = dom.byId('TableOfContents'), socialTocNode, tocLayers, socialTocLayers, toc, socialToc;
            if (tocNode) {
                tocLayers = this.layers;
                toc = new TableOfContents({
                    map: this.map,
                    layers: tocLayers
                }, tocNode);
                toc.startup();
            }
            // if we have social layers
            if (this.socialLayers && this.socialLayers.length) {
                // add social specific html
                var content = '';
                content += '<div class="' + this.css.panelHeader + '">' + this.config.i18n.social.mediaLayers + '</div>';
                content += '<div class="' + this.css.panelContainer + '">';
                content += '<div class="' + this.css.panelDescription + '">' + this.config.i18n.social.mediaLayersDescription + '</div>';
                content += '<div id="MediaTableOfContents"></div>';
                content += '</div>';
                // get node to insert
                var node = dom.byId('social_media_layers');
                if(node){
                    node.innerHTML = content;
                }
                // get toc node for social layers
                socialTocNode = dom.byId('MediaTableOfContents');
                // if node exists
                if(socialTocNode){
                    socialTocLayers = this.socialLayers;
                    socialToc = new TableOfContents({
                        map: this.map,
                        layers: socialTocLayers
                    }, socialTocNode);
                    socialToc.startup();
                }
            }
        },
        _init: function () {
            // menu panels
            this.drawerMenus = [];
            var content, menuObj;
            // map panel enabled
            if (this.config.enableAboutPanel) {
                content = '';
                content += '<div class="' + this.css.panelContainer + '">';
                // if summary enabled
                if (this.config.enableSummaryInfo) {
                    content += '<div class="' + this.css.panelHeader + '">' + this.config.title + '</div>';
                    content += '<div class="' + this.css.panelSummary + '" id="summary"></div>';
                    if(this.config.enableModifiedDate){
                        content += '<div class="' + this.css.panelModified + '" id="date_modified"></div>';
                    }
                    if(this.config.enableViewsCount){
                        content += '<div class="' + this.css.panelViews + '" id="views_count"></div>';
                    }
                    if(this.config.enableMoreInfo){
                        content += '<div class="' + this.css.panelMoreInfo + '" id="more_info_link"></div>';
                    }
                }
                // show notes layer and has one of required things for getting notes layer
                if(this.config.notesLayer && this.config.notesLayer.id){
                    content += '<div id="map_notes_section">';
                    content += '<div class="' + this.css.panelHeader + '"><span id="map_notes_title">' + this.config.i18n.general.featured + '</span></div>';
                    content += '<div class="' + this.css.panelSection + '" id="map_notes"></div>';
                    content += '</div>';
                }
                // show bookmarks and has bookmarks
                if(this.config.enableBookmarks && this.bookmarks && this.bookmarks.length){
                    content += '<div class="' + this.css.panelHeader + '">' + this.config.i18n.mapNotes.bookmarks + '</div>';
                    content += '<div class="' + this.css.panelSection + '" id="map_bookmarks"></div>';
                }
                content += '</div>';
                // menu info
                menuObj = {
                    title: this.config.i18n.general.about,
                    label: '<div class="' + this.css.iconAbout + '"></div><div class="' + this.css.iconText + '">' + this.config.i18n.general.about + '</div>',
                    content: content
                };
                // map menu
                if(this.config.defaultPanel === 'about'){
                    this.drawerMenus.splice(0,0,menuObj);
                }
                else{
                    this.drawerMenus.push(menuObj);
                }
            }
            if (this.config.enableLegendPanel) {
                content = '';
                content += '<div class="' + this.css.panelHeader + '">' + this.config.i18n.general.legend + '</div>';
                content += '<div class="' + this.css.panelContainer + '">';
                content += '<div class="' + this.css.panelPadding + '">';
                content += '<div id="twitter_legend_auth"></div>';
                content += '<div id="LegendDiv"></div>';
                content += '</div>';
                content += '</div>';
                // menu info
                menuObj = {
                    title: this.config.i18n.general.legend,
                    label: '<div class="' + this.css.iconList + '"></div><div class="' + this.css.iconText + '">' + this.config.i18n.general.legend + '</div>',
                    content: content
                };
                // legend menu
                if(this.config.defaultPanel === 'legend'){
                    this.drawerMenus.splice(0,0,menuObj);
                }
                else{
                    this.drawerMenus.push(menuObj);
                }
            }
            // Layers Panel
            if (this.config.enableLayersPanel) {
                content = '';
                content += '<div class="' + this.css.panelHeader + '">' + this.config.i18n.general.layers + '</div>';
                content += '<div class="' + this.css.panelContainer + '">';
                content += '<div id="TableOfContents"></div>';
                content += '</div>';
                content += '<div id="social_media_layers"></div>';
                // menu info
                menuObj = {
                    title: this.config.i18n.general.layers,
                    label: '<div class="' + this.css.iconLayers + '"></div><div class="' + this.css.iconText + '">' + this.config.i18n.general.layers + '</div>',
                    content: content
                };
                // layers menu
                if(this.config.defaultPanel === 'layers'){
                    this.drawerMenus.splice(0,0,menuObj);
                }
                else{
                    this.drawerMenus.push(menuObj);
                }
            }
            // menus
            this._drawerMenu = new DrawerMenu({
                menus: this.drawerMenus
            }, dom.byId("drawer_menus"));
            this._drawerMenu.startup();
            // locate button
            if (this.config.enableLocateButton) {
                this._LB = new LocateButton({
                    map: this.map,
                    theme: this.css.locateButtonTheme
                }, 'LocateButton');
                this._LB.startup();
            }
            // home button
            if (this.config.enableHomeButton) {
                this._HB = new HomeButton({
                    map: this.map,
                    theme: this.css.homebuttonTheme
                }, 'HomeButton');
                this._HB.startup();
                // clear locate on home button
                on(this._HB, 'home', lang.hitch(this, function(){
                    if(this._LB){
                        this._LB.clear();
                    }
                }));
            }
            // basemap toggle
            if (this.config.enableBasemapToggle) {
                var BT = new BasemapToggle({
                    map: this.map,
                    basemap: this.config.nextBasemap,
                    defaultBasemap: this.config.defaultBasemap
                }, 'BasemapToggle');
                BT.startup();
                /* Start temporary until after JSAPI 4.0 is released */
                var bmLayers = [],
                  mapLayers = this.map.getLayersVisibleAtScale(this.map.getScale());
                if (mapLayers) {
                  for (var i = 0; i < mapLayers.length; i++) {
                    if (mapLayers[i]._basemapGalleryLayerType) {
                      var bmLayer = this.map.getLayer(mapLayers[i].id);
                      if (bmLayer) {
                        bmLayers.push(bmLayer);
                      }
                    }
                  }
                }
                on.once(this.map, 'basemap-change', lang.hitch(this, function () {
                  if (bmLayers && bmLayers.length) {
                    for (var i = 0; i < bmLayers.length; i++) {
                      this.map.removeLayer(bmLayers[i]);
                    }
                  }
                }));
                /* END temporary until after JSAPI 4.0 is released */
            }
            // share dialog
            if (this.config.enableShareDialog) {
                this._ShareDialog = new ShareDialog({
                    theme: this.css.iconRight,
                    bitlyLogin: this.config.bitlyLogin,
                    bitlyKey: this.config.bitlyKey,
                    map: this.map,
                    image: this.config.sharinghost + '/sharing/rest/content/items/' + this.item.id + '/info/' + this.item.thumbnail,
                    title: this.config.title,
                    summary: this.item.snippet,
                    hashtags: 'esriPIM'
                }, 'ShareDialog');
                this._ShareDialog.startup();
            }
            // i18n overview placement
            var overviewPlacement = 'left';
            if(this.config.i18n.direction === 'rtl'){
                overviewPlacement = 'right';
            }
            // Overview Map
            if(this.config.enableOverviewMap){
                var size = this._getOverviewMapSize();
                this._overviewMap = new OverviewMap({
                    attachTo: "bottom-" + overviewPlacement,
                    width: size,
                    height: size,
                    visible: this.config.openOverviewMap,
                    map: this.map
                });
                this._overviewMap.startup();
                // responsive overview size
                on(this.map, 'resize', lang.hitch(this, function(){
                    this._resizeOverviewMap();
                }));
            }
            // geocoders
            this._createGeocoders();
            // startup social
            this.initSocial();
            // startup map panel
            this.initAboutPanel();
            // startup legend
            this._initLegend();
            // startup toc
            this._initTOC();
            // set social dialogs
            this.configureSocial();
            // on body click containing underlay class
            on(document.body, '.dijitDialogUnderlay:click', function(){
                // get all dialogs
                var filtered = array.filter(registry.toArray(), function(w){
                    return w && w.declaredClass == "dijit.Dialog";
                });
                // hide all dialogs
                array.forEach(filtered, function(w){
                    w.hide();
                });
            });
            // hide loading div
            this._hideLoadingIndicator();

            // dialog modal
            if(this.config.enableDialogModal){
                require(["dijit/Dialog"], lang.hitch(this, function(Dialog){
                    var dialogContent = this.config.dialogModalContent;
                    var dialogModal = new Dialog({
                        title: this.config.dialogModalTitle || "Access and Use Constraints",
                        content: dialogContent,
                        style: "width: 375px"
                    });
                    dialogModal.show();
                }));
            }

            // swipe layer
            if(this.config.swipeLayer && this.config.swipeLayer.id){
                // get swipe tool
                require(["esri/dijit/LayerSwipe"], lang.hitch(this, function(LayerSwipe){
                    // get layer
                    var layer = this.map.getLayer(this.config.swipeLayer.id);
                    if(layer){
                        // create swipe
                        var layerSwipe = new LayerSwipe({
                            type: this.config.swipeType,
                            theme: "PIMSwipe",
                            invertPlacement: this.config.swipeInvertPlacement,
                            map: this.map,
                            layers: [ layer ]
                        }, "swipeDiv");
                        layerSwipe.startup();
                        on(layer, 'visibility-change', lang.hitch(this, function(evt){
                            if(evt.visible){
                                layerSwipe.set("enabled", true);
                            }
                            else{
                                layerSwipe.set("enabled", false);
                            }
                        }));
                    }
                }));
            }
            // drawer size check
            this._drawer.resize();


        },
        _getOverviewMapSize: function(){
            var breakPoint = 500;
            var size = 150;
            if(this.map.width < breakPoint || this.map.height < breakPoint){
                size = 75;
            }
            return size;
        },
        _resizeOverviewMap: function(){
            if(this._overviewMap){
                var size = this._getOverviewMapSize();
                if(this._overviewMap.hasOwnProperty('resize')){
                    this._overviewMap.resize({ w:size, h:size });
                }
            }
        },
        _checkMobileGeocoderVisibility: function () {
            if(this._mobileGeocoderIconNode && this._mobileSearchNode){
                // check if mobile icon needs to be selected
                if (domClass.contains(this._mobileGeocoderIconNode, this.css.toggleBlueOn)) {
                    domClass.add(this._mobileSearchNode, this.css.mobileSearchDisplay);
                }
            }
        },
        _showMobileGeocoder: function () {
            if(this._mobileSearchNode && this._mobileGeocoderIconContainerNode){
                domClass.add(this._mobileSearchNode, this.css.mobileSearchDisplay);
                domClass.replace(this._mobileGeocoderIconContainerNode, this.css.toggleBlueOn, this.css.toggleBlue);
            }
        },
        _hideMobileGeocoder: function () {
            if(this._mobileSearchNode && this._mobileGeocoderIconContainerNode){
                domClass.remove(this._mobileSearchNode, this.css.mobileSearchDisplay);
                domStyle.set(this._mobileSearchNode, "display", "none");
                domClass.replace(this._mobileGeocoderIconContainerNode, this.css.toggleBlue, this.css.toggleBlueOn);
            }
        },
        _setTitle: function(title){
            // set config title
            this.config.title = title;
            // window title
            window.document.title = title;
        },
        _setTitleBar: function () {
            // map title node
            var node = dom.byId('title');
            if (node) {
                // set title
                node.innerHTML = this.config.title;
                // title attribute
                domAttr.set(node, "title", this.config.title);
            }
        },
        _setDialogModalContent: function(content) {
            // set dialog modal content
            this.config.dialogModalContent = content;
        },
        _createGeocoderOptions: function() {
            var hasEsri = false, esriIdx, geocoders = lang.clone(this.config.helperServices.geocode);
            // default options
            var options = {
                map: this.map,
                autoNavigate: true,
                autoComplete: true,
                arcgisGeocoder: {
                    placeholder: this.config.i18n.general.find
                },
                geocoders: null
            };
            //only use geocoders with a url defined
            geocoders = array.filter(geocoders, function (geocoder) {
                if (geocoder.url) {
                    return true;
                }
                else{
                    return false;
                }
            });
            // at least 1 geocoder defined
            if(geocoders.length){
                // each geocoder
                array.forEach(geocoders, lang.hitch(this, function(geocoder) {
                    // if esri geocoder
                    if (geocoder.url && geocoder.url.indexOf(".arcgis.com/arcgis/rest/services/World/GeocodeServer") > -1) {
                        hasEsri = true;
                        geocoder.name = "Esri World Geocoder";
                        geocoder.outFields = "Match_addr, stAddr, City";
                        geocoder.singleLineFieldName = "SingleLine";
                        geocoder.esri = true;
                        geocoder.placefinding = true;
                        geocoder.placeholder = this.config.i18n.general.find;
                    }
                }));
                //only use geocoders with a singleLineFieldName that allow placefinding unless its custom
                geocoders = array.filter(geocoders, function (geocoder) {
                    if (geocoder.name && geocoder.name === "Custom") {
                        return (esriLang.isDefined(geocoder.singleLineFieldName));
                    } else {
                        return (esriLang.isDefined(geocoder.singleLineFieldName) && esriLang.isDefined(geocoder.placefinding) && geocoder.placefinding);
                    }
                });
                // if we have an esri geocoder
                if (hasEsri) {
                    for (var i = 0; i < geocoders.length; i++) {
                        if (esriLang.isDefined(geocoders[i].esri) && geocoders[i].esri === true) {
                            esriIdx = i;
                            break;
                        }
                    }
                }
                // set autoComplete
                options.autoComplete = hasEsri;
                // set esri options
                if (hasEsri) {
                    options.minCharacters = 0;
                    options.maxLocations = 5;
                    options.searchDelay = 100;
                }
                //If the World geocoder is primary enable auto complete
                if (hasEsri && esriIdx === 0) {
                    options.arcgisGeocoder = geocoders.splice(0, 1)[0]; //geocoders[0];
                    if (geocoders.length > 0) {
                        options.geocoders = geocoders;
                    }
                } else {
                    options.arcgisGeocoder = false;
                    options.geocoders = geocoders;
                }
            }
            return options;
        },

        // _setupSearch() {

        // },

        // create geocoder widgets
        _createGeocoders: function () {
            // get options
            var createdOptions = this._createGeocoderOptions();

            // lets substitute the new search widget!
            createdOptions.enableSourcesMenu = false;
            createdOptions.enableButtonMode = true;

            var flSource = {featureLayer: this.map.getLayer("Bike_Paths_2143"),
                suggest: true,
                searchFields: ["STREETNAME"],
                displayField: "STREETNAME",
                exactMatch: false,
                outFields: ["*"],
                name: "Bikepaths",
                //labelSymbol: textSymbol,
                placeholder: "example: Buchman Path",
                maxResults: 6,
                maxSuggestions: 6,
                enableSuggestions: true,
                minCharacters: 0
            };

            // desktop geocoder options
            var desktopOptions = lang.mixin({}, createdOptions, {
                // we'll skip setting the custom theme for now...
                //theme: this.css.desktopSearchTheme
            });
            // mobile geocoder options
            var mobileOptions = lang.mixin({}, createdOptions, {
                //theme: this.css.mobileGeocoderTheme
            });
            // desktop size geocoder
            // this._geocoder = new Geocoder(desktopOptions, dom.byId("geocoderSearch"));
            // this._geocoder.startup();

            this._geocoder = new Search(desktopOptions, dom.byId("geocoderSearch"));
            var sources = this._geocoder.get("sources");
            sources.push(flSource);
            this._geocoder.set("sources", sources);
            this._geocoder.startup();

            // geocoder results
            on(this._geocoder, 'find-results', lang.hitch(this, function (response) {
                if (!response.results || !response.results.results || !response.results.results.length) {
                    alert(this.config.i18n.general.noSearchResult);
                }
            }));
            // mobile sized geocoder
            // this._mobileGeocoder = new Search(mobileOptions, dom.byId("geocoderMobile"));

            // var sources = this._mobileGeocoder.get("sources");
            // sources.push(flSource);
            // this._mobileGeocoder.set("sources", sources);
            // this._mobileGeocoder.startup();

            // geocoder results
            // on(this._mobileGeocoder, 'find-results', lang.hitch(this, function (response) {
            //     if (!response.results || !response.results.results || !response.results.results.length) {
            //         alert(this.config.i18n.general.noSearchResult);
            //     }
            //     this._hideMobileGeocoder();
            // }));
            // keep geocoder values in sync
            this._geocoder.watch("value", lang.hitch(this, function () {
                var value = arguments[2];
                //this._mobileGeocoder.set("value", value);
            }));
            // keep geocoder values in sync
            // this._mobileGeocoder.watch("value", lang.hitch(this, function () {
            //     var value = arguments[2];
            //     this._geocoder.set("value", value);
            // }));
            // geocoder nodes
            // this._mobileGeocoderIconNode = dom.byId("mobileGeocoderIcon");
            // this._mobileSearchNode = dom.byId("mobileSearch");
            // this._mobileGeocoderIconContainerNode = dom.byId("mobileGeocoderIconContainer");
            // // mobile geocoder toggle
            // if (this._mobileGeocoderIconNode) {
            //     on(this._mobileGeocoderIconNode, "click", lang.hitch(this, function () {
            //         if (domStyle.get(this._mobileSearchNode, "display") === "none") {
            //             this._showMobileGeocoder();
            //         } else {
            //             this._hideMobileGeocoder();
            //         }
            //     }));
            // }
            // var closeMobileGeocoderNode = dom.byId("btnCloseGeocoder");
            // if(closeMobileGeocoderNode){
            //     // cancel mobile geocoder
            //     on(closeMobileGeocoderNode, "click", lang.hitch(this, function () {
            //         this._hideMobileGeocoder();
            //     }));
            // }
        },
        // hide map loading spinner
        _hideLoadingIndicator: function () {
            // add loaded class
            domClass.remove(document.body, this.css.appLoading);
        },
        //create a map based on the input web map id
        _createWebMap: function (itemInfo) {
            // popup dijit
            var customPopup = new Popup({}, domConstruct.create("div"));
            // add popup theme
            domClass.add(customPopup.domNode, "calcite");
            // set extent from URL Param
            if(this.config.extent){
                var e = this.config.extent.split(',');
                if(e.length === 4){
                    itemInfo.item.extent = [
                        [
                            parseFloat(e[0]),
                            parseFloat(e[1])
                        ],
                        [
                            parseFloat(e[2]),
                            parseFloat(e[3])
                        ]
                    ];
                }
            }
            //can be defined for the popup like modifying the highlight symbol, margin etc.
            arcgisUtils.createMap(itemInfo, "mapDiv", {
                mapOptions: {
                    infoWindow: customPopup
                    //Optionally define additional map config here for example you can
                    //turn the slider off, display info windows, disable wraparound 180, slider position and more.
                },
                editable: false,
                usePopupManager: true,
                bingMapsKey: this.config.bingmapskey
            }).then(lang.hitch(this, function (response) {
                //Once the map is created we get access to the response which provides important info
                //such as the map, operational layers, popup info and more. This object will also contain
                //any custom options you defined for the template. In this example that is the 'theme' property.
                //Here' we'll use it to update the application to match the specified color theme.
                this.map = response.map;
                this.layers = response.itemInfo.itemData.operationalLayers;
                this.item = response.itemInfo.item;
                this.bookmarks = response.itemInfo.itemData.bookmarks;
                this.layerInfos = arcgisUtils.getLegendLayers(response);
                // window title and config title
                this._setTitle(this.config.title || response.itemInfo.item.title);
                // title bar title
                this._setTitleBar();
                // dialog modal content
                this._setDialogModalContent(this.config.dialogModalContent || response.itemInfo.item.licenseInfo);
                // map loaded
                if (this.map.loaded) {
                    this._init();
                } else {
                    on.once(this.map, 'load', lang.hitch(this, function () {
                        this._init();
                    }));
                }
            }), this.reportError);
        }
    });
});
