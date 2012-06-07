(function() {
  Ext.apply(gxp.plugins.WMSSource.prototype, {

    //OVERRIDED fields added
    /** api: method[createLayerRecord]
     *  :arg config:  ``Object``  The application config for this layer.
     *  :returns: ``GeoExt.data.LayerRecord``
     *
     *  Create a layer record given the config.
     */
    createLayerRecord: function(config) {
        var record;
        var index = this.store.findExact("name", config.name);
        if (index > -1) {
            var original = this.store.getAt(index);

            var layer = original.getLayer();

            /**
             * TODO: The WMSCapabilitiesReader should allow for creation
             * of layers in different SRS.
             */
            var projection = this.getMapProjection();
            
            // If the layer is not available in the map projection, find a
            // compatible projection that equals the map projection. This helps
            // us in dealing with the different EPSG codes for web mercator.
            var layerProjection = this.getProjection(original);

            var projCode = projection.getCode();
            var nativeExtent = original.get("bbox")[projCode];
            var swapAxis = layer.params.VERSION >= "1.3" && !!layer.yx[projCode];
            var maxExtent = 
                (nativeExtent && OpenLayers.Bounds.fromArray(nativeExtent.bbox, swapAxis)) || 
                OpenLayers.Bounds.fromArray(original.get("llbbox")).transform(new OpenLayers.Projection("EPSG:4326"), projection);
            
            // make sure maxExtent is valid (transform does not succeed for all llbbox)
            if (!(1 / maxExtent.getHeight() > 0) || !(1 / maxExtent.getWidth() > 0)) {
                // maxExtent has infinite or non-numeric width or height
                // in this case, the map maxExtent must be specified in the config
                maxExtent = undefined;
            }
            
            // use all params from original
            var params = Ext.applyIf({
                STYLES: config.styles,
                FORMAT: config.format,
                TRANSPARENT: config.transparent
            }, layer.params);

            if(!this.viewMangerUsed){
              layer = new OpenLayers.Layer.WMS(
                  config.title || layer.name, 
                  layer.url, 
                  params, {
                      attribution: layer.attribution,
                      maxExtent: maxExtent,
                      restrictedExtent: maxExtent,
                      ratio: config.ratio || 1,
                      visibility: ("visibility" in config) ? config.visibility : true,
                      opacity: ("opacity" in config) ? config.opacity : 1,
                      buffer: ("buffer" in config) ? config.buffer : 1,
                      projection: layerProjection,
                      singleTile: "singleTile" in config ? config.singleTile : false
                  }
              );
            }else{
              layer = new OpenLayers.Layer.WMS(
                  config.title || layer.name, 
                  layer.url, 
                  params, {
                      attribution: layer.attribution,
                      ratio: config.ratio || 1,
                      visibility: ("visibility" in config) ? config.visibility : true,
                      opacity: ("opacity" in config) ? config.opacity : 1,
                      buffer: ("buffer" in config) ? config.buffer : 1,
                      singleTile: "singleTile" in config ? config.singleTile : false
                  }
              );
            }

            // data for the new record
            var data = Ext.applyIf({
                title: layer.name,
                group: config.group,
                source: config.source,
                properties: "gxp_wmslayerpanel",
                fixed: config.fixed,
                selected: "selected" in config ? config.selected : false,
                layer: layer,
                restUrl: this.restUrl,
                queryableFields: "queryableFields" in config ? config.queryableFields : null,
                queryable: "queryable" in config ? config.queryable : original.get('queryable'),
                singleTile: layer.singleTile,
                supportedProjections: []
            }, original.data);

            // add additional fields
            var fields = [
                {name: "source", type: "string"}, 
                {name: "group", type: "string"},
                {name: "properties", type: "string"},
                {name: "fixed", type: "boolean"},
                {name: "selected", type: "boolean"},
                {name: "queryableFields"}, //Array
                {name: "singleTile"}, //Boolean
                {name: "supportedProjections"} //Array

            ];
            original.fields.each(function(field) {
                fields.push(field);
            });

            var Record = GeoExt.data.LayerRecord.create(fields);
            record = new Record(data, layer.id);

        }

        return record;
    },

    //OVERRIDED fields added
    /** api: method[getConfigForRecord]
     *  :arg record: :class:`GeoExt.data.LayerRecord`
     *  :returns: ``Object``
     *
     *  Create a config object that can be used to recreate the given record.
     */
    getConfigForRecord: function(record) {
        var config = gxp.plugins.WMSSource.superclass.getConfigForRecord.apply(this, arguments);
        var layer = record.getLayer();
        var params = layer.params;
        return Ext.apply(config, {
            format: params.FORMAT,
            styles: params.STYLES,
            transparent: params.TRANSPARENT,
            queryable: record.get('queryable'),
            queryableFields: record.get('queryableFields'),
            singleTile: record.get('singleTile')
        });
    }

  });

})();
