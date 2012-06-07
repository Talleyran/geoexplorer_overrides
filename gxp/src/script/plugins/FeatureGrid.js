(function() {
  Ext.apply(gxp.plugins.FeatureGrid.prototype, {
    
    zoomToFeaturesTip: 'Zoom',

    //OVERRIDED zoom to features botton added
    /** api: method[addOutput]
     */
    addOutput: function(config) {
        var featureManager = this.target.tools[this.featureManager];
        var map = this.target.mapPanel.map, smCfg;
        // a minimal SelectFeature control - used just to provide select and
        // unselect, won't be added to the map unless selectOnMap is true
        this.selectControl = new OpenLayers.Control.SelectFeature(
            featureManager.featureLayer, this.initialConfig.controlOptions
        );
        if (this.selectOnMap) {
             if (featureManager.paging) {
                this.selectControl.events.on({
                    "activate": function() {
                        map.events.register(
                            "click", this, this.noFeatureClick
                        );
                    },
                    "deactivate": function() {
                        map.events.unregister(
                            "click", this, this.noFeatureClick
                        );
                    },
                    scope: this
                });
            }
            map.addControl(this.selectControl);
            smCfg = {
                selectControl: this.selectControl
            };
        } else {
            smCfg = {
                selectControl: this.selectControl,
                singleSelect: false,
                autoActivateControl: false,
                listeners: {
                    "beforerowselect": function() {
                        if(this.selectControl.active || featureManager.featureStore.getModifiedRecords().length) {
                            return false;
                        }
                    },
                    scope: this
                }
            };
        }
        this.displayItem = new Ext.Toolbar.TextItem({});
        config = Ext.apply({
            xtype: "gxp_featuregrid",
            sm: new GeoExt.grid.FeatureSelectionModel(smCfg),
            autoScroll: true,
            bbar: (featureManager.paging ? [{
                iconCls: "x-tbar-page-first",
                ref: "../firstPageButton",
                tooltip: this.firstPageTip,
                disabled: true,
                handler: function() {
                    featureManager.setPage({index: 0});
                }
            }, {
                iconCls: "x-tbar-page-prev",
                ref: "../prevPageButton",
                tooltip: this.previousPageTip,
                disabled: true,
                handler: function() {
                    featureManager.previousPage();
                }
            }, {
                iconCls: "gxp-icon-zoom-to",
                ref: "../zoomToPageButton",
                tooltip: this.zoomPageExtentTip,
                disabled: true,
                hidden: featureManager.autoZoomPage,
                handler: function() {
                    var extent = featureManager.getPageExtent();
                    if (extent !== null) {
                        map.zoomToExtent(extent);
                    }
                }
            }, {
                iconCls: "x-tbar-page-next",
                ref: "../nextPageButton",
                tooltip: this.nextPageTip,
                disabled: true,
                handler: function() {
                    featureManager.nextPage();
                }
            }, {
                iconCls: "x-tbar-page-last",
                ref: "../lastPageButton",
                tooltip: this.lastPageTip,
                disabled: true,
                handler: function() {
                    featureManager.setPage({index: "last"});
                }
            },

            {xtype: 'tbspacer', width: 10}, this.displayItem] : []).concat(["->"].concat(!this.alwaysDisplayOnMap ? [
              //{
                  //iconCls: "gxp-icon-removelayers",
                  //tooltip: 'clear',
                  //handler: function() {
                    //featureManager.clearFeatureStore()
                  //}
              //},
              {
                  iconCls: "gxp-icon-zoom-to",
                  tooltip: this.zoomToFeaturesTip,
                  handler: function() {
                    var e = featureManager.featureLayer.getDataExtent();
                    if(e)featureManager.target.mapPanel.map.zoomToExtent( e );
                  }
              },
              {
                  text: this.displayFeatureText,
                  enableToggle: true,
                  toggleHandler: function(btn, pressed) {
                      this.selectOnMap && this.selectControl[pressed ? "activate" : "deactivate"]();
                      //Gispro.Utils.moveLayerOnTop(this.target.mapPanel.map,featureManager.featureLayer)
                      featureManager[pressed ? "showLayer" : "hideLayer"](this.id, this.displayMode);
                  },
                  scope: this
              }
            ] : [])),
            listeners: {
                "added": function(cmp, ownerCt) {
                    function onClear() {
                        this.displayTotalResults();
                        this.selectOnMap && this.selectControl.deactivate();
                        this.autoCollapse && typeof ownerCt.collapse == "function" &&
                            ownerCt.collapse();
                    }
                    function onPopulate() {
                        this.displayTotalResults();
                        this.selectOnMap && this.selectControl.activate();
                        this.autoExpand && typeof ownerCt.expand == "function" &&
                            ownerCt.expand();
                    }
                    featureManager.on({
                        "query": function(tool, store) {
                            if (store && store.getCount()) {
                                onPopulate.call(this);
                            } else {
                                onClear.call(this);
                            }
                        },
                        "layerchange": onClear,
                        "clearfeatures": onClear,
                        scope: this
                    });
                },
                contextmenu: function(event) {
                    if (featureGrid.contextMenu.items.getCount() > 0) {
                        var rowIndex = featureGrid.getView().findRowIndex(event.getTarget());
                        if (rowIndex !== false) {
                            featureGrid.getSelectionModel().selectRow(rowIndex);
                            featureGrid.contextMenu.showAt(event.getXY());
                            event.stopEvent();
                        }
                    }
                },
                scope: this
            },
            contextMenu: new Ext.menu.Menu({items: []})
        }, config || {});
        var featureGrid = gxp.plugins.FeatureGrid.superclass.addOutput.call(this, config);
        
        if (this.alwaysDisplayOnMap || this.selectOnMap) {
            featureManager.showLayer(this.id, this.displayMode);
        }        
       
        featureManager.paging && featureManager.on({
            "beforesetpage": function() {
                featureGrid.zoomToPageButton.disable();
            },
            "setpage": function(mgr, condition, callback, scope, pageIndex, numPages) {
                var paging = (numPages > 0);
                featureGrid.zoomToPageButton.setDisabled(!paging);
                var prev = (paging && (pageIndex !== 0));
                featureGrid.firstPageButton.setDisabled(!prev);
                featureGrid.prevPageButton.setDisabled(!prev);
                var next = (paging && (pageIndex !== numPages-1));
                featureGrid.lastPageButton.setDisabled(!next);
                featureGrid.nextPageButton.setDisabled(!next);
            },
            scope: this
        });
                
        function onLayerChange() {
            var schema = featureManager.schema,
                ignoreFields = ["feature", "state", "fid"];
            //TODO use schema instead of store to configure the fields
            schema && schema.each(function(r) {
                r.get("type").indexOf("gml:") === 0 && ignoreFields.push(r.get("name"));
            });
            featureGrid.ignoreFields = ignoreFields;
            featureGrid.setStore(featureManager.featureStore, schema);
        }

        if (featureManager.featureStore) {
            onLayerChange.call(this);
        }
        featureManager.on("layerchange", onLayerChange, this);

        return featureGrid;
    }

  });
})();
