/** api: constructor
 *  .. class:: AddLayers(config)
 *
 *    Plugin for removing a selected layer from the map.
 *    TODO Make this plural - selected layers
 */
gxp.plugins.AddLayers = Ext.extend(gxp.plugins.Tool, {
    
    /** api: ptype = gxp_addlayers */
    ptype: "gxp_addlayers",
    
    /** api: config[addActionMenuText]
     *  ``String``
     *  Text for add menu item (i18n).
     */
    addActionMenuText: "Add layers",

    /** api: config[addActionTip]
     *  ``String``
     *  Text for add action tooltip (i18n).
     */
    addActionTip: "Add layers",
    
    /** api: config[addActionText]
     *  ``String``
     *  Text for the Add action. None by default.
     */
   
    /** api: config[addServerText]
     *  ``String``
     *  Text for add server button (i18n).
     */
    addServerText: "Add a New Server",

    /** api: config[addButtonText]
     *  ``String``
     *  Text for add layers button (i18n).
     */
    addButtonText: "Add layers",
    
    /** api: config[untitledText]
     *  ``String``
     *  Text for an untitled layer (i18n).
     */
    untitledText: "Untitled",

    /** api: config[addLayerSourceErrorText]
     *  ``String``
     *  Text for an error message when WMS GetCapabilities retrieval fails (i18n).
     */
    addLayerSourceErrorText: "Error getting WMS capabilities ({msg}).\nPlease check the url and try again.",

    /** api: config[availableLayersText]
     *  ``String``
     *  Text for the available layers (i18n).
     */
    availableLayersText: "Available Layers",

    /** api: config[availableLayersText]
     *  ``String``
     *  Text for the grid expander (i18n).
     */
    expanderTemplateText: "<p><b>Abstract:</b> {abstract}</p>",
    
    /** api: config[availableLayersText]
     *  ``String``
     *  Text for the layer title (i18n).
     */
    panelTitleText: "Title",

    /** api: config[availableLayersText]
     *  ``String``
     *  Text for the layer selection (i18n).
     */
    layerSelectionText: "View available data from:",
    
    /** api: config[instructionsText]
     *  ``String``
     *  Text for additional instructions at the bottom of the grid (i18n).
     *  None by default.
     */
    
    /** api: config[doneText]
     *  ``String``
     *  Text for Done button (i18n).
     */
    doneText: "Done",

    /** api: config[upload]
     *  ``Object | Boolean``
     *  If provided, a :class:`gxp.LayerUploadPanel` will be made accessible
     *  from a button on the Available Layers dialog.  This panel will be 
     *  constructed using the provided config.  By default, no upload 
     *  functionality is provided.
     */
    
    /** api: config[uploadText]
     *  ``String``
     *  Text for upload button (only renders if ``upload`` is provided).
     */
    uploadText: "Upload Data",

    /** api: config[nonUploadSources]
     *  ``Array``
     *  If ``upload`` is enabled, the upload button will not be displayed for 
     *  sources whose identifiers or URLs are in the provided array.  By 
     *  default, the upload button will make an effort to be shown for all 
     *  sources with a url property.
     */

    /** api: config[relativeUploadOnly]
     *  ``Boolean``
     *  If ``upload`` is enabled, only show the button for sources with relative
     *  URLs (e.g. "/geoserver").  Default is ``true``.
     */
    relativeUploadOnly: true,

    /** api: config[startSourceId]
     * ``Integer``
     * The identifier of the source that we should start with.
     */
    startSourceId: null,
    
    /** private: property[selectedSource]
     *  :class:`gxp.plugins.LayerSource`
     *  The currently selected layer source.
     */
    selectedSource: null,

    /** private: method[constructor]
     */
    constructor: function(config) {
        this.addEvents(
            /** api: event[sourceselected]
             *  Fired when a new source is selected.
             *
             *  Listener arguments:
             *
             *  * tool - :class:`gxp.plugins.AddLayers` This tool.
             *  * source - :class:`gxp.plugins.LayerSource` The selected source.
             */
            "sourceselected"
        );
        gxp.plugins.AddLayers.superclass.constructor.apply(this, arguments);        
    },
    
    /** api: method[addActions]
     */
    addActions: function() {
        var selectedLayer;
        var actions = gxp.plugins.AddLayers.superclass.addActions.apply(this, [{
            tooltip : this.addActionTip,
            text: this.addActionText,
            menuText: this.addActionMenuText,
            disabled: true,
            iconCls: "gxp-icon-addlayers",
            handler : this.showCapabilitiesGrid,
            scope: this
        }]);
        
        this.target.on("ready", function() {actions[0].enable();});
        return actions;
    },
        
    /** api: method[showCapabilitiesGrid]
     * Shows the window with a capabilities grid.
     */
    showCapabilitiesGrid: function() {
        if(!this.capGrid) {
            this.initCapGrid();
        }
        this.capGrid.show();
    },

    /**
     * private: method[initCapGrid]
     * Constructs a window with a capabilities grid.
     */
    initCapGrid: function() {
        var source, data = [];        
        for (var id in this.target.layerSources) {
            source = this.target.layerSources[id];
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            if (source.store && (id != 'rss') && (id != 'arcgis93') && ((id != 'animation')))
			{
                data.push([id, source.title || id]);
            }
        }
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// RSS
		data.push(['rss'      , 'RSS'     ]);
		data.push(['animation', 'Анимация']);
		// ArcGIS
		if (arcgisStore && arcgisStore.reader.jsonData.arcgis.servers.length > 0)
		{
			for (var idx=0; idx < arcgisStore.reader.jsonData.arcgis.servers.length; ++idx) 
			{
				title = arcgisStore.reader.jsonData.arcgis.servers[idx].title;
				data.push(['arcgis93_' + idx, title]);
//				console.log ('arcgis93_' + idx + ', ' + title);
			}
		}
		//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        var sources = new Ext.data.ArrayStore({
            fields: ["id", "title"],
            data: data
        });

        var expander = this.createExpander();
        var addLayers = function() {
            var key = sourceComboBox.getValue();
			var records = capGridPanel.getSelectionModel().getSelections();
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			if (key == 'rss')
			{
				var source = this.target.layerSources['rss'];
				if (!source)
					source = new gxp.plugins.RssSource();
				var layerStore = this.target.mapPanel.layers;
				for (var i=0, ii = records.length; i<ii; ++i) 
				{
					record = source.createRecord(records[i].get("title")); 
					if (record)
						layerStore.add([record]);
				}
			}
			else if (key == 'animation')
			{
				var source = this.target.layerSources['animation'];
				if (!source)
					source = new gxp.plugins.AnimationSource();
				var layerStore = this.target.mapPanel.layers;
				for (var i=0, ii = records.length; i<ii; ++i) 
				{
					record = source.createRecord(records[i].get("title" ), records[i].get("name"), 
					                             records[i].get("url"   ), records[i].get("x_axis"),
												 records[i].get("layers"));
					if (record)
						layerStore.add([record]);
				}
			}
			else if (key.indexOf ('arcgis93_') == 0)
			{
				var source = this.target.layerSources['arcgis93']; 
				if (!source)
					source = new gxp.plugins.ArcGIS93Source();
				var url = source.getServerURL(sourceComboBox.getRawValue());
				var layerStore = this.target.mapPanel.layers;
				for (var i=0; i < records.length; i++) 
				{
					var curl  = url + '?layers=show:' + records[i].get("id");
					var layer = source.createLayer(records[i].get("title"), curl);
					record = source.createRecord(sourceComboBox.getRawValue(), layer);
					if (record)
						layerStore.add([record]);
				}
			}
			//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			else
			{
				var source     = this.target.layerSources[key];
				var layerStore = this.target.mapPanel.layers;
				var record;
				for (var i=0, ii=records.length; i<ii; ++i) 
				{
					record = source.createLayerRecord({
						name: records[i].get("name"),
						source: key
					});
					if (record) {
						if (record.get("group") === "background")
						{
							layerStore.insert(0, [record]);
						} else {
							layerStore.add([record]);
						}
					}
				}
			}
        };

        var idx = 0;
        if (this.startSourceId !== null) {
            sources.each(function(record) {
                if (record.get("id") === this.startSourceId) {
                    idx = sources.indexOf(record);
                }
            }, this);
        }

        var capGridPanel = new Ext.grid.GridPanel({
            store: this.target.layerSources[data[idx][0]].store,
            autoScroll: true,
            flex: 1,
            autoExpandColumn: "title",
            plugins: [expander],
            colModel: new Ext.grid.ColumnModel([
                expander,
                {id: "title", header: this.panelTitleText, dataIndex: "title", sortable: true},
                {header: "Id", dataIndex: "name", width: 150, sortable: true}
            ]),
            listeners: {
                rowdblclick: addLayers,
                scope: this
            }
        });
        
        var sourceComboBox = new Ext.form.ComboBox({
            store: sources,
            valueField: "id",
            displayField: "title",
            triggerAction: "all",
            editable: false,
            allowBlank: false,
            forceSelection: true,
            mode: "local",
            width: 400,
            value: data[idx][0],
			isServiceLoaded : function (title)
			{
				var result = false;
				for (var i = 0; i < this.store.data.length; i++)
				{
					if (this.store.data.items[i].data.title === title)
					{
						result = true;
						break;
					}
				}
				return result;
			},
			setSelection : function (idx)                       //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			{
				this.setValue (this.store.data.items[idx].data.title);
				this.fireEvent("select", this, this.store.data.items[idx]);
			},                                                  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			getServiceIDX : function (title, group)
			{
				var result = -1;
				if (title)
				{
					for (var i = 0; i < this.store.data.length; i++)
					{
						if (this.store.data.items[i].data.title === title)
						{
							result = i;
							break;
						}
					}
				}
				if ((result === -1) && group)
				{
				for (var i = 0; i < this.store.data.length; i++)
				{
					if (this.store.data.items[i].data.id.indexOf(group) === 0)
					{
						result = i;
						break;
					}
				}
				}
				return result;
			},
			getServiceRecord : function (idx)
			{
				return this.store.data.items[idx];
			},                                                  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            listeners: {
                select: function(combo, record, index)
				{
					//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
					if (record.get("id") === 'rss')
					{
						var source = this.target.layerSources['rss'];
						if (!source)
							source = new gxp.plugins.RssSource();
						if (source)
						{
							capGridPanel.reconfigure(source.getLayersStore(), capGridPanel.getColumnModel());
							capGridPanel.getView().focusRow(0);
						}						
					}
					//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
					else if (record.get("id") === 'animation')
					{
						var source = this.target.layerSources['animation'];
						if (!source)
							source = new gxp.plugins.AnimationSource();
						if (source)
						{
							capGridPanel.reconfigure(source.getLayersStore(), capGridPanel.getColumnModel());
							capGridPanel.getView().focusRow(0);
						}						
					}
					//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
					else if (record.get("id").indexOf ('arcgis93_') == 0)
					{
						var source = this.target.layerSources['arcgis93'];
						if (!source)
							source = new gxp.plugins.ArcGIS93Source();
						if (source)
						{
							var url = source.getLayersURL(record.get("title"));
							capGridPanel.reconfigure(source.getLayersStore(url), capGridPanel.getColumnModel());
							capGridPanel.getView().focusRow(0);
						}
					}
					//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
					else
					{
						var source = this.target.layerSources[record.get("id")];
						capGridPanel.reconfigure(source.store, capGridPanel.getColumnModel());
						// TODO: remove the following when this Ext issue is addressed
						// http://www.extjs.com/forum/showthread.php?100345-GridPanel-reconfigure-should-refocus-view-to-correct-scroller-height&p=471843
						capGridPanel.getView().focusRow(0);
						this.setSelectedSource(source);
					}
                },
                scope: this
            }
        });
        
        var capGridToolbar = null;
        if (this.target.proxy || data.length > 1) {
            capGridToolbar = [
                new Ext.Toolbar.TextItem({
                    text: this.layerSelectionText
                }),
                sourceComboBox
            ];
        }
        
        if (this.target.proxy) {
            capGridToolbar.push("-", new Ext.Button({
                text: this.addServerText,
                iconCls: "gxp-icon-addserver",
                handler: function() {
                    newSourceWindow.show();
                }
            }));
        }
        
        var newSourceWindow = new gxp.NewSourceWindow({
            modal: true,
            listeners: {
                "server-added": function(url, restUrl, titleCustom, icon) {
					if (newSourceWindow.getServiceIDX() === 0)          //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
					{
						var idx = sourceComboBox.getServiceIDX (titleCustom);
						if (idx === -1)
						{
							newSourceWindow.setLoading();
                    
							var conf = {url: url, restUrl: restUrl};
							if(titleCustom){
								conf.title = titleCustom;
							}
                    
							this.target.addLayerSource({                // !!!!!!! target !!!!!!!!
								config: conf, // assumes default of gx_wmssource
								callback: function(id) {
									// add to combo and select
									var record = new sources.recordType({
										id: id,
										title: this.target.layerSources[id].title || this.untitledText
									});
									sources.insert(0, [record]);
									sourceComboBox.onSelect(record, 0);
									newSourceWindow.hide();
								},
								fallback: function(source, msg) {
									newSourceWindow.setError(
										new Ext.Template(this.addLayerSourceErrorText).apply({msg: msg})
									);
								},
								scope: this
							});
						} else {                                         //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
							newSourceWindow.hide();
							sourceComboBox.setSelection (idx);
							sourceComboBox.onSelect(sourceComboBox.getServiceRecord(idx), idx);
						}
					} else if (newSourceWindow.getServiceIDX() === 1) {
						if (!sourceComboBox.isServiceLoaded(titleCustom))
						{
							arcgisStore.reader.jsonData.arcgis.servers.push({'title': titleCustom, 'url' : url});
							var record = new sources.recordType({
								id: 'arcgis93_' + arcgisStore.reader.jsonData.arcgis.servers.length,
								title: titleCustom
							});
							sources.insert(sourceComboBox.store.data.length, [record]);
							sourceComboBox.store.data.items[sourceComboBox.store.data.length - 1].json = ['arcgis', titleCustom];

							var idx = sourceComboBox.getServiceIDX (titleCustom);
//							if ((idx >= 0) && (sourceComboBox.lastSelectionText != titleCustom))
							if (idx >= 0)
							{
								newSourceWindow.setLoading();
								sourceComboBox.setSelection (idx);
								sourceComboBox.onSelect(record, idx);
							}
							OpenLayers.Request.issue({
								method: "POST",
								url: "save",
								async: true,
								params:{
								    service : "arcgis"   ,
									title   : titleCustom,
									url     : url
								}
							});
						}
					} else if (newSourceWindow.getServiceIDX() === 2) {
//						console.log ('newSourceWindow.listeners : RSS - titleCustom = ' + titleCustom + ', url = ' + url);
						var idx = sourceComboBox.getServiceIDX ('', 'rss');
						if (idx >= 0)
						{
							var fname;
							var parts = url.split("/");
							if (parts)
								fname = parts[parts.length-1];
							else
								fname = 'Unreachable';
							if (fname.indexOf(".") > 0)
								fname = fname.substring (0, fname.indexOf("."));

							if (!rssStore.isRecordPresent (url))
							{
								var record = Ext.data.Record.create([
									{name: "timer", type: "integer"},
									{name: "name" , type: "string" },
									{name: "title", type: "string" },
									{name: "icon" , type: "string" },
									{name: "url"  , type: "string" }
								]); 
								var data = new record({
									timer: 0,
									name: fname,
									title: titleCustom,
									icon: icon,
									url : url
								}); 
							
								rssStore.add(data);
								// send to server => write to file
								OpenLayers.Request.issue({
									method: "POST",
									url: "save",
									async: true,
									params:{
									    service : "rss"      ,
										name    : fname      ,
										title   : titleCustom,
										icon    : icon       ,
										url     : url
									}
								});
							}
							sourceComboBox.onSelect (sourceComboBox.store.data.items[idx], idx);
						}
					}                                                     //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                },
                scope: this
            }
        });
        
		
        var items = {
            xtype: "container",
            region: "center",
            layout: "vbox",
            layoutConfig: {
                align: 'stretch'
            },
            items: [capGridPanel]
        };
        if (this.instructionsText) {
            items.items.push({
                xtype: "box",
                autoHeight: true,
                autoEl: {
                    tag: "p",
                    cls: "x-form-item",
                    style: "padding-left: 5px; padding-right: 5px"
                },
                html: this.instructionsText
            });
        }
        
        var bbarItems = [
            "->",
            new Ext.Button({
                text: this.addButtonText,
                iconCls: "gxp-icon-addlayers",
                handler: addLayers,
                scope : this
            }),
            new Ext.Button({
                text: this.doneText,
                handler: function() {
                    this.capGrid.hide();
                },
                scope: this
            })
        ];
        
        var uploadButton = this.createUploadButton();
        if (uploadButton) {
            bbarItems.unshift(uploadButton);
        }

        //TODO use addOutput here instead of just applying outputConfig
        this.capGrid = new Ext.Window(Ext.apply({
            title: this.availableLayersText,
            closeAction: "hide",
            layout: "border",
            height: 300,
            width: 750,
            modal: true,
            items: items,
            tbar: capGridToolbar,
            bbar: bbarItems,
            listeners: {
                hide: function(win) {
                    capGridPanel.getSelectionModel().clearSelections();
                },
                show: function(win) {
                    this.setSelectedSource(this.target.layerSources[data[idx][0]]);
                },
                scope: this
            }
        }, this.initialConfig.outputConfig));
        
    },
    
    /** private: method[setSelectedSource]
     *  :arg: :class:`gxp.plugins.LayerSource`
     */
    setSelectedSource: function(source) {
        this.selectedSource = source;
        this.fireEvent("sourceselected", this, source);
    },

    //ADDED
    selectOrAddSource: function(detail, callback){
      var serverUrl = this.target.uploadUrl.split('/rest')[0]
      var workspace = detail.import.targetWorkspsace.workspace.name
      var sourceFound = false
      for(key in this.target.layerSources){
        var source = this.target.layerSources[key]
        if( source.url == serverUrl + '/wms' || source.url == serverUrl + '/' + workspace + '/wms' ){

          this.setSelectedSource( source )
          callback()
          sourceFound = true

        }

      }

      if(!sourceFound) this.target.addLayerSource( {
        config: {
          url: serverUrl + '/' + workspace + '/wms',
          restUrl: serverUrl + '/rest',
          title: workspace
        },
        callback: function(key){
          this.setSelectedSource(this.target.layerSources[key])
          callback.apply(this);
        },
        scope: this
      } )

    },

    /** private: method[createUploadButton]
     *  If this tool is provided an ``upload`` property, a button will be created
     *  that launches a window with a :class:`gxp.LayerUploadPanel`.
     */
    createUploadButton: function() {
        var button;
        var uploadConfig = this.initialConfig.upload;
        // the url will be set in the sourceselected sequence
        var url=this.target.uploadUrl;
        if (uploadConfig) {
            if (typeof uploadConfig === "boolean") {
                uploadConfig = {};
            }
            button = new Ext.Button({
                xtype: "button",
                text: this.uploadText,
                iconCls: "gxp-icon-filebrowse",
                //hidden: true,
                handler: function() {
                    var panel = new gxp.LayerUploadPanel(Ext.apply({
                        url: url,
                        width: 350,
                        border: false,
                        bodyStyle: "padding: 10px 10px 0 10px;",
                        frame: true,
                        labelWidth: 65,
                        defaults: {
                            anchor: "95%",
                            allowBlank: false,
                            msgTarget: "side"
                        },
                        listeners: {
                            uploadcomplete: function(panel, detail) {
                                var layers = detail["import"].tasks[0].items;
                                var names = {}, resource, layer;
                                for (var i=0, len=layers.length; i<len; ++i) {
                                    resource = layers[i].resource;
                                    layer = resource.featureType || resource.coverage;
                                    names[layer.namespace.name + ":" + layer.name] = true;
                                }

                                this.selectOrAddSource(detail, function(){
                                this.selectedSource.store.load({
                                    callback: function(records, options, success) {
                                        var gridPanel, sel;
                                        if (this.capGrid && this.capGrid.isVisible()) {
                                            gridPanel = this.capGrid.get(0).get(0);
                                            sel = gridPanel.getSelectionModel();
                                            sel.clearSelections();
                                        }
                                        // select newly added layers
                                        var newRecords = [];
                                        var last = 0;
                                        this.selectedSource.store.each(function(record, index) {
                                            if (record.get("name") in names) {
                                                last = index;
                                                newRecords.push(record);
                                            }
                                        });
                                        //if (gridPanel) {
                                            //// this needs to be deferred because the 
                                            //// grid view has not refreshed yet
                                            //window.setTimeout(function() {
                                                //sel.selectRecords(newRecords);
                                                //gridPanel.getView().focusRow(last);
                                            //}, 100);
                                        //} else {
                                            this.addLayers(newRecords, undefined, true);
                                        //}
                                    },
                                    scope: this
                                });
                                if (this.outputTarget) {
                                    panel.hide();
                                } else {
                                    win.close();
                                }

                                });

                            },
                            scope: this
                        }
                    }, uploadConfig));
                    
                    var win = new Ext.Window({
                        title: this.uploadText,
                        modal: true,
                        resizable: false,
                        items: [panel]
                    });
                    win.show();
                },
                scope: this
            });
            
            var urlCache = {};
            function getStatus(url, callback, scope) {
                if (url in urlCache) {
                    // always call callback after returning
                    window.setTimeout(function() {
                        callback.call(scope, urlCache[url]);
                    }, 0);
                } else {
                    Ext.Ajax.request({
                        url: url,
                        disableCaching: false,
                        callback: function(options, success, response) {
                            var status = response.status;
                            urlCache[url] = status;
                            callback.call(scope, status);
                        }
                    });
                }
            }
            
            //this.on({
                //sourceselected: function(tool, source) {
                    //button.hide();
                    //var show = false;
                    //if (this.isEligibleForUpload(source)) {
                        //// only works with GeoServer
                        //// if url is http://example.com/geoserver/ows, we
                        //// want http://example.com/geoserver/rest.
                        //var parts = source.url.split("/");
                        //parts.pop();
                        //parts.push("rest");
                        //// this sets the url for the layer upload panel
                        //url = parts.join("/");
                        //if (this.target.isAuthorized()) {
                            //// determine availability of upload functionality based
                            //// on a 405 for GET
                            //getStatus(url + "/upload", function(status) {
                                //button.setVisible(status === 405);
                            //}, this);
                        //}
                    //}
                //},
                //scope: this
            //});
        }
        return button;
    },

    //ADDED from 354723574e
    /** private: method[addLayers]
     *  :arg records: ``Array`` the layer records to add
     *  :arg source: :class:`gxp.plugins.LayerSource` The source to add from
     *  :arg isUpload: ``Boolean`` Do the layers to add come from an upload?
     */
    addLayers: function(records, source, isUpload) {
        source = source || this.selectedSource;
        var layerStore = this.target.mapPanel.layers,
            extent, record, layer;
        for (var i=0, ii=records.length; i<ii; ++i) {
            record = source.createLayerRecord({
                name: records[i].get("name"),
                source: source.id
            });
            if (record) {
                layer = record.getLayer();
                if (layer.maxExtent) {
                    if (!extent) {
                        extent = record.getLayer().maxExtent.clone();
                    } else {
                        extent.extend(record.getLayer().maxExtent);
                    }
                }
                if (record.get("group") === "background") {
                    layerStore.insert(0, [record]);
                } else {
                    layerStore.add([record]);
                }
            }
        }
        if (extent) {
            this.target.mapPanel.map.zoomToExtent(extent);
        }
        if (isUpload && this.postUploadAction && records.length === 1 && record) {
            // show LayerProperties dialog if just one layer was added
            this.target.selectLayer(record);
            var outputConfig,
                actionPlugin = this.postUploadAction;
            if (!Ext.isString(actionPlugin)) {
                outputConfig = actionPlugin.outputConfig;
                actionPlugin = actionPlugin.plugin;
            }
            this.target.tools[actionPlugin].addOutput(outputConfig);
        }
    },
    
    /** private: method[isEligibleForUpload]
     *  :arg source: :class:`gxp.plugins.LayerSource`
     *  :returns: ``Boolean``
     *
     *  Determine if the provided source is eligible for upload given the tool
     *  config.
     */
    isEligibleForUpload: function(source) {
        return (
            source.url &&
            (this.relativeUploadOnly ? (source.url.charAt(0) === "/") : true) &&
            (this.nonUploadSources || []).indexOf(source.id) === -1
        );
    },
    
    /** api: config[createExpander]
     *  ``Function`` Returns an ``Ext.grid.RowExpander``. Can be overridden
     *  by applications/subclasses to provide a custom expander.
     */
    createExpander: function() {
        return new Ext.grid.RowExpander({
            tpl: new Ext.Template(this.expanderTemplateText)
        });
    }

});

Ext.preg(gxp.plugins.AddLayers.prototype.ptype, gxp.plugins.AddLayers);
