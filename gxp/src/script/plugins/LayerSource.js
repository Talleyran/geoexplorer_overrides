(function() {
  Ext.apply(gxp.plugins.LayerSource.prototype, {
    
    errorMessages: {
      404: 'Resorce not found.',
      403: 'Access denied.',
      302: 'Resource has been moved.'
    },

    errorMessageTitle: 'Some error while loading resource happend.',
    //Sorry for my bad english.

    //OVERRIDED exception listener added
    /** api: method[init]
     *  :arg target: ``Object`` The object initializing this plugin.
     *
     *  Calls :meth:`createStore` with a callback that fires the 'ready' event.
     */
    init: function(target) {
        this.target = target;
        this.createStore();
        if ( this.store ){
          this.store.on('exception', function(a,b,c,d,e){ this.showMessageError(e);},this);
        }
    },

    //Added exception message
    showMessageError: function(e) {
      Ext.MessageBox.show({
        title: this.errorMessageTitle,
        msg: this.errorMessages[e.status],
        buttons: Ext.MessageBox.OK,
        icon: Ext.MessageBox.ERROR
      });

    }

  });

})();
