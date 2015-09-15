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
 * The Original Code is FhcMultilineDialog.
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
 * Methods for the form history multiline dialog.
 *
 * Dependencies: FhcMultilineDialog.js, FhcUtil.js, FhcDateHandler.js,
 *               FhcBundle.js, FhcPreferenceHandler.js
 */
const FhcMultilineDialog = {
  multilineItem: null,
  
  /**
   * Initialize dialog.
   */
  init: function() {
    if (window.arguments[0] && window.arguments[0].content) {
      this.multilineItem = window.arguments[0];
      var content = this.multilineItem.content;
      
      document.getElementById("textContent").value = content;
      
      if (content.match(/<\w+/)){
        
        // content contains html
        var prefHandler = new FhcPreferenceHandler(bundle);
        var doSanitize = prefHandler.isMultilineHTMLSanitized();
        //delete prefHandler;
        
        var dom = FhcUtil.htmlStringToDOM(content, doSanitize);
        document.getElementById("iframeContent").contentWindow.document.body.appendChild(dom);
        
        if (0 < dom.getElementsByTagName("img").length) {
          document.getElementById("hideimages").removeAttribute("hidden");
          document.getElementById("hideimages").setAttribute("checked", doSanitize)
        }
        
      } else {
        // plain text only, hide all tabs and show the plain tabbox
        document.getElementById("tabs").hidden = true;
        document.getElementById("tabbox").selectedTab = document.getElementById("tab-text");
      }
      
      //details
      var bundle = new FhcBundle();
      var dateHandler = new FhcDateHandler(bundle);
      document.getElementById("firstsaved").value = dateHandler.toDateString(this.multilineItem.firstsaved);
      document.getElementById("lastsaved").value = dateHandler.toDateString(this.multilineItem.lastsaved);
      document.getElementById("fieldid").value = this.multilineItem.id;
      document.getElementById("formid").value = this.multilineItem.formid;
      document.getElementById("fieldname").value = this.multilineItem.name;
      document.getElementById("type").value = this.multilineItem.type;
      //document.getElementById("host").value = this.multilineItem.host;
      document.getElementById("url").value = this.multilineItem.url;
      
      //delete dateHandler;
      //delete bundle;
    }
  },

  showPreviewImages: function() {
    var doShowImages = !("true" == document.getElementById("hideimages").getAttribute("checked"));
    
    var dom = document.getElementById("iframeContent").contentWindow.document.body;
    var imgs = dom.getElementsByTagName("img");
    
    var src;
    for (var ii=0; ii<imgs.length; ii++) {
      if (doShowImages) {
        src = imgs[ii].getAttribute("fhc-sanitized-src");
        imgs[ii].removeAttribute("src");
        imgs[ii].setAttribute("src", src);
      } else {
        src = imgs[ii].getAttribute("src");
        imgs[ii].removeAttribute("fhc-sanitized-src");
        imgs[ii].setAttribute("fhc-sanitized-src", src);
        imgs[ii].removeAttribute("src");
      }
    }
  },

  /**
   * Copy multiline text to the clipboard.
   *
   * @return {Boolean}
   *         true when copy succeeded
   */
  onCopyToClipboard: function() {
    Components.classes["@mozilla.org/widget/clipboardhelper;1"]
              .getService(Components.interfaces.nsIClipboardHelper)
              .copyString(this.multilineItem.content);
    return true;
  },
  
  /**
   * Toggle between hidden and visible details.
   */
  toggleDetails: function() {
    var hiddenDetailsBox = document.getElementById('details-hidden');
    var visibleDetailsBox = document.getElementById('details-shown');

    hiddenDetailsBox.hidden = !hiddenDetailsBox.hidden;
    visibleDetailsBox.hidden = !visibleDetailsBox.hidden;

    if (!visibleDetailsBox.hidden) {
      // for persistence to work (absence of attr can not be persisted)
      visibleDetailsBox.setAttribute("hidden", "false");
    } else {
      // for persistence to work (absence of attr can not be persisted)
      hiddenDetailsBox.setAttribute("hidden", "false");
    }
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