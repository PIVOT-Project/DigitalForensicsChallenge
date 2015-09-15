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
 * The Original Code is FhcEntryDialog.
 *
 * The Initial Developer of the Original Code is Stephan Mahieu.
 * Portions created by the Initial Developer are Copyright (C) 2009
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
 * Methods for the form history edit dialog.
 * Only used within FhcEntryDialog.xul, thus no danger of namespace conflicts.
 *
 * Dependencies: FhcEntryDialog.xul, FhcShowDialog.js
 */
const FhcEntryDialog = {

  /** Global var to hold callback function (null if not set). */
  checkEntryExistsFunction: null,

  /**
   * Initialize dialog for add or edit.
   */
  init: function() {
    if (window.arguments[0].inn) {
      document.getElementById("name").value  = window.arguments[0].inn.name;
      document.getElementById("value").value = window.arguments[0].inn.value;
      document.getElementById("used").value = window.arguments[0].inn.used;
      document.getElementById("first").value = window.arguments[0].inn.first;
      document.getElementById("last").value = window.arguments[0].inn.last;

      document.getElementById("link_icon").setAttribute("hidden", (window.arguments[0].inn.place.length == 0));
      if (window.arguments[0].inn.place.length > 0) {
        document.getElementById("pagetitle").value = window.arguments[0].inn.place[0].title;
        document.getElementById("host").value = window.arguments[0].inn.place[0].host;
        document.getElementById("url").value = window.arguments[0].inn.place[0].url;
      }
    }

    this.checkEntryExistsFunction = window.arguments[0].entryExistCallback;

    // show the description according to the action (add / edit)
    var action = window.arguments[0].action;
    switch(action) {
      case "add":
           document.getElementById("descriptionAdd").style.display = "block";
           document.getElementById("placefirstbutton").hidden = true;
           document.getElementById("placelastbutton").hidden = true;
           break;
      case "edit":
           document.getElementById("descriptionEdit").style.display = "block";
           break;
      case "editmultiple":
           document.getElementById("descriptionMultiple").style.display = "block";
           document.getElementById("placefirstbutton").hidden = true;
           document.getElementById("placelastbutton").hidden = true;
           document.getElementById("name").setAttribute("disabled", "true");
           document.getElementById("value").setAttribute("disabled", "true");
           break;
    }
  },

  /**
   * Validate the data entered in the dialog when user activates the okay-button.
   * If validation fails, show error message and do not close the dialog thus
   * preventing the data to be saved.
   * Entered data is returned in window.arguments.
   *
   * @returns {Boolean}
   *          true when validation is okay, otherwise false preventing the dialog
   *          from closing
   */
  onOkay: function() {
    var eName = document.getElementById("name").value;
    var eValue = document.getElementById("value").value;
    var eUsed = document.getElementById("used").value;

    var action = window.arguments[0].action;

    // check if editable textboxes are not empty
    if ("editmultiple" != action && (eName == "" || eValue == "")) {
      document.getElementById("errorMessageBlank").hidden = false;
      return false;
    }
    else if (eUsed == "") {
      document.getElementById("errorMessageBlank").hidden = false;
      return false;
    }

    // check if TimesUsed value is valid
    if (!FhcUtil.isNumeric(eUsed)) {
      document.getElementById("errorMessageTimesUsed").hidden = false;
      return false;
    }

    var entry = {
      name:  eName,
      value: eValue,
      used:  eUsed,
      first: document.getElementById("first").value,
      last:  document.getElementById("last").value
    };

    // check if entry exists
    if (this.checkEntryExistsFunction) {
      if (this.checkEntryExistsFunction(entry)) {
        document.getElementById("errorMessageExist").hidden = false;
        return false;
      }
    }

    window.arguments[0].out = {
      name:  eName,
      value: eValue,
      used:  eUsed,
      first: document.getElementById("first").value,
      last:  document.getElementById("last").value
    };
    return true;
  },

  /**
   * Hide errormessage when fields are no longer blank due to user input to
   * indicate that the validation error is corrected.
   * Function is called each time the user enters data.
   */
  onInput: function() {
    document.getElementById("errorMessageExist").hidden = true;
    
    if (document.getElementById("name").value != ""
      && document.getElementById("value").value != ""
      && document.getElementById("used").value != ""
      && !document.getElementById("errorMessageBlank").hidden)
    {
      document.getElementById("errorMessageBlank").hidden = true;
    }

    if (FhcUtil.isNumeric(document.getElementById("used").value)) {
      document.getElementById("errorMessageTimesUsed").hidden = true;
    }
  },

  /**
   * Show browsing history.
   * @param what {String}
   *        indicator, either "first" or "last"
   */
  showBrowsingHistory: function(what) {
    var params = {
      what      : what,
      fieldName : window.arguments[0].inn.name,
      fieldValue: window.arguments[0].inn.value,
      date      : (what=="first") ? window.arguments[0].inn.firstRaw : window.arguments[0].inn.lastRaw
    };
    FhcShowDialog.doShowFhcBrowseHistory(params);
  },

  /**
   * Popup a link-menu for opening an URL in the browser or just copy the
   * link location to the clipboard.
   */
  showURLmenu: function() {
    var urlMenu = document.getElementById("open-url-menu");

    if ("open" == urlMenu.state) {
      urlMenu.hidePopup();
    }
    else {
      var url = document.getElementById("url").value;
      
      var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                      .getService(Components.interfaces.nsIIOService);
      var urlHost = ioService.newURI(url, null, null).prePath;

      var idx = url.indexOf("?");
      if (-1 < idx) {
        var urlStripped = url.substr(0, idx);
        document.getElementById("open-url-noparam").setAttribute("tooltiptext", urlStripped);
      }
      document.getElementById("open-url-noparam").setAttribute("disabled", (0 > idx));

      var urlSameAsHost = (urlHost.length == url.length) || (urlHost.length+1 == url.length);
      document.getElementById("open-url-host").setAttribute("disabled", urlSameAsHost);
      document.getElementById("open-url-host").setAttribute("tooltiptext", urlHost);

      document.getElementById("open-url").setAttribute("tooltiptext", url);
      document.getElementById("copy-url").setAttribute("tooltiptext", url);

      var anchor = document.getElementById("link_icon");
      urlMenu.openPopup(anchor, "after_end", 0, 0, false, false);
    }
  },

  /**
   * User clicked on an open-url-menu item.
   * 
   * @param menuItem (menuitem)
   *        the menutem clicked
   *
   * @param action {String}
   *        the type of action to perform, either "url" or "copy"
   */
  openURLMenu: function(menuItem, action) {
    var url = menuItem.getAttribute("tooltiptext");

    switch (action) {
      case "url":
        FhcUtil.openAndReuseOneTabPerURL(url);
        break;

      case "copy":
        var gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
                               .getService(Components.interfaces.nsIClipboardHelper);
        gClipboardHelper.copyString(url);
        break;
    }
  }
}