(function() {
  Ext.apply(GeoExt.MapPanel.prototype, {

    //OVERRIDED events added (need for reprojection)
    /** private: property[stateEvents]
     *  ``Array(String)`` Array of state events
     */
    stateEvents: ["aftermapmove",
                  "afterlayervisibilitychange",
                  "afterlayeropacitychange",
                  "afterlayerorderchange",
                  "afterlayernamechange",
                  "afterlayeradd",
                  "afterlayerremove",
                  "projectionchanged", //<
                  "beforeprojectionchanged"] //<


  })
})();
