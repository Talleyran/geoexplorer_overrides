(function() {

  Ext.apply(gxp.plugins.LayerProperties.prototype, {

    //OVERRIDED featureManager added (for WMSLayerPanel)
    addOutput: function(config) {
        //additional output setting
        this.outputConfig.width = 420;

        config = config || {};
        var record = this.target.selectedLayer;
        var origCfg = this.initialConfig.outputConfig || {};
        this.outputConfig.title = origCfg.title ||
            this.menuText + ": " + record.get("title");
        
        //TODO create generic gxp_layerpanel
        var xtype = record.get("properties") || "gxp_layerpanel";
        var panelConfig = this.layerPanelConfig;
        var featureManager = this.target.tools[this.featureManager];
        if (panelConfig && panelConfig[xtype]) {
            Ext.apply(config, panelConfig[xtype]);
        }
        return gxp.plugins.LayerProperties.superclass.addOutput.call(this, Ext.apply({
            xtype: xtype,
            authorized: this.target.isAuthorized(),
            layerRecord: record,
            source: this.target.getSource(record),
            featureManager: featureManager,
            defaults: {
                style: "padding: 10px",
                autoHeight: this.outputConfig.autoHeight
            },
            listeners: {
                added: function(cmp) {
                    if (!this.outputTarget) {
                        cmp.on("afterrender", function() {
                            cmp.ownerCt.ownerCt.center();
                        }, this, {single: true});
                    }
                },
                scope: this
            }
        }, config));
    }

  });
})();
