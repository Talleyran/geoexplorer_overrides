(function() {
  Ext.apply(gxp.WMSStylesDialog.prototype, {

    //ADDED
    defaultStyle: 'default',

    //OVERRIDED styles sync with layer properties
    /** private: method[initComponent]
     */
    initComponent: function() {
        this.addEvents(
            /** api: event[ready]
             *  Fires when this component is ready for user interaction.
             */
            "ready",

            /** api: event[modified]
             *  Fires on every style modification.
             *
             *  Listener arguments:
             *
             *  * :class:`gxp.WMSStylesDialog` this component
             *  * ``String`` the name of the modified style
             */
            "modified",

            /** api: event[styleselected]
             *  Fires whenever an existing style is selected from this dialog's
             *  Style combo box.
             *  
             *  Listener arguments:
             *
             *  * :class:`gxp.WMSStylesDialog` this component
             *  * ``String`` the name of the selected style
             */
            "styleselected",

            /** api: event[beforesaved]
             *  Fires before the styles are saved (using a
             *  :class:`gxp.plugins.StyleWriter` plugin)
             *
             *  Listener arguments:
             *
             *  * :class:`gxp.WMSStylesDialog` this component
             *  * ``Object`` options for the ``write`` method of the
             *    :class:`gxp.plugins.StyleWriter`
             */
            "beforesaved",

            /** api: event[saved]
             *  Fires when a style was successfully saved. Applications should
             *  listen for this event and redraw layers with the currently
             *  selected style.
             *
             *  Listener arguments:
             *
             *  * :class:`gxp.WMSStylesDialog` this component
             *  * ``String`` the name of the currently selected style
             */
            "saved"
        );

        var defConfig = {
            layout: "form",
            disabled: true,
            items: [{
                xtype: "fieldset",
                title: this.stylesFieldsetTitle,
                labelWidth: 85,
                style: "margin-bottom: 0;"
            }, {
                xtype: "toolbar",
                style: "border-width: 0 1px 1px 1px; margin-bottom: 10px;",
                items: [
                    {
                        xtype: "button",
                        iconCls: "add",
                        text: this.addStyleText,
                        tooltip: this.addStyleTip,
                        handler: this.addStyle,
                        scope: this
                    }, {
                        xtype: "button",
                        iconCls: "delete",
                        text: this.deleteStyleText,
                        tooltip: this.deleteStyleTip,
                        handler: function() {
                            var styles = this.layerRecord.get("styles");
                            for(var i=0; i< styles.length; i++ ){
                              if (styles[i].name == this.selectedStyle.data.name) {
                                styles.splice(i, 1);
                                i--;
                              }
                            }
                            this.stylesStore.remove(this.selectedStyle);
                        },
                        scope: this
                    }, {
                        xtype: "button",
                        iconCls: "edit",
                        text: this.editStyleText,
                        tooltip: this.editStyleTip,
                        handler: function() {
                            this.editStyle();
                        },
                        scope: this
                    }, {
                        xtype: "button",
                        iconCls: "duplicate",
                        text: this.duplicateStyleText,
                        tooltip: this.duplicateStyleTip,
                        handler: function() {
                            var prevStyle = this.selectedStyle;
                            var newStyle = prevStyle.get(
                                "userStyle").clone();
                            newStyle.isDefault = false;
                            newStyle.name = this.newStyleName();
                            var store = this.stylesStore;
                            store.add(new store.recordType({
                                "name": newStyle.name,
                                "title": newStyle.title,
                                "abstract": newStyle.description,
                                "userStyle": newStyle
                            }));
                            this.editStyle(prevStyle);
                        },
                        scope: this
                    }
                ]
            }]
        };
        Ext.applyIf(this, defConfig);
        
        this.createStylesStore();
                        
        this.on({
            "beforesaved": function() { this._saving = true; },
            "saved": function() { delete this._saving; },
            "render": function() {
                gxp.util.dispatch([this.getStyles], function() {
                    this.enable();
                }, this);
            },
            scope: this
        });

        gxp.WMSStylesDialog.superclass.initComponent.apply(this, arguments);
    },


    //OVERRIDED styles sync with layer properties
    /** api: method[editStyle]
     *  :arg prevStyle: ``Ext.data.Record``
     *
     *  Edit the currently selected style.
     */
    editStyle: function(prevStyle) {
        var userStyle = this.selectedStyle.get("userStyle");
        var buttonCfg = {
            bbar: ["->", {
                text: this.cancelText,
                iconCls: "cancel",
                handler: function() {
                    styleProperties.propertiesDialog.userStyle = userStyle;
                    styleProperties.close();
                    if (prevStyle) {

                        var styles = this.layerRecord.get("styles");
                        for(var i=0; i< styles.length; i++ ){
                          if (styles[i].name == this.selectedStyle.data.name) {
                            styles.splice(i, 1);
                            i--;
                          }
                        }

                        this._cancelling = true;
                        this.stylesStore.remove(this.selectedStyle);
                        this.changeStyle(prevStyle, {
                            updateCombo: true,
                            markModified: true
                        });
                        delete this._cancelling;
                    }
                },
                scope: this
            }, {
                text: this.saveText,
                iconCls: "save",
                handler: function() {
                    styleProperties.close();
                }
            }]
        };
        var styleProperties = new Ext.Window(Ext.apply(buttonCfg, {
            title: String.format(this.styleWindowTitle,
                userStyle.title || userStyle.name),
            bodyBorder: false,
            autoHeight: true,
            width: 300,
            modal: true,
            items: {
                border: false,
                items: {
                    xtype: "gxp_stylepropertiesdialog",
                    ref: "../propertiesDialog",
                    userStyle: userStyle.clone(),
                    nameEditable: false,
                    style: "padding: 10px;"
                }
            },
            listeners: {
                "close": function() {
                    var dialogUserStyle = styleProperties.propertiesDialog.userStyle;
                    var styles = this.layerRecord.get("styles");
                    var s = false;
                    for(var i=0; i< styles.length; i++ ){
                      if(styles[i].name == dialogUserStyle.name ){
                        s = true;
                        styles[i].title = dialogUserStyle.title;
                        styles[i].abstract = dialogUserStyle.description;
                      }
                    }
                    if (!s){
                      styles.push( {
                        legend: { 
                          format: styles[0].legend.format,
                          height: styles[0].legend.height,
                          width: styles[0].legend.width,
                          href: styles[0].legend.href + '&style=' + dialogUserStyle.name
                        }, 
                        title: dialogUserStyle.title, 
                        abstract: dialogUserStyle.description, 
                        name: dialogUserStyle.name
                      } );
                    }
                    this.selectedStyle.set(
                        "userStyle",
                        dialogUserStyle);

                },
                scope: this
            }
        }));
        styleProperties.show();
    },

    //OVERRIDED defaultStyle locale name
    /** private: method[addStylesCombo]
     * 
     *  Adds a combo box with the available style names found for the layer
     *  in the capabilities document to this component's stylesFieldset.
     */
    addStylesCombo: function() {
        var store = this.stylesStore;
        var combo = new Ext.form.ComboBox(Ext.apply({
            fieldLabel: this.chooseStyleText,
            store: store,
            editable: false,
            displayField: "title",
            valueField: "name",
            value: this.selectedStyle ?
                this.selectedStyle.get("title") :
                this.layerRecord.getLayer().params.STYLES || this.defaultStyle,
            disabled: !store.getCount(),
            mode: "local",
            typeAhead: true,
            triggerAction: "all",
            forceSelection: true,
            anchor: "100%",
            listeners: {
                "select": function(combo, record) {
                    this.changeStyle(record);
                    if (!record.phantom && !this._removing) {
                        this.fireEvent("styleselected", this, record.get("name"));
                    }
                },
                scope: this
            }
        }, this.initialConfig.stylesComboOptions));
        // add combo to the styles fieldset
        this.items.get(0).add(combo);
        this.doLayout();
    }


  });
})();
