/*jshint  strict: false, undef: true, strict: true, white: false, asi: true, laxcomma: true */
( function() {

  Ext.apply(gxp.grid.FeatureGrid.prototype, {

    /** api: method[getColumns]
     *  :arg store: ``GeoExt.data.FeatureStore``
     *  :return: ``Array``
     *  
     *  Gets the configuration for the column model.
     */
    getColumns: function(store) {
        function getRenderer(format) {
            return function(value) {
                //TODO When http://trac.osgeo.org/openlayers/ticket/3131
                // is resolved, change the 5 lines below to
                // return value.format(format);
                var date = value;
                if (typeof value == "string") {
                     date = Date.parseDate(value.replace(/Z$/, ""), "c");
                }
                return date ? date.format(format) : value;
            };
        }
        var columns = [],
            customRenderers = this.customRenderers || {},
            name, header, type, xtype, format, renderer;
        (this.schema || store.fields).each(function(f) {
            if (this.schema) {

                name = f.get("name");
                header = Gispro.Utils.translateSymbols('field',[name.toUpperCase()])[name.toUpperCase()];
                type = f.get("type").split(":").pop();
                format = null;
                switch (type) {
                    case "date":
                        format = this.dateFormat;
                        break;
                    case "datetime":
                        format = format ? format : this.dateFormat + " " + this.timeFormat;
                        xtype = undefined;
                        renderer = getRenderer(format);
                        break;
                    case "boolean":
                        xtype = "booleancolumn";
                        break;
                    case "string":
                        xtype = "gridcolumn";
                        break;
                    default:
                        xtype = "numbercolumn";
                        break;
                }
            } else {
                name = f.name;
            }
            if (this.ignoreFields.indexOf(name) === -1 &&
               (this.includeFields === null || this.includeFields.indexOf(name) >= 0)) {
                columns.push({
                    dataIndex: name,
                    hidden: this.fieldVisibility ?
                        (!this.fieldVisibility[name]) : false,
                    header: header,
                    sortable: true,
                    xtype: xtype,
                    format: format,
                    renderer: customRenderers[name] ||
                        (xtype ? undefined : renderer)
                });
            }
        }, this);
        return columns;
    }

  })

} )();
