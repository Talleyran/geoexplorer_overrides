(function() {
  Ext.apply(gxp.plugins.FeatureManager.prototype, {

    //ADDED (need for getting schema in WMSLayerPanel)
    gettingScemaInProcess: false,

    //OVERRIDED (need for reprojection support)
    /** private: method[init]
     */
    init: function(target) {
        gxp.plugins.FeatureManager.superclass.init.apply(this, arguments);
        this.toolsShowingLayer = {};
        
        this.style = {
            "all": new OpenLayers.Style(null, {
                rules: [new OpenLayers.Rule({
                    symbolizer: this.initialConfig.symbolizer || {
                        "Point": {
                            pointRadius: 4,
                            graphicName: "square",
                            fillColor: "white",
                            fillOpacity: 1,
                            strokeWidth: 1,
                            strokeOpacity: 1,
                            strokeColor: "#333333"
                        },
                        "Line": {
                            strokeWidth: 4,
                            strokeOpacity: 1,
                            strokeColor: "#ff9933"
                        },
                        "Polygon": {
                            strokeWidth: 2,
                            strokeOpacity: 1,
                            strokeColor: "#ff6633",
                            fillColor: "white",
                            fillOpacity: 0.3
                        }
                    }
                })]
            }),
            "selected": new OpenLayers.Style(null, {
                rules: [new OpenLayers.Rule({symbolizer: {display: "none"}})]
            })
        };
        
        this.featureLayer = new OpenLayers.Layer.Vector(this.id, {
            displayInLayerSwitcher: false,
            visibility: false,
            styleMap: new OpenLayers.StyleMap({
                "select": OpenLayers.Util.extend({display: ""},
                    OpenLayers.Feature.Vector.style["select"]),
                "vertex": this.style["all"]
            }, {extendDefault: false})    
        });
        
        this.target.on({
            ready: function() {
                this.target.mapPanel.map.addLayer(this.featureLayer);
            },
            //TODO add featureedit listener; update the store
            scope: this
        });
        this.on({
            //TODO add a beforedestroy event to the tool
            beforedestroy: function() {
                this.target.mapPanel.map.removeLayer(this.featureLayer);
            },
            scope: this
        });
        this.target.mapPanel.on('projectionchanged', function(srsName){
          if(this.hitCountProtocol) this.hitCountProtocol.srsName = srsName
          if(this.featureStore && this.featureStore.proxy ){
            this.featureStore.srsName = srsName
            this.featureStore.proxy.srsName = srsName
            this.featureStore.proxy.protocol.srsName = srsName
            this.featureStore.proxy.protocol.options.srsName = srsName
            this.featureStore.proxy.protocol.format.srsName = srsName
            this.featureStore.proxy.protocol.format.options.srsName = srsName
          }
        }, this)
    },

    //OVERRIDED (need for getting schema in WMSLayerPanel)
    /** private: method[setFeatureStore]
     *  :arg filter: ``OpenLayers.Filter``
     *  :arg autoLoad: ``Boolean``
     */
    setFeatureStore: function(filter, autoLoad) {
        var record = this.layerRecord;
        var source = this.target.getSource(record);
        if (source && source instanceof gxp.plugins.WMSSource) {
            this.gettingScemaInProcess = true //<
            source.getSchema(record, function(schema) {
                if (schema === false) {
                    this.clearFeatureStore();
                } else {
                    var fields = [], geometryName;
                    var geomRegex = /gml:((Multi)?(Point|Line|Polygon|Curve|Surface|Geometry)).*/;
                    var types = {
                        "xsd:boolean": "boolean",
                        "xsd:int": "int",
                        "xsd:integer": "int",
                        "xsd:short": "int",
                        "xsd:long": "int",
                        "xsd:date": "date",
                        "xsd:string": "string",
                        "xsd:float": "float",
                        "xsd:double": "float"
                    };
                    schema.each(function(r) {
                        var match = geomRegex.exec(r.get("type"));
                        if (match) {
                            geometryName = r.get("name");
                            this.geometryType = match[1];
                        } else {
                            // TODO: use (and improve if needed) GeoExt.form.recordToField
                            var type = types[r.get("type")];
                            var field = {
                                name: r.get("name"),
                                type: types[type]
                            };
                            //TODO consider date type handling in OpenLayers.Format
                            if (type == "date") {
                                field.dateFormat = "Y-m-d\\Z";
                            }
                            fields.push(field);
                        }
                    }, this);
                    
                    var protocolOptions = {
                        srsName: this.getProjection(record).getCode(),
                        url: schema.url,
                        featureType: schema.reader.raw.featureTypes[0].typeName,
                        featureNS: schema.reader.raw.targetNamespace,
                        geometryName: geometryName
                    };
                    this.hitCountProtocol = new OpenLayers.Protocol.WFS(Ext.apply({
                        version: "1.1.0",
                        readOptions: {output: "object"},
                        resultType: "hits",
                        filter: filter
                    }, protocolOptions));
                    this.featureStore = new gxp.data.WFSFeatureStore(Ext.apply({
                        fields: fields,
                        proxy: {
                            protocol: {
                                outputFormat: this.format,
                                multi: this.multi
                            }
                        },
                        maxFeatures: this.maxFeatures,
                        layer: this.featureLayer,
                        ogcFilter: filter,
                        autoLoad: autoLoad,
                        autoSave: false,
                        listeners: {
                            "beforewrite": function(store, action, rs, options) {
                                this.fireEvent("beforesave", this, store, options.params);
                            },
                            "write": function(store, action, result, res, rs) {
                                this.redrawMatchingLayers(record);
                            },
                            "load": function(store, rs, options) {
                                this.fireEvent("query", this, store, this.filter);
                            },
                            scope: this
                        }
                    }, protocolOptions));
                }
                this.gettingScemaInProcess = false //<
                this.fireEvent("layerchange", this, record, schema);
            }, this);
        } else {
            this.clearFeatureStore();
            this.fireEvent("layerchange", this, record, false);
        }
    }


  })
})();
