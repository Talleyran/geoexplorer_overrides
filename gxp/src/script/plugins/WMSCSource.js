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
        if(!original) return;
        var record = original;
        var caps = this.store.reader.raw.capability;
        //console.log(caps)
        var tileSets = (caps && caps.vendorSpecific && caps.vendorSpecific) ? 
            caps.vendorSpecific.tileSets : null;
        if (tileSets !== null) {

            var resolutions = {}, minResolution = {}, maxResolution = {},
            layer = original.get("layer"),
            mapProjection = this.getMapProjection();

            for (var i=0; i<tileSets.length; i++) {
                var tileSet = tileSets[i];

                if( config.name == tileSet.layers && tileSet.srs ){
                  var srs;
                  for( var k in tileSet.srs) srs = k;
                  resolutions[srs] = tileSet.resolutions;
                  minResolution[srs] = tileSet.resolutions[0];
                  maxResolution[srs] = tileSet.resolutions[tileSet.resolutions.length-1];

                  var tileProjection = new OpenLayers.Projection(srs),
                  bbox = tileSet.bbox[srs].bbox;

                  if (mapProjection.equals(tileProjection) && !this.viewMangerUsed) {
                    layer.addOptions({
                      resolutions: tileSet.resolutions,
                      tileSize: new OpenLayers.Size(tileSet.width, tileSet.height),
                      tileOrigin: new OpenLayers.LonLat(bbox[0], bbox[1])
                    });
                  }

                }

            }
            layer.params.TILED = (config.cached !== false) && true;

            // add additional fields
            var fields = [
                {name: "resolutions" }, //Array
                {name: "minResolution" }, //Array
                {name: "maxResolution" } //Array
            ];
            original.fields.each(function(field) {
                fields.push(field);
            });
            var data = Ext.applyIf({
                resolutions: resolutions,
                minResolution: minResolution,
                maxResolution: maxResolution
            }, original.data);
            var Record = GeoExt.data.LayerRecord.create(fields);
            record = new Record(data, layer.id);
        }

        return record;
    }

  });
})();
