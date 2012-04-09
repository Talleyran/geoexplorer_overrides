/*jshint  strict: false, undef: true, strict: true, white: false, asi: true, laxcomma: true */
( function() {

  Ext.apply(gxp.WMSLayerPanel.prototype, {

    getFeatureInfoPanelFieldNameHeader: 'Name',
    getFeatureInfoPanelFieldTranslateHeader: 'Translate',
    getFeatureInfoPanelFieldShowHeader: 'Show',
    getFeatureInfoPanelFieldStatisticWindowTitle: 'Statistic',
    getFeatureInfoPanelFieldStatisticHeader: 'Statistic',
    wpsLiterals: {
      Count: 'Count',
      Average: 'Average',
      Max: 'Max',
      Median: 'Median',
      Min: 'Min',
      StandardDeviation: 'StdDev',
      Sum: 'Sum'
    },

    statisticNotAvailableText: 'Statistic not available',

    //OVERRIDED Panels added
    initComponent: function() {

        this.addEvents(
            /** api: event[change]
             *  Fires when the ``layerRecord`` is changed using this dialog.
             */
            "change"
        );
        this.items = [
            this.createAboutPanel(),
            this.createDisplayPanel()
        ];

        // only add the Cache panel if we know for sure the WMS is GeoServer
        // which has been integrated with GWC.
        if (this.layerRecord.get("layer").params.TILED !== null) {
            this.items.push(this.createCachePanel());
        }

        this.items.push( this.createGetFeatureInfoFieldsPanel() )
        
        // only add the Styles panel if we know for sure that we have styles
        if (this.styling && gxp.WMSStylesDialog && this.layerRecord.get("styles")) {
            // TODO: revisit this
            var url = this.layerRecord.get("restUrl");
            if (!url) {
                url = (this.source || this.layerRecord.get("layer")).url.split(
                    "?").shift().replace(/\/(wms|ows)\/?$/, "/rest");
            }
            if (this.sameOriginStyling) {
                // this could be made more robust
                // for now, only style for sources with relative url
                this.editableStyles = url.charAt(0) === "/";
            } else {
                this.editableStyles = true;
            }
            this.items.push(this.createStylesPanel(url));
        }

        gxp.WMSLayerPanel.superclass.initComponent.call(this);
    },

    //OVERRIDED Some components added on panel
    /** private: createDisplayPanel
     *  Creates the display panel.
     */
    createDisplayPanel: function(){
    var record = this.layerRecord;
    var layer = record.getLayer();
    var opacity = layer.opacity;
    if(opacity === null) {
      opacity = 1;
    }
    var formats = [];
    var currentFormat = layer.params.FORMAT.toLowerCase();
    Ext.each(record.get("formats"), function(format) {
      if(this.imageFormats.test(format)) {
        formats.push(format.toLowerCase());
      }
    }, this);
    if(formats.indexOf(currentFormat) === -1) {
      formats.push(currentFormat);
    }
    var transparent = layer.params.TRANSPARENT;
    transparent = (transparent === "true" || transparent === true);

    var singleTile = layer.singleTile;

    return {
      title: this.displayText,
      style: {"padding": "10px"},
      layout: "form",
      labelWidth: 100,
      items: [{
        xtype: "slider",
        name: "opacity",
        fieldLabel: this.opacityText,
        value: opacity * 100,
        //TODO remove the line below when switching to Ext 3.2 final
        values: [opacity * 100],
        anchor: "99%",
        isFormField: true,
        listeners: {
          change: function(slider, value) {
            //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            if (layer.CLASS_NAME !== 'OpenLayers.Layer.Vector')
              layer.setOpacity(value / 100);
  //					else
  //						layer.params['OPACITY'] = (value / 100);
            //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            this.fireEvent("change");
          },
          scope: this
        }
      }, {
        xtype: "combo",
        fieldLabel: this.formatText,
        store: formats,
        value: currentFormat,
        mode: "local",
        triggerAction: "all",
        editable: false,
        anchor: "99%",
        listeners: {
          select: function(combo) {
            var format = combo.getValue();
            //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            if (layer.CLASS_NAME !== 'OpenLayers.Layer.Vector')
            {
              layer.mergeNewParams({
                format: format
              });
            }
            //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            if (format == "image/jpeg") {
              this.transparent = Ext.getCmp('transparent').getValue();
                          Ext.getCmp('transparent').setValue(false);
            } else if (this.transparent !== null) {
              Ext.getCmp('transparent').setValue(this.transparent);
              this.transparent = null;
            }
            Ext.getCmp('transparent').setDisabled(format == "image/jpeg");
            this.fireEvent("change");
          },
          scope: this
        }
      }, {
        xtype: "checkbox",
        id: 'transparent',
        fieldLabel: this.transparentText,
        checked: transparent,
        listeners: {
          check: function(checkbox, checked) {
            //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            if (layer.CLASS_NAME !== 'OpenLayers.Layer.Vector')
            {
              layer.mergeNewParams({
                transparent: checked ? "true" : "false"
              });
              this.fireEvent("change");
            }
            //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
          },
                  scope: this
        }
      }, {
        xtype: "checkbox",
        id: 'singleTile',
        fieldLabel: this.singleTileText,
        checked: !singleTile,
        listeners: {
            check: function(checkbox, checked) {
                layer.addOptions({
                    singleTile: !checked
                });
                record.set('singleTile', !checked);
                layer.setTileSize(new OpenLayers.Size(256,256));
                if (layer.grid[0]) layer.grid[0][0].size = layer.tileSize;
                layer.redraw();
                this.fireEvent("change");
            },
            scope: this
          }
        } ]
      };
    },

    //ADDED
    /** private: createGetFeatureInfoFieldsPanel
     *  Creates the GetFeatureInfo panel.
     */
    createGetFeatureInfoFieldsPanel: function() {

        this.fieldsStore = new Ext.data.ArrayStore({
          fields: [
            {name: 'name', type: 'string'},
            {name: 'translate', type: 'string'},
            {name: 'show', type: 'boolean'}
          ]
        });

        if(this.featureManager.gettingScemaInProcess){
          this.featureManager.on('layerchange', this.setFields, this, {single: true});
        }else{
          this.setFields();
        }

        var _this = this;

        var cm = new Ext.grid.ColumnModel({
          // specify any defaults for each column
          defaults: {
              sortable: true // columns are not sortable by default
          },
          columns: [{
              id: 'name',
              header: this.getFeatureInfoPanelFieldNameHeader,
              dataIndex: 'name',
              width: 90
          }, {
              header: this.getFeatureInfoPanelFieldTranslateHeader,
              dataIndex: 'translate',
              width: 110
          }, {
              xtype: 'checkcolumn',
              header: this.getFeatureInfoPanelFieldShowHeader,
              dataIndex: 'show',
              width: 80,
              listeners: {
                scope: this,
                check: function(v, record, store){
                  record.modified.show = v;
                  record.reject();

                  var queryableFields = [];
                  store.each(function(el) {
                      if(el.get('show')){
                        queryableFields.push(el.get('name'));
                      }
                    }
                  );
                  this.layerRecord.set('queryableFields',queryableFields);
                }
              }
          }, {
              xtype: 'buttoncolumn',
              header: this.getFeatureInfoPanelFieldStatisticHeader,
              dataIndex: 'statistic',
              width: 70,
              align: 'center',
              handler: function(e){

                var url = _this.featureManager.target.layerSources[ _this.layerRecord.get('source') ].url;

                OpenLayers.Request.POST({
                    url: url,
                    data: '<?xml version="1.0" encoding="UTF-8"?>' +
                    '<wps:Execute version="1.0.0" service="WPS" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.opengis.net/wps/1.0.0" xmlns:wfs="http://www.opengis.net/wfs" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:gml="http://www.opengis.net/gml" xmlns:ogc="http://www.opengis.net/ogc" xmlns:wcs="http://www.opengis.net/wcs/1.1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsAll.xsd">' +
                    '<ows:Identifier>gs:Aggregate</ows:Identifier>' +
                    '<wps:DataInputs>' +
                    '<wps:Input>' +
                    '<ows:Identifier>features</ows:Identifier>' +
                    '<wps:Reference mimeType="text/xml; subtype=wfs-collection/1.0" xlink:href="http://geoserver/wfs" method="POST">' +
                    '<wps:Body>' +
                    '<wfs:GetFeature service="WFS" version="1.0.0" outputFormat="GML2">' +
                    '<wfs:Query typeName="' + _this.layerRecord.get('name') + '"/>' +
                    '</wfs:GetFeature>' +
                    '</wps:Body>' +
                    '</wps:Reference>' +
                    '</wps:Input>' +
                    '<wps:Input>' +
                    '<ows:Identifier>aggregationAttribute</ows:Identifier>' +
                    '<wps:Data>' +
                    '<wps:LiteralData>' + e.record.json[0] + '</wps:LiteralData>' +
                    '</wps:Data>' +
                    '</wps:Input>' +

                    '<wps:Input>' +
                    '<ows:Identifier>function</ows:Identifier>' +
                    '<wps:Data>' +
                    '<wps:LiteralData>Count</wps:LiteralData>' +
                    '</wps:Data>' +
                    '</wps:Input>' +

                    '<wps:Input>' +
                    '<ows:Identifier>function</ows:Identifier>' +
                    '<wps:Data>' +
                    '<wps:LiteralData>Average</wps:LiteralData>' +
                    '</wps:Data>' +
                    '</wps:Input>' +

                    '<wps:Input>' +
                    '<ows:Identifier>function</ows:Identifier>' +
                    '<wps:Data>' +
                    '<wps:LiteralData>Max</wps:LiteralData>' +
                    '</wps:Data>' +
                    '</wps:Input>' +

                    '<wps:Input>' +
                    '<ows:Identifier>function</ows:Identifier>' +
                    '<wps:Data>' +
                    '<wps:LiteralData>Median</wps:LiteralData>' +
                    '</wps:Data>' +
                    '</wps:Input>' +

                    '<wps:Input>' +
                    '<ows:Identifier>function</ows:Identifier>' +
                    '<wps:Data>' +
                    '<wps:LiteralData>Min</wps:LiteralData>' +
                    '</wps:Data>' +
                    '</wps:Input>' +

                    '<wps:Input>' +
                    '<ows:Identifier>function</ows:Identifier>' +
                    '<wps:Data>' +
                    '<wps:LiteralData>StdDev</wps:LiteralData>' +
                    '</wps:Data>' +
                    '</wps:Input>' +

                    '<wps:Input>' +
                    '<ows:Identifier>function</ows:Identifier>' +
                    '<wps:Data>' +
                    '<wps:LiteralData>Sum</wps:LiteralData>' +
                    '</wps:Data>' +
                    '</wps:Input>' +

                    '<wps:Input>' +
                    '<ows:Identifier>singlePass</ows:Identifier>' +
                    '<wps:Data>' +
                    '<wps:LiteralData>false</wps:LiteralData>' +
                    '</wps:Data>' +
                    '</wps:Input>' +
                    '</wps:DataInputs>' +
                    '<wps:ResponseForm>' +
                    '<wps:RawDataOutput mimeType="text/xml">' +
                    '<ows:Identifier>result</ows:Identifier>' +
                    '</wps:RawDataOutput>' +
                    '</wps:ResponseForm>' +
                    '</wps:Execute>'
                    ,headers: {
                      "Content-Type": "text/xml; subtype=gml/3.1.1"
                    },
                    callback: function(request){
                      if(request.status == 200){

                        if(request.responseXML.firstChild.nodeName == 'AggregationResults'){
                          var t = '';
                          var responseArr = request.responseXML.firstChild.childNodes;
                          for(var i = 0, len = responseArr.length; i<len; i++){
                            t += _this.wpsLiterals[ responseArr[i].nodeName ] + ': ' + responseArr[i].firstChild.data + '<br/>';
                          }

                          Ext.MessageBox.show({
                            title : _this.getFeatureInfoPanelFieldStatisticWindowTitle,
                            msg : t,
                            buttons: Ext.MessageBox.OK,
                            minWidth: 300
                          });
                        } else {
                          Ext.MessageBox.show({
                            title : _this.getFeatureInfoPanelFieldStatisticWindowTitle,
                            msg : _this.statisticNotAvailableText,
                            buttons: Ext.MessageBox.OK,
                            minWidth: 300
                          });
                        }

                      } else {

                      }
                    },
                    scope: this,
                    proxy: _this.featureManager.target.proxy
                });

              }
          }]
        });

        var grid = new Ext.grid.GridPanel({
          title: this.createGetFeatureInfoFieldsPanelText,
          store: this.fieldsStore,
          enableHdMenu: false,
          cm: cm,
          stripeRows: true,
          height: 250,
          width: 355
        });

        return {
            title: this.getFeatureInfoPanelText,
            layout: "form",
            style: "padding: 10px",
            items: [ 
              {
                  xtype: "checkbox",
                  fieldLabel: this.getFeatureInfoPanelFieldText,
                  checked: (this.layerRecord.get("queryable") === true),
                  listeners: {
                      check: function(checkbox, checked) {
                          var layer = this.layerRecord.set("queryable",checked);
                          this.fireEvent("change");
                          if(checked){
                            grid.enable()
                          } else {
                            grid.disable()
                          }
                      },
                      render: function(e){
                        if(e.checked){
                          grid.enable()
                        } else {
                          grid.disable()
                        }
                      },
                      scope: this
                  }
              },
              grid
            ]
        };
    },

    //ADDED
    setFields:function(){
      var fieldsDataArray=[]
        ,fields=[]
        ,upcasedFields=[] // X_X

      if(this.featureManager.schema) {

        this.featureManager.schema.each(function(field){
          fields.push(field.get('name'))
          upcasedFields.push(field.get('name').toUpperCase())
        })
        var translatedFieldNames = Gispro.Utils.translateSymbols("field",upcasedFields)

        for(var i=0,len=fields.length;i<len;i++){
          var field=fields[i]
            ,upcasedField = upcasedFields[i]

          ,fieldName=translatedFieldNames[upcasedField]
          ,show=this.layerRecord.get('queryableFields')?this.layerRecord.get('queryableFields').indexOf(field)!=-1:true

          fieldsDataArray.push([field,fieldName,show])
        }

      }

      this.fieldsStore.loadData(fieldsDataArray)
    }


  })

} )();
