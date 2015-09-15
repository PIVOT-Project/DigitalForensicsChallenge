/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is FhcSearchbarOverlay.
 *
 * The Initial Developer of the Original Code is Stephan Mahieu.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Stephan Mahieu <stephanmahieu@yahoo.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */



/**
 * Methods to extend the searchbar right-click dropdown-menu with an extra
 * menuitem to invoke the "manage-this-field" FormHistory dialog.
 * 
 * Dependencies: FhcShowDialog.js, FhcBundle.js.
 */

const FhcSearchbarOverlay = {

  init: function() {
    var searchbar = document.getElementById("searchbar");
    if (!searchbar) return;

    var searchbarTextbox = document.getAnonymousElementByAttribute(
                                searchbar, "anonid", "searchbar-textbox");
    searchbarTextbox.addEventListener("popupshown",
      function(e){FhcSearchbarOverlay.popupshown(e)}, false
    );
  },

  popupshown: function(event) {
    var menu = event.originalTarget;
    if (!menu.getAttribute("fhc_menu_added")) {
      var bundle = new FhcBundle();
      var menuLabel = bundle.getString("searchbarfield.menuitem.managethis.label");
      bundle = null;

      var sep = menu.ownerDocument.createElement("menuseparator");
      menu.appendChild(sep);
      var mi = menu.ownerDocument.createElement("menuitem");
      mi.setAttribute("anonid", "fhc-context-menuitem");
      mi.setAttribute("label", menuLabel);
      mi.setAttribute("hidden", false);
      mi.setAttribute("class", "menuitem-iconic fh_menuitem_managethisfield");
      mi.setAttribute("tooltiptext", "Form History Control");
      mi.onclick = function(e){
        FhcShowDialog.doShowFormHistoryControl({searchField:true});
      };
      menu.appendChild(mi);
      menu.setAttribute("fhc_menu_added", true);
    }
  }
};

addEventListener("load",
  function(e){
    FhcSearchbarOverlay.init(e);
    removeEventListener("load", arguments.callee, false);    
  },
  false
);