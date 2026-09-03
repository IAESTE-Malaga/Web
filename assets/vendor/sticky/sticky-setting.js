/*
 * Settings of the sticky menu
 */

jQuery(document).ready(function(){
  var wWidth = jQuery( window ).width();
  //if( wWidth <= '767' ) {
  //  return false;
  //}
    var wpAdminBar = jQuery('#wpadminbar');
    if (wpAdminBar.length) {
      jQuery(".header-layout1 .menu-search-wrapper,.header-layout2 .menu-search-wrapper,.header-layout3 #masthead").sticky({topSpacing:wpAdminBar.height()});
    } else {
      jQuery(".header-layout1 .menu-search-wrapper,.header-layout2 .menu-search-wrapper,.header-layout3 #masthead").sticky({topSpacing:0});
    }
});