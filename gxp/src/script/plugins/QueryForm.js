(function() {
  Ext.apply(gxp.plugins.QueryForm.prototype, {

    geometryText: "Geometry type",
    drawPointText: "Point",
    drawLineText: "Line",
    drawPolygonText: "Polygon",
    cleanGeomText: "Clean geom",
    stopQuery: "Stop query",
    loadFileQueryTimout: 300000,
    downloadableFormats: [],
    defaultDownloadFormat: 'SHAPE-ZIP',
    downloadText: 'Download',

    clearLayers: function()
      {
        for(var key in this.drawLayers) {
          this.drawControls[key].deactivate();
          for(var i=0,len=this.drawLayers[key].features.length; i<len; i++){
            this.drawLayers[key].features[0].destroy();
            this.drawLayers[key].setVisibility(false);
          }
        }
      },

    selectLayer: function(v)
      {
        this.clearLayers();
        if(v != 'box'){
          this.drawControls[v].activate();
          var map = this.drawLayers[v].map;
          map.setLayerIndex(this.drawLayers[v], map.layers.length);
          this.drawLayers[v].setVisibility(true);
        }
      },

    /** api: method[addActions]
     */
    addActions: function(actions) {

        var _this = this;
        this.drawLayers = {
          Point: new OpenLayers.Layer.Vector("Point Layer", { displayInLayerSwitcher: false }),
          Path: new OpenLayers.Layer.Vector("Line Layer", { displayInLayerSwitcher: false }),
          Polygon: new OpenLayers.Layer.Vector("Polygon Layer", { displayInLayerSwitcher: false })
        };

        this.drawControls = {};

        for(var key in this.drawLayers) {
          this.drawControls[key] = new OpenLayers.Control.DrawFeature(this.drawLayers[key], OpenLayers.Handler[key]);
          this.target.mapPanel.map.addControl(this.drawControls[key]);
          this.target.mapPanel.map.addLayer(this.drawLayers[key]);
          this.drawLayers[key].setVisibility(false);
        }

        actions = [{
            text: this.queryActionText,
            menuText: this.queryMenuText,
            iconCls: "gxp-icon-find",
            tooltip: this.queryActionTip,
            disabled: true
        }];


        gxp.plugins.QueryForm.superclass.addActions.apply(this, [ actions ]);
        // support custom actions
        if (this.actions) {
            this.target.tools[this.featureManager].on("layerchange", function(mgr, rec, schema) {
                for (var i=this.actions.length-1; i>=0; --i) {
                    this.actions[i].setDisabled(!schema);
                }
            }, this);
        }


    },

    createIframe: function(id, root){
      var el = document.createElement('iframe');
      el.setAttribute('id',id);
      el.setAttribute('name',id);
      if(root) root.appendChild(el);
      return el;
    },

    createForm: function(url, postData, target, root){
      var el = document.createElement('form');
      el.setAttribute('method', 'post');
      el.setAttribute('target', target);
      el.setAttribute('action', url);


      for(var k in postData){
        var input = document.createElement('input');
        input.setAttribute('id',k);
        input.setAttribute('name',k);
        input.setAttribute('type','hidden');
        input.setAttribute('value',postData[k]);
        el.appendChild(input);
      }

      if(root) root.appendChild(el);
      return el;
    },

    loadFile: function(url, postData){
      var id = 'queryFormIframe';
      var form = this.createForm( url, postData, id, document.body );
      var iframe = this.createIframe( id, document.body );
      var removeElements = function(){
        document.body.removeChild(iframe);
        document.body.removeChild(form);
      };
      setTimeout(removeElements, this.loadFileQueryTimout);
      form.submit();
      form.removeAttribute('id');
      form.removeAttribute('name');
      iframe.removeAttribute('id');
      iframe.removeAttribute('name');
    },

    downloadFormatsMenuItemHandler: function(menuItem){
      this.downloadFormat( menuItem.v );
    },

    downloadFormatsSplitBottonHandler: function(){
      this.downloadFormat( this.downloadableFormats.indexOf(this.defaultDownloadFormat) !== -1 ? this.defaultDownloadFormat : this.downloadableFormats[0] );
    },

    downloadFormat: function(format){

      var featureManager = this.target.tools[this.featureManager];

      var filters = [];

      if (this.queryForm.spatialFieldset.collapsed !== true) {

          var t,v,input;
          input = this.queryForm.geom.getValue().inputValue;
          if(input == 'box'){
            t = OpenLayers.Filter.Spatial.BBOX;
            v = this.target.mapPanel.map.getExtent();
          } else {
            t = OpenLayers.Filter.Spatial.INTERSECTS;

            if(input == 'Point') v = new OpenLayers.Geometry.MultiPoint();
            if(input == 'Path') v = new OpenLayers.Geometry.MultiLineString();
            if(input == 'Polygon') v = new OpenLayers.Geometry.MultiPolygon();

            for(var i=0, len=this.drawLayers[input].features.length; i<len; i++){
              v.addComponent(this.drawLayers[input].features[i].geometry);
            }

          }

          filters.push(new OpenLayers.Filter.Spatial({
              type: t,
              property: featureManager.featureStore.geometryName,
              value: v
          }));

      }

      if (this.queryForm.attributeFieldset.collapsed !== true) {
          var attributeFilter = this.queryForm.filterBuilder.getFilter();
          attributeFilter && filters.push(attributeFilter);
      }

      var newOptions = {},
        props = [ 'featureNS' ,'featureType' ,'geometryName' ,'multi' ,'outputFormat' ,'params' ,'schema' ,'srsName' ,'url' ,'version' ],
        protocol = featureManager.featureStore.proxy.protocol;

      for(var i=0; i < props.length; i++){
        newOptions[props[i]] = protocol.options[props[i]];
      }

      var urlArr = this.target.layerSources[featureManager.layerRecord.get("source")].restUrl.split('/');
      urlArr = urlArr.splice(0, urlArr.length - 1);
      urlArr.push('TestWfsPost');
      var testWfsUrl = this.target.downloadFilePageUrl

      var getFeatureUrlArr = newOptions.url.split('/');
      getFeatureUrlArr = getFeatureUrlArr.splice(0, getFeatureUrlArr.length - 1);
      getFeatureUrlArr.push('GetFeature');
      var getFeatureUrl = getFeatureUrlArr.join('/');

      newOptions.outputFormat = format;

      newOptions.filter = filters.length > 1 ?
          new OpenLayers.Filter.Logical({
              type: OpenLayers.Filter.Logical.AND,
              filters: filters
          }) : filters[0];

      newOptions.params = {};

      var data = OpenLayers.Format.XML.prototype.write.apply(
          protocol.format, [protocol.format.writeNode("wfs:GetFeature", newOptions)]
      );

      //console.log(data)
      this.loadFile(testWfsUrl,{
          body: data,
          url: getFeatureUrl
        }
      );
      //OpenLayers.Request.POST( {
          //url: newOptions.url,
          //params: newOptions.params,
          //headers: newOptions.headers,
          //data: data,
          //proxy: this.target.proxy
      //} );

    },

    /** api: method[addOutput]
     */
    addOutput: function(config) {
        var featureManager = this.target.tools[this.featureManager];
        var url = featureManager.featureStore.proxy.protocol.url
        var getCapabilitiesUrlArr = url.split('/');
        getCapabilitiesUrlArr = getCapabilitiesUrlArr.splice(0, getCapabilitiesUrlArr.length - 1);
        getCapabilitiesUrlArr[getCapabilitiesUrlArr.length - 1] = 'wfs?request=getCapabilities'
        var getCapabilitiesUrl = getCapabilitiesUrlArr.join('/');

        OpenLayers.Request.GET({
          url: getCapabilitiesUrl,
          callback: function(request){

            if(request.status == 200){

              var nodes = request.responseXML.firstChild.childNodes
              for(var i=0; i<nodes.length; i++){
                if( nodes[i].nodeName == "ows:OperationsMetadata"){
                  var operationsMetadataNode = nodes[i]
                  for(var j=0; j<operationsMetadataNode.childNodes.length; j++){
                    if( operationsMetadataNode.childNodes[j].nodeName == 'ows:Operation' && operationsMetadataNode.childNodes[j].attributes.name && operationsMetadataNode.childNodes[j].attributes.name.value == 'GetFeature' ){
                      var getFeatureNode = operationsMetadataNode.childNodes[j]
                      for(var k=0; k<getFeatureNode.childNodes.length; k++){
                        if( getFeatureNode.childNodes[k].nodeName == 'ows:Parameter' && getFeatureNode.childNodes[k].attributes.name && getFeatureNode.childNodes[k].attributes.name.value == 'outputFormat' ){

                          var outputFormatNode = getFeatureNode.childNodes[k]

                          var menuItems = []

                          for(var m=0; m<outputFormatNode.childNodes.length; m++){
                            menuItems.push( { 
                              text: outputFormatNode.childNodes[m].textContent, v: outputFormatNode.childNodes[m].textContent,
                              handler: this.downloadFormatsMenuItemHandler,
                              scope: this
                            } )
                            this.downloadableFormats.push(outputFormatNode.childNodes[m].textContent)
                          }

                          Ext.getCmp('downloadButton').menu = new Ext.menu.Menu({ items: menuItems })

                        }
                      }
                    }
                  }
                }
              }

            }else{


            }

          },
          scope: this,
          proxy: this.target.proxy
        })



        config = Ext.apply({
            border: false,
            bodyStyle: "padding: 10px",
            layout: "form",
            autoScroll: true,
            items: [{
                xtype: "fieldset",
                ref: "spatialFieldset",
                title: this.queryByLocationText,
                checkboxToggle: true,
                items: [
                  {
                    xtype: 'radiogroup',

                    ref: "../geom",

                    id: 'fff',
                    fieldLabel: this.geometryText,
                    itemCls: 'x-check-group-alt',
                    columns: 1,

                        items: [
                          {boxLabel: this.currentTextText, name: 'rb-col', inputValue: 'box', checked: true},
                          {boxLabel: this.drawPointText, name: 'rb-col', inputValue: 'Point'},
                          {boxLabel: this.drawLineText, name: 'rb-col', inputValue: 'Path'},
                          {boxLabel: this.drawPolygonText, name: 'rb-col', inputValue: 'Polygon'}
                        ],

                        listeners: {
                          change: function(radiogroup, radio) {
                            this.selectLayer(radio.inputValue);
                          },
                          scope: this
                        }

                  }
                  //, {
                    //xtype: "textfield",
                    //ref: "../extent",
                    //anchor: "100%",
                    //fieldLabel: this.currentTextText,
                    //value: this.getFormattedMapExtent(),
                    //readOnly: true
                  //}
                ]
            }, {
                xtype: "fieldset",
                ref: "attributeFieldset",
                title: this.queryByAttributesText,
                checkboxToggle: true
            }],
            bbar: [
            "->",
            {
                text: this.cleanGeomText,
                iconCls: "delete",
                handler: function() {
                  this.selectLayer( this.queryForm.geom.getValue().inputValue );
                },
                scope: this
            },
            {
                text: this.cancelButtonText,
                iconCls: "cancel",
                handler: function() {
                    var ownerCt = this.outputTarget ? queryForm.ownerCt :
                        queryForm.ownerCt.ownerCt;
                    if (ownerCt && ownerCt instanceof Ext.Window) {
                        ownerCt.hide();
                    } else {
                        addAttributeFilter(
                            featureManager, featureManager.layerRecord,
                            featureManater.schema
                        );
                    }
                }
            },
            {
                text: this.queryActionText,
                iconCls: "gxp-icon-find",
                handler: function() {

                    var c = Ext.getCmp(this.featureGrid).gridContainer;
                    if(c.hidden) c.show();
                    if(c.collapsed) c.expand();

                    featureManager.on({
                        "query": function(tool, store) {
                            if (store) {
                                if(!this.queryAborted){
                                  store.getCount() || Ext.Msg.show({
                                      title: this.noFeaturesTitle,
                                      msg: this.noFeaturesMessage,
                                      buttons: Ext.Msg.OK,
                                      icon: Ext.Msg.INFO
                                  });
                                  if (this.autoHide) {
                                      var ownerCt = this.outputTarget ? queryForm.ownerCt :
                                          queryForm.ownerCt.ownerCt;
                                      ownerCt instanceof Ext.Window && ownerCt.hide();
                                  }
                                }
                                this.queryAborted = false;
                            }
                        },
                        scope: this,
                        single: true
                    });

                    var filters = [];
                    if (queryForm.spatialFieldset.collapsed !== true) {

                        var t,v,input;
                        input = queryForm.geom.getValue().inputValue;
                        if(input == 'box'){
                          t = OpenLayers.Filter.Spatial.BBOX;
                          v = this.target.mapPanel.map.getExtent();
                        } else {
                          t = OpenLayers.Filter.Spatial.INTERSECTS;

                          if(input == 'Point') v = new OpenLayers.Geometry.MultiPoint();
                          if(input == 'Path') v = new OpenLayers.Geometry.MultiLineString();
                          if(input == 'Polygon') v = new OpenLayers.Geometry.MultiPolygon();

                          for(var i=0, len=this.drawLayers[input].features.length; i<len; i++){
                            v.addComponent(this.drawLayers[input].features[i].geometry);
                          }

                        }

                        filters.push(new OpenLayers.Filter.Spatial({
                            type: t,
                            property: featureManager.featureStore.geometryName,
                            value: v
                        }));

                    }
                    if (queryForm.attributeFieldset.collapsed !== true) {
                        var attributeFilter = queryForm.filterBuilder.getFilter();
                        attributeFilter && filters.push(attributeFilter);
                    }
                    featureManager.loadFeatures(filters.length > 1 ?
                        new OpenLayers.Filter.Logical({
                            type: OpenLayers.Filter.Logical.AND,
                            filters: filters
                        }) :
                        filters[0]
                    );
                },
                scope: this
            },






            //TODO http://docs.sencha.com/ext-js/3-4/#!/api/Ext.SplitButton
            {
                text: this.downloadText,
                iconCls: 'downloadIcon',
                xtype: 'splitbutton',
                id: 'downloadButton',
                handler: this.downloadFormatsSplitBottonHandler,
                scope: this
            }






            ]
        }, config || {});

        if(!this.outputConfig) this.outputConfig = {
              title: this.queryActionText,
              width: 380,
              y: 100,
              listeners: {
                scope: this,
                show: function(){ if(this.queryForm)this.selectLayer(this.queryForm.geom.getValue().inputValue); },
                hide: function(){ this.clearLayers(); }
              }
          };

        var queryForm = gxp.plugins.QueryForm.superclass.addOutput.call(this, config);
        this.queryForm = queryForm;

        var addFilterBuilder = function(mgr, rec, schema) {
            queryForm.attributeFieldset.removeAll();
            queryForm.setDisabled(!schema);
            if (schema) {
                queryForm.attributeFieldset.add({
                    xtype: "gxp_filterbuilder",
                    ref: "../filterBuilder",
                    attributes: schema,
                    allowBlank: true,
                    allowGroups: false
                });
                queryForm.spatialFieldset.expand();
                queryForm.attributeFieldset.expand();
            } else {
                queryForm.attributeFieldset.rendered && queryForm.attributeFieldset.collapse();
                queryForm.spatialFieldset.rendered && queryForm.spatialFieldset.collapse();
            }
            queryForm.attributeFieldset.doLayout();
        };

        featureManager.on("layerchange", addFilterBuilder);
        addFilterBuilder(featureManager,
            featureManager.layerRecord, featureManager.schema
        );

        //this.target.mapPanel.map.events.register("moveend", this, function() {
            //queryForm.extent.setValue(this.getFormattedMapExtent());
        //});
        //
        //
        var createStopQueryButton = function(value, id) {
          new Ext.Button({
            text: value,
            style: {display: 'inline-block'},
            handler : function(){
                this.loadMask.hide();
                featureManager.featureStore.proxy.abortRequest();
                this.queryAborted = true;
             },
            scope: this
          }).render(document.body, id);
        };


        featureManager.on({
            "beforequery": function() {
                this.loadMask = new Ext.LoadMask(queryForm.getEl(), {
                    store: featureManager.featureStore,
                    msg: '<div id="queryFormLoadMaskButton" style="display:none"></div>',
                    removeMask: true
                    //msg: this.queryMsg
                });
                this.loadMask.show();


                createStopQueryButton.defer(1, this, [this.stopQuery, 'queryFormLoadMaskButton']);

            },
            scope: this
        });

        return queryForm;
    }

  });
})();
