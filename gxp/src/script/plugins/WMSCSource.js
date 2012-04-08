(function() {
  Ext.apply(gxp.plugins.WMSCSource.prototype, {

    //OVERRIDED reprojection used
    /** api: method[createLayerRecord]
     *  :arg config:  ``Object``  The application config for this layer.
     *  :returns: ``GeoExt.data.LayerRecord``
     *
     *  Create a layer record given the config.
     */
    createLayerRecord: function(config) {
        var original = gxp.plugins.WMSCSource.superclass.createLayerRecord.apply(this, arguments);
        var record = original
        var caps = this.store.reader.raw.capability;
        //console.log(caps)
        var tileSets = (caps && caps.vendorSpecific && caps.vendorSpecific) ? 
            caps.vendorSpecific.tileSets : null;
        if (tileSets !== null) {

            // add additional fields
            var fields = [
                {name: "resolutions" }, //Array
                {name: "minResolution" }, //Array
                {name: "maxResolution" }, //Array
                {name: "wgsMaxExtentArray" } //Array
            ];

            original.fields.each(function(field) {
                fields.push(field);
            });

            var resolutions = {}, minResolution = {}, maxResolution = {}, wgsMaxExtentArray = null

            for (var i=0, len=caps.layers.length; i<len; i++) {
                var layer = caps.layers[i];
                if( ( config.name == layer.name ) && layer.bbox["EPSG:4326"] ){
                  wgsMaxExtentArray = layer.bbox["EPSG:4326"].bbox
                }
            }

            for (var i=0, len=tileSets.length; i<len; i++) {
                var tileSet = tileSets[i];
                if( config.name == tileSet.layers ){
                  var srs
                  for( var k in tileSet.srs) srs = k
                  resolutions[srs] = tileSet.resolutions
                  minResolution[srs] = tileSet.resolutions[0]
                  maxResolution[srs] = tileSet.resolutions[tileSet.resolutions.length-1]
                  //maxExtent[srs] = new OpenLayers.Bounds.fromArray( tileSet.bbox[srs].bbox )
                  if(!wgsMaxExtentArray && srs == "EPSG:4326" && tileSet.bbox["EPSG:4326"]) wgsMaxExtentArray = tileSet.bbox["EPSG:4326"].bbox
                }
            }

            var data = Ext.applyIf({
                resolutions: resolutions,
                minResolution: minResolution,
                maxResolution: maxResolution,
                wgsMaxExtentArray: wgsMaxExtentArray
            }, original.data);

            var layer = original.get("layer");

            var Record = GeoExt.data.LayerRecord.create(fields);
            record = new Record(data, layer.id);

            var mapProjection = this.getMapProjection();
            // look for tileset with same name and equivalent projection
            for (var i=0, len=tileSets.length; i<len; i++) {
                var tileSet = tileSets[i];
                if (tileSet.layers === layer.params.LAYERS) {
                    var tileProjection;
                    for (var srs in tileSet.srs) {
                        tileProjection = new OpenLayers.Projection(srs);
                        break;
                    }
                    if (mapProjection.equals(tileProjection)) {
                        var bbox = tileSet.bbox[srs].bbox;
                        layer.projection = tileProjection;
                        layer.addOptions({
                            //resolutions: tileSet.resolutions,
                            tileSize: new OpenLayers.Size(tileSet.width, tileSet.height),
                            tileOrigin: new OpenLayers.LonLat(bbox[0], bbox[1])
                        });
                        // unless explicitly configured otherwise, use cached version
                        layer.params.TILED = (config.cached !== false) && true;
                        break;
                    }
                }
            }
        }
        return record;
    }

  })
})();
