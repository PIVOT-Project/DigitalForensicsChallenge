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
 * The Original Code is FhcUtil.
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
 * Utility methods for the History Window Control app.
 *
 * Dependencies: FhcXmlHandler
 */
const FhcUtil = {
  /**
   * Property to determine whether or not searching is Case Sensitive.
   */
  isCaseSensitive: true,
  
  /**
   * Compare 2 strings.
   *
   * @param  a {String}
   * @param  b {String}
   * @return {Integer} return 0 if equal, -1 if a<b, 1 if a>b
   */
  stringCompare: function(a, b) {
    var st1 = this.isCaseSensitive ? a : a.toLowerCase();
    var st2 = this.isCaseSensitive ? b : b.toLowerCase();
    if (st1 < st2) return -1;
    if (st1 > st2) return 1;
    return 0;
  },

  /**
   * Test for presence of substring in string.
   *
   * @param  str {String}
   * @param  substr {String}
   * @return {Boolean} whether or not substr occurs in str
   */
  inStr: function(str, substr) {
    return this.isCaseSensitive 
           ? (-1 < str.indexOf(substr))
           : (-1 < str.toLowerCase().indexOf(substr.toLowerCase()));
  },

  /**
   * Test for presence of string in Array of string.
   *
   * @param  mArray {Array } array of strings
   * @param  mString {String}
   * @return {Boolean} whether or not mString occurs in mArray
   */
  arrayContainsString: function(mArray, mString) {
    for (var ii=0; ii < mArray.length; ii++) {
      if (mArray[ii] == mString) {
        return true;
      }
    }
    return false;
  },

  /**
   * Match a string against another string to see if they match taken
   * into account the options case sensitivity and exact or not exact.
   *
   * @param  doExact {Boolean}
   *         whether or not to match exact or contains
   *
   * @param  doCaseSensitive {Boolean}
   *         whether or not to ignore case
   *
   * @param  doRegExp {Boolean}
   *         whether or not to treat stringValue as a Regular Expression
   *
   * @param  stringValue {String}
   *         the string to match against
   *
   * @param  testValue {String}
   *         the string value to test
   *
   * @return {Boolean}
   *         whether or not the testValue matches the stringValue
   */
  isMatchingString: function(doExact, doCaseSensitive, doRegExp, stringValue, testValue) {
    var isMatch = true;
    if (""!=stringValue) {
      var tstVal = (doCaseSensitive) ? testValue : testValue.toLowerCase();
      var tstStr = (doCaseSensitive) ? stringValue : stringValue.toLowerCase();

      if (doRegExp) {
        try {
          var re = new RegExp(stringValue);
          isMatch = re.test(testValue);
        } catch(e) {
          isMatch = false;
        }
      } else {
        isMatch = (doExact) ? (tstVal == tstStr) : (-1 < tstVal.indexOf(tstStr));
      }
    }
    return isMatch;
  },

  /**
   * Reverse the content of a String.
   * 
   * @param  str {String}
   * @return {String} the reversed input string
   */
  strReverse: function(str) {
    return str.split("").reverse().join("");
  },

  /**
   * Test if value n can be interpreted as an integer.
   *
   * @param n {}
   * @return {Boolean}
   *         whether or not value n can be interpreted as an integer
   */
  isNumeric: function(n) {
    return !isNaN(parseInt(n)) && isFinite(n);
  },

  /**
   * Display a confirmation dialog, return true if user confirmed.
   * 
   * @param  title {String}
   * @param  message {String}
   * @param  checkMessage [String]
   * @return {Boolean} whether or not the user confirmed (clicked ok-button)
   */
  confirmDialog: function(title, message, checkMessage) {
    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                    .getService(Components.interfaces.nsIPromptService);
    var check = {value: false};
    var flags = prompts.BUTTON_TITLE_OK * prompts.BUTTON_POS_0 +
                prompts.BUTTON_TITLE_NO * prompts.BUTTON_POS_1;
    var button = prompts.confirmEx(window, title, message, flags, 
                 "", "", "", checkMessage, check);
                 
    return {isOkay: (button == 0), isChecked: check.value};
  },

  /**
   * Display status dialog with an okay button only.
   *
   * @param title {String}
   * @param message {String}
   */
  alertDialog: function(title, message) {
    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                    .getService(Components.interfaces.nsIPromptService);
    prompts.alert(window, title, message);
  },

  /**
   * Show a message on the bottom-right of the current page for the specified
   * amount of time, after displaytime has expired fade-out and remove from page.
   *
   * @param id {String}
   *        the id of the div (message) element to create and add to the page
   *
   * @param infoMessage {String}
   *        the (short) message to display
   *
   * @param showTime {Integer}
   *        time in milliseconds to display the message
   */
  showTrayMessage: function(id, infoMessage, showTime) {
    var document = window.getBrowser().contentDocument;

    // outer div
    var div = document.createElement('div');
    div.setAttribute('id', id);
    div.setAttribute('style',
      'position:fixed; z-index:20000; cursor:default; ' +
      'bottom:0; right:0; padding:0px; margin:0 10px 10px 0;' +
      'background-color:#000; opacity: 0.70;' +
      'box-shadow: 3px 3px 3px rgba(0, 0, 0, 0.4);' +
      'border-radius: 5px; border:2px outset #585B5C');
    div.addEventListener("click", function(){this.style.display='none';}, false);

    // inner div holding the message with an image
    var msgDiv = document.createElement('div');
    div.appendChild(msgDiv);
    msgDiv.setAttribute('style',
      'overflow:hidden; padding:10px; text-align:center; ' +
      'font:bold 16px sans-serif; color:#FFF');
    var img = document.createElement('img');
    img.setAttribute('style', 'vertical-align:middle; margin-right:8px');
    img.setAttribute('src', 'chrome://formhistory/skin/okay16.png')
    msgDiv.appendChild(img);
    msgDiv.appendChild(document.createTextNode(infoMessage));

    // remove old message (if it exists)
    var oldDiv = document.getElementById(id);
    if (oldDiv && oldDiv.parentNode) {
      oldDiv.parentNode.removeChild(oldDiv);
    }

    // display the new message
    document.body.appendChild(div);

    // fade-out and remove the message automatically after [showTime] seconds
    FhcUtil.fadeOutAndRemoveAfter(document, id, showTime);
  },

  /**
   * Select all text input elements with a name and a value from the
   * current webpage.
   * 
   * @return {Array} a list with selected text input elemets
   */
  getAllNonEmptyVisibleInputfields: function() {
    var fieldList = [];

    // start with the current webpage
    var document = window.getBrowser().contentDocument;
    this._getAllNonEmptyVisibleInputfields(fieldList, document);

    return fieldList;
  },

  /**
   * Recursively visit document and its child documents and collect visible
   * inputfields.
   *
   * @param fieldList {Array}
   *        Array used to collect all visible input fields
   *
   * @param document {DOM Document}
   *        the page to collect inputfields from
   *        
   */
  _getAllNonEmptyVisibleInputfields: function(fieldList, document) {
    // get all input elements
    var tags = document.getElementsByTagName("input");

    // select all visible elements with a name and a value
    for (var ii=0; ii < tags.length; ii++) {
      var inputField = tags[ii];
      if (this.isInputTextElement(inputField)) {
        if ("" != this.getElementNameOrId(inputField)) {
          if (!inputField.hasAttribute("empty") && "" != inputField.value) {
            if (this.elementIsVisible(inputField)) {
              fieldList.push(inputField);
            }
          }
        }
      }
    }

    // recurse childdocuments (if any)
    for (var jj=0; jj < document.defaultView.frames.length; jj++) {
      this._getAllNonEmptyVisibleInputfields(
                    fieldList, document.defaultView.frames[jj].document);
    }
  },
  
  /**
   * Get all form elements of a given document.
   * 
   * @param  document {DOM Document}
   * @return {Array} an array with all formElements for the given document.
   */
  getAllFormElements: function(document) {
    var formElems = [];
    this._getAllFormElements(document, formElems);
    return formElems;
  },  

  /**
   * Get all loginmanaged fieldnames.
   * 
   * @return {Array} an array of the names of all fields managed by the
   *                 login manager.
   */
  getAllLoginmanagedFields: function() {
    var loginFields = [];
    
    var loginManager = Components.classes["@mozilla.org/login-manager;1"]
                         .getService(Components.interfaces.nsILoginManager);
    var logins = loginManager.getAllLogins({});
    for (var ii=0; ii < logins.length; ii++) {
      loginFields.push(logins[ii].usernameField);
    }
    return loginFields;
  },
  
  /**
   * Get the fieldnames of text-input fields inside all forms of the given
   * document which are managed by the password manager (signons3.txt).
   * 
   * @param  document {DOM Document}
   * @return {Array} an array of the names of all fields managed by the
   *                 login manager for the given document.
   */
  getFormLoginManagedFields: function(document) {
    var loginFields = [];
    
    // get all form elements in the document
    var formElems = [];
    this._getAllFormElements(document, formElems);
    
    if (0 < formElems.length) {
      var baseURL = document.baseURIObject.prePath;
      var loginManager = Components.classes["@mozilla.org/login-manager;1"]
                           .getService(Components.interfaces.nsILoginManager);
      // iterate over all form elements
      for (var ii=0; ii < formElems.length; ii++) {
        var actionURL = this._getURLPrepath(formElems[ii].action);
        
        // find managed loginfield(s)
        var logins = loginManager.findLogins({}, baseURL, ""==actionURL?baseURL:actionURL, "",  null);
        for (var jj=0; jj < logins.length; jj++) {
          var username = logins[jj].usernameField;
          if (!this.arrayContainsString(loginFields, username)) {
            loginFields.push(username);
          }
        }
      }
    }
    return loginFields;
  },

  /**
   * Determine whether or not a DOM element is a text input element.
   * New html5 types like search, tel, url, time, week and email are
   * also considered text types.
   * 
   * @param  element {DOM element}
   * @return {Boolean} whether or not a DOM element is a text input element
   */
  isInputTextElement: function(element) {
    var result = false;
    if (element && element.nodeName) {
      result = (("INPUT" == element.nodeName || "html:input" == element.nodeName)
                 && 
                 ("text" == element.type   || "search" == element.type   ||
                  "tel" == element.type    || "url" == element.type      ||
                  "email" == element.type  || "color" == element.type    ||
                  "date" == element.type   || "datetime" == element.type ||
                  "datetime-local" == element.type ||
                  "number" == element.type ||
                  "month" == element.type  || "week" == element.type     ||
                  "time" == element.type   || "range" == element.type
                 )
               );
    }
    return result;
  },

  /**
   * Determine whether or not a DOM element is a multiline input element.
   * 
   * @param  element {DOM element}
   * @return {Boolean} whether or not a DOM element is a multiline input element
   */
  isMultilineInputElement: function(element) {
    if (!element) return false
    var name = element.nodeName.toLowerCase();
    if ("textarea" == name) {
      return true;
    }
    else if ("html" == name) {
      var p = element.parentNode;
      if (p && "on" == p.designMode) {
        return true;
      }
    }
    else if ("body" == name) {
      var e = element.ownerDocument.activeElement;
      if ("true" == e.contentEditable) {
        return true;
      }
    }
    return false;
  },

  /**
   * Determine whether or not a DOM element is a radiobox, checkbox or select
   * element.
   * 
   * @param  element {DOM element}
   * @return {Boolean} whether or not a DOM element is a radiobox, checkbox or
   *          select element
   */
  isRadioCheckOrSelectElement: function(element) {
    if (!element) return false
    var result = false;
    switch(element.type){
      case "radio":
      case "checkbox":
      case "select":
      case "select-multiple":
      case "select-one":
           result = true;
    }
    return result;
  },

  /**
   * Determine whether or not the given inputElement is the child of a form and
   * is managed by the loginmanager.
   *
   * @param  document {DOM Document}
   * @param  inputElm {DOM element}
   * @return {Boolean} whether or not the inputfield is the child of a form
   *                   in the given document and is managed by the loginmanager
   */
  isInputInLoginManagedForm: function(document, inputElm) {
    var insideForm = false;
    var parentElm = null;
    if (inputElm.id) {
      parentElm = document.getElementById(inputElm.id);
    }
    if (parentElm == null) {
      var elms = document.getElementsByName(inputElm.name);
      if (elms && elms.size > 0) parentElm = elms[0];
    }
    while(parentElm && !insideForm) {
      parentElm = parentElm.parentNode;
      insideForm = (parentElm && "FORM" == parentElm.tagName);
    }
    
    var isManaged = false;
    if (insideForm) {
      // find managed loginfield(s)
      var loginManager = Components.classes["@mozilla.org/login-manager;1"]
                           .getService(Components.interfaces.nsILoginManager);
      var baseURL = document.baseURIObject.prePath;
      var actionURL = this._getURLPrepath(parentElm.action);
      var logins = loginManager.findLogins({}, baseURL, ""==actionURL?baseURL:actionURL, "",  null);
      isManaged = (0 < logins.length);
    }

    return insideForm && isManaged;
  },

  /**
   * Return the fieldnames (or id if nameless) of all text-input tags.
   *
   * @param  document {DOM Document}
   * @return {Array} array of DOM elements which are text inout elements
   */
  getInputTextNames: function(document) {
    var inputTags = [];
    this._addInputTextNames(document, inputTags);
    return inputTags;
  },

  /**
   * Check if element is hidden. An element is hidden if its style
   * or the style of one of its ancestors is hidden.
   * 
   * @param  elem {DOM element}
   * @return {Boolean} whether or not the element is hidden
   *
   */
  elementIsHidden: function(elem) {
    // element is hidden if style is hidden or its parent is hidden
    if (elem.style && elem.style.visibility) {
      // is hidden
      return true
    }
    if (elem.parentNode) {
      // check if parent is hidden
      return this.elementIsHidden(elem.parentNode);
    }
    
    // no parent, not hidden
    return false;
  },

  /**
   * Check if an element is visible.
   * 
   * @param  element {DOM element}
   *
   * @return {Boolean}
   *         whether or not the element is visible
   */
  elementIsVisible: function(element) {
    if ('input' == element.localName && 'hidden' == element.type) {
      return false;
    }
    
    return this._isDisplayed(element);
  },

  /**
   * Get the value from a DOM element if not empty. The value may contain the
   * so called "emptyText" which would be returned if the user has not entered
   * any value yet. This method returns an empty string when nothing has been
   * entered instead of the emptyText.
   *
   * @param  element {DOM element}
   *         the id of the DOM element
   *
   * @return (String)
   *         the value if present, an empty string otherwise
   */
  getElementValueIfNotEmpty: function(element) {
    if (!element.hasAttribute("empty")) {
      return element.value;
    }
    return "";
  },
  
  /**
   * Determine the name of an element (either name if it has one,
   * otherwise its id).
   *
   * @param  element {DOM element}
   *         the DOM element
   *
   * @return {String}
   *         the name of the element, if no name then return its id
   */
  getElementNameOrId: function(element) {
    return (element.name && element.name.length > 0)
           ? element.name
           : element.id;
  },

  /**
   * Get the main document.
   * @param   curWindow {Window} the current window.
   * @return (Document) the main document.
   */
  getMainDocument: function(curWindow) {
      var mainDocument;

      // does not work!?  window.opener.document
      // XXX: bit hacky! More elegant/robust solution?
      try {
        mainDocument = curWindow.getBrowser().contentDocument;
      } catch(ex) {
        // we get here if dialog was opened from ff-options-dialog
        var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIWebNavigation)
                   .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                   .rootTreeItem
                   .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIDOMWindow);
        mainDocument = mainWindow.opener.opener.getBrowser().contentDocument;
      }
      return mainDocument;
  },

  /**
   * Get the root-popupmenu of a menuitem.
   * 
   * @param  menuItem {menuitem Element}  
   * @return {menupopup Element}
   */
  getMenuItemRootPopup: function(menuItem) {
    var parent = menuItem;
    while (parent != null) {
      parent = parent.parentNode;
      if (parent != null && "menupopup" == parent.nodeName) {
        if (parent.parentNode == null || !parent.parentNode.nodeName.match(/^menu/)) {
          return parent;
        }
      }
    }
    return null;
  },

  /**
   * Create a new menuitem.
   * @param aLabel {String} the label of the menuitem
   * @param aValue {String} the value of the menuitem
   * @return {menuitem}
   */
  createMenuItem: function (aLabel, aValue) {
    const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    var item = document.createElementNS(XUL_NS, "menuitem");
    item.setAttribute("label", aLabel);
    item.setAttribute("value", aValue);
    return item;
  },

  /**
   * Create a new menu with a child menupopup.
   * @param aLabel {String} the label of the menuitem
   * @return {menuitem}
   */
  createMenu: function (aLabel) {
    const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    var item = document.createElementNS(XUL_NS, "menu");
    item.setAttribute("label", aLabel);

    var subItem = document.createElementNS(XUL_NS, "menupopup");
    item.appendChild(subItem);
    return item;
  },

  /**
   * Open a window with the help page URL.
   */
  showHelp: function() {
    this.openAndReuseOneTabPerURL(
            "http://formhistory.blogspot.com/2009/06/introduction-to-form-history-control.html");
  },

  /**
   * Open a window with the release-notes URL.
   */
  showReleaseNotes: function() {
    this.openAndReuseOneTabPerURL(
            "http://formhistory.blogspot.com/2009/05/release-notes.html");
  },
  
  /**
   * Open an URL/URI trying to re-use an existing tab.
   * If no such tab exists, a new one is opened with the specified URL/URI.
   *
   * @param url {String}
   */
  openAndReuseOneTabPerURL: function(url) {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
               .getService(Components.interfaces.nsIWindowMediator);
    var browserEnumerator = wm.getEnumerator("navigator:browser");

    // check each browser instance for our URL
    var found = false;
    while (!found && browserEnumerator.hasMoreElements()) {
      var browserWin = browserEnumerator.getNext();
      var tabbrowser = browserWin.getBrowser();

      // check each tab of this browser instance
      var numTabs = tabbrowser.browsers.length;
      for(var index=0; index<numTabs; index++) {
        var currentBrowser = tabbrowser.getBrowserAtIndex(index);
        if (url == currentBrowser.currentURI.spec) {

          // the URL is already opened. Select this tab.
          tabbrowser.selectedTab = tabbrowser.mTabs[index];

          // focus *this* browser-window
          browserWin.focus();

          found = true;
          break;
        }
      }
    }

    // our URL isn't open. Open it now.
    if (!found) {
      var recentWindow = wm.getMostRecentWindow("navigator:browser");
      if (recentWindow) {
        // use an existing browser window
        try {
          recentWindow.delayedOpenTab(url, null, null, null, null);
        } catch(e) {
          // SeaMonkey
          var newTab = recentWindow.gBrowser.addTab(url);
          tabbrowser.selectedTab = newTab;
        }
      }
      else {
        // no browser windows are open, so open a new one.
        window.open(url);
      }
    }
  },

  /**
   * Detect whether or not the browser is in private browsing mode.
   *
   * @return {boolean} whether or not in private browsing mode.
   */
  inPrivateBrowsingMode: function() {
    var loadContext = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                  .getInterface(Components.interfaces.nsIWebNavigation)
                  .QueryInterface(Components.interfaces.nsILoadContext);
    return loadContext.usePrivateBrowsing;
  },

  /**
   * Return the host application (browser name, ie Firefox or SeaMonkey).
   * 
   * @return {String} the host application name.
   */
  getBrowserName: function() {
    var info = Components.classes["@mozilla.org/xre/app-info;1"]
               .getService(Components.interfaces.nsIXULAppInfo);
    return info.name;
  },

  /**
   * Return the version of the host (browser, returns "2.0.0.1" for FF ver 2.0.0.1).
   *
   * @return {String} the host application name.
   */
  getBrowserVersion: function() {
    var info = Components.classes["@mozilla.org/xre/app-info;1"]
               .getService(Components.interfaces.nsIXULAppInfo);
    // info.version returns "2.0.0.1" for Firefox version 2.0.0.1
    return info.version;
  },

  /**
   * Determine the Gecko version.
   *
   * @return {Array} the Gecko version, [0] = major, [1] = minor, etc.
   */
  getGeckoVersion: function() {
    var str = navigator.userAgent;
    var geckoVer = str.match(/rv:[\d\.]+/g)[0].replace('rv:', '').match(/\d+/g);
    return geckoVer;
  },

  /**
   * Safely parse a string containing HTML into a DOM.
   * This is an alternative to: document.body.innerHTML = content;
   *  
   * There are potential dangers involved in injecting remote content in a
   * privileged context.
   * 
   * The function below will safely parse simple HTML and return a DOM object.
   * This will remove tags like <script>, <style>, <head>, <body>, <title>, and <iframe>.
   * It also removes all JavaScript, including element attributes containing JavaScript.
   * 
   * @param aHTMLString {String}
   *        string containing HTML elements
   *        
   * @param aSanitize {Boolean}
   *        wether or not to sanitize HTML (not loading images, force openening
   *        links in new window)
   * 
   * @return {DOM}
   *         parsed HTML without potentially dangerous content
   * 
   */
  htmlStringToDOM: function(aHTMLString, aSanitize){
    var body = document.createElementNS("http://www.w3.org/1999/xhtml", "body");

    body.appendChild(Components.classes["@mozilla.org/feed-unescapehtml;1"]
      .getService(Components.interfaces.nsIScriptableUnescapeHTML)
      .parseFragment(aHTMLString, false, null, body));

      if (aSanitize) {
        // sanitize images
        var imgs = body.getElementsByTagName("img"), src;
        for (var ii=0; ii<imgs.length; ii++) {
          src = imgs[ii].getAttribute("src");
          imgs[ii].setAttribute("fhc-sanitized-src", src);
          imgs[ii].removeAttribute("src");
          imgs[ii].setAttribute("src", "chrome://formhistory/skin/img_sanitized.png");
        }
        
        // force links to open in new window
        var links = body.getElementsByTagName("a");
        for (var jj=0; jj<links.length; jj++) {
           links[jj].removeAttribute("target");
           links[jj].setAttribute("target", "_blank");
        }
      }

    return body;
  },


  //----------------------------------------------------------------------------
  // Import / Export methods
  //----------------------------------------------------------------------------
  
  /**
   * Export data as XML to a user prompted file/location.
   * 
   * @param dialogTitle {String}
   * @param options {Object} object containing the export options
   * @param preferenceHandler (FhcPreferenceHandler)
   * @param dbHandler (FhcDbHandler)
   * @param dateHandler {FhcDateHandler}
   */
  exportXMLdata: function(dialogTitle, options, preferenceHandler, dbHandler, dateHandler) {
    var defaultFile = preferenceHandler.getLastUsedExportFilename();
    var fp = this._getFilePicker(dialogTitle, defaultFile, Components.interfaces.nsIFilePicker.modeSave);
    var result = fp.show();

    // if okay (export to new file or replace existing)
    if (result == Components.interfaces.nsIFilePicker.returnOK || result == Components.interfaces.nsIFilePicker.returnReplace) {
      // remember the filename for subsequent invocations
      preferenceHandler.setLastUsedExportFilename(fp.file.leafName);
      
      this.exportXMLfile(fp.file, options, preferenceHandler, dbHandler, dateHandler);
    }
  },
  
  exportXMLfile: function(file, options, preferenceHandler, dbHandler, dateHandler ) {
    // open file for writing, create if not exist, truncate to 0 if do exist
    var fileOut = Components.classes["@mozilla.org/network/file-output-stream;1"]
                    .createInstance(Components.interfaces.nsIFileOutputStream);
    fileOut.init(file, 0x02/*PR_WRONLY*/ | 0x08/*PR_CREATE_FILE*/ | 0x20/*PR_TRUNCATE*/, -1/*default permission*/, null);
    
    try {
      var xmlHandler = new FhcXmlHandler(dateHandler, preferenceHandler.isISOdateFormat());
      var xml = xmlHandler.dataToXMLString(options, preferenceHandler, dbHandler);
      //delete xmlHandler;

      fileOut.write(xml, xml.length);
    } finally {
      fileOut.close();
    }
  },
  
  /**
   * Retrieve the history entries read from a user prompted XML file/location.
   *
   * @param  dialogTitle {String}
   * @param  preferenceHandler (FhcPreferenceHandler)
   * @param  dateHandler {FhcDateHandler}
   * @return {Array} an array of formhistory entries
   */
  importXMLdata: function(dialogTitle, preferenceHandler, dateHandler) {
    var importedData = null;
    var defaultFile = preferenceHandler.getLastUsedExportFilename();
    var fp = this._getFilePicker(dialogTitle, defaultFile, Components.interfaces.nsIFilePicker.modeOpen);
    var result = fp.show();

    // if okay do the import
    if (result == Components.interfaces.nsIFilePicker.returnOK) {
      // remember the filename for subsequent invocations
      preferenceHandler.setLastUsedExportFilename(fp.file.leafName);

      // open file for reading
      var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                       .createInstance(Components.interfaces.nsIFileInputStream);
      var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
                       .createInstance(Components.interfaces.nsIConverterInputStream);
      fstream.init(fp.file, -1/*(PR_RDONLY)*/, -1/*default permission*/, null);
      cstream.init(fstream, "UTF-8", 0, 0); 
      try {
        var xmlHandler = new FhcXmlHandler(dateHandler, preferenceHandler.isISOdateFormat());
        importedData = xmlHandler.parseXMLdata(cstream);
        //delete xmlHandler;
      } finally {
        cstream.close();
      }
    }
    return importedData;
  },

  /**
   * Export the entire cleanup database to a specified file/location.
   *
   * @param file {nsIFile}
   * @param dbHandler {FhcDbHandler} the database handler
   * @param preferenceHandler (FhcPreferenceHandler)
   * @param dateHandler {FhcDateHandler}
   */
  exportCleanupDatabase: function(file, dbHandler, preferenceHandler, dateHandler) {
    var exportOptions = {
        entries:           [],    /* not in cleanup database */
        multilines:        dbHandler.getAllMultilineItems(),
        exportMultiCfg:    true,  /* for editor exceptionlist */
        exportCustSaveCfg: true,  /* for custom save exceptionlist */
        exportClean:       true,
        exportKeys:        false, /* not in cleanup database */
        exportRegexp:      true
    };
    
    // open file for writing, create if not exist, truncate to 0 if do exist
    var fileOut = Components.classes["@mozilla.org/network/file-output-stream;1"]
                    .createInstance(Components.interfaces.nsIFileOutputStream);
    fileOut.init(file, 0x02/*PR_WRONLY*/ | 0x08/*PR_CREATE_FILE*/ | 0x20/*PR_TRUNCATE*/, -1/*default permission*/, null);
    try {
      var xmlHandler = new FhcXmlHandler(dateHandler, true);
      var xml = xmlHandler.dataToXMLString(exportOptions, preferenceHandler, dbHandler);
      //delete xmlHandler;
      //delete exportOptions;

      fileOut.write(xml, xml.length);
    } finally {
      fileOut.close();
    }
  },

  /**
   * Retrieve the cleanup data from a specified XML file/location.
   *
   * @param  file {nsIFile}
   * @param  dateHandler {FhcDateHandler}
   * @return {Object} an Object containing arrays with the cleanup configuration.
   */
  importCleanupDatabase: function(file, dateHandler) {
    var importedConfig = null;
    // open file for reading
    var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                     .createInstance(Components.interfaces.nsIFileInputStream);
    var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
                     .createInstance(Components.interfaces.nsIConverterInputStream);
    fstream.init(file, -1/*(PR_RDONLY)*/, -1/*default permission*/, null);
    cstream.init(fstream, "UTF-8", 0, 0); 
    try {
      var xmlHandler = new FhcXmlHandler(dateHandler, true);
        importedConfig = xmlHandler.parseXMLdata(cstream);
      //delete xmlHandler;
    } finally {
      cstream.close();
    }
    return importedConfig;
  },

  /**
   * Export as CSV the formhistory entries to a user prompted file/location.
   *
   * @param dialogTitle {String}
   * @param entries {Array} an array of formhistory entries
   * @param preferenceHandler (FhcPreferenceHandler)
   */
  exportEntriesCSV: function(dialogTitle, entries, preferenceHandler) {
    var defaultFile = preferenceHandler.getLastUsedCSVExportFilename();
    var fp = this._getFilePicker(dialogTitle, defaultFile, Components.interfaces.nsIFilePicker.modeSave);
    fp.defaultExtension = "csv";
    fp.filterIndex = 0;
    var result = fp.show();

    // if okay (export to new file or replace existing)
    if (result == Components.interfaces.nsIFilePicker.returnOK || result == Components.interfaces.nsIFilePicker.returnReplace) {
      // remember the filename for subsequent invocations
      preferenceHandler.setLastUsedCSVExportFilename(fp.file.leafName);

      // get CSV preferences
      var sep = preferenceHandler.getCSVSeparator();
      var qt  = preferenceHandler.getCSVQuote();
      var esc = preferenceHandler.getCSVEscapePrefix();

      // open file for writing, create if not exist, truncate to 0 if do exist
      var fileOut = Components.classes["@mozilla.org/network/file-output-stream;1"]
                      .createInstance(Components.interfaces.nsIFileOutputStream);
      fileOut.init(fp.file, 0x02/*PR_WRONLY*/ | 0x08/*PR_CREATE_FILE*/ | 0x20/*PR_TRUNCATE*/, -1/*default permission*/, null);
      try {
        var row;
        for (var ii=0; ii < entries.length; ++ii) {
          row = this._toCSVValue(entries[ii].name, qt, esc) +
                sep +
                this._toCSVValue(entries[ii].value, qt, esc) +
                "\n";
          fileOut.write(row, row.length);
        }
      } finally {
        fileOut.close();
      }
    }
  },


  //----------------------------------------------------------------------------
  // PrefListener
  //----------------------------------------------------------------------------

  /**
   * Method for registering an observer which gets called when any of the
   * formhistory preferences change.
   *
   * @param branchName {String} the root of the preferences to observe
   * @param func {Function} the observer to call when preferences change
   */
  PrefListener: function(branchName, func) {
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefService);
    var branch = prefService.getBranch(branchName);
    branch.QueryInterface(Components.interfaces.nsIPrefBranch);

    this.register = function() {
      branch.addObserver("", this, false);
      // call func on all preferences when registering this observer
      // branch.getChildList("", { })
      //       .forEach(function(name) { func(branch, name); });
    };

    this.unregister = function unregister() {
      if (branch)
        branch.removeObserver("", this);
    };

    this.observe = function(subject, topic, data) {
      if (topic == "nsPref:changed")
        func(branch, data);
    };
  },


  //----------------------------------------------------------------------------
  // Fadeout and remove element methods
  //----------------------------------------------------------------------------

  /**
   * Fade out an element using its opacity-style and remove the element
   * when its opacity has reached zero opacity.
   *
   * @param document {DOM document}
   * @param id {String} the id of the element to fade
   * @param delay {Integer} the no of milliseconds to wait before starting to fade
   */
  fadeOutAndRemoveAfter: function(document, id, delay) {
    var event = {
      notify: function(timer) {
        FhcUtil._fadeElement(document, id);
      }
    }
    this._setTimer(event, delay);
  },

  _fadeElement: function(document, id) {
    var event = {
      notify: function(timer) {
        FhcUtil._fadeElementCallback(document, id);
      }
    }
    this._setTimer(event, 100);
  },

  _fadeElementCallback: function(document, id) {
    var element = document.getElementById(id);
    if (element) {
      var op = (element.style.opacity) ? element.style.opacity-0.1 : 0.9;
      if (op > 0) {
        element.style.opacity = op;
        FhcUtil._fadeElement(document, id);
      }
      else {
        element.parentNode.removeChild(element);
      }
    }
  },

  _setTimer: function(event, delay) {
    var timer = Components.classes["@mozilla.org/timer;1"]
                    .createInstance(Components.interfaces.nsITimer);
    timer.initWithCallback(event, delay, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
  },


  //----------------------------------------------------------------------------
  // Helper methods
  //----------------------------------------------------------------------------

  /**
   * Create a Filepicker dialog with default .xml extension.
   * 
   * @param  dialogTitle {String}
   * @param  defaultFilename {String}
   * @param  nsIFilePickerMode {short}
   * @return {nsIFilePicker}
   */
  _getFilePicker: function(dialogTitle, defaultFilename, nsIFilePickerMode) {
    var fp = Components.classes["@mozilla.org/filepicker;1"]
                .createInstance(Components.interfaces.nsIFilePicker);

    // ask user where to load/save
    fp.appendFilters(Components.interfaces.nsIFilePicker.filterAll
                   | Components.interfaces.nsIFilePicker.filterXML);
    fp.filterIndex = 1;
    fp.defaultString = defaultFilename;
    fp.defaultExtension = "xml";
    fp.init(window, dialogTitle, nsIFilePickerMode);
    return fp;
  },

  /**
   * Surround a value with quotes, escape pre-existing quotes with a prefix.
   *
   * @param  value {String}
   * @param  quote {String}
   * @param  prefix {String}
   * @return {String} The quoted escaped value
   */
  _toCSVValue: function(value, quote, prefix) {
    var csvValue = value;
    if ("" != quote && "" != prefix) {
      csvValue = value.replace(quote, prefix+quote, "g");
    }
    return quote + csvValue + quote;
  },

  /**
   * Get the fieldnames of all text-input tags (uses recursion).
   *
   * @param document {DOM Document}
   * @param inputTags {Array} output array containing all child input elements
   */
  _addInputTextNames: function(document, inputTags) {
    var tags = document.getElementsByTagName("input");
    for (var ii=0; ii < tags.length; ii++) {
      if (this.isInputTextElement(tags[ii])) {
        var fldname = (tags[ii].name && tags[ii].name.length>0) ? tags[ii].name : tags[ii].id;
        inputTags.push(fldname);
      }
    }
    // child documents?
    for (var jj=0; jj < document.defaultView.frames.length; jj++) {
      // recurse childdocument
      this._addInputTextNames(document.defaultView.frames[jj].document, inputTags);
    }
  },
  
  /**
   * Get all form elements of a given document (uses recursion).
   * 
   * @param document {DOM Document}
   * @param formElements {Array} output array containing all child form elements
   */
  _getAllFormElements: function(document, formElements) {
    for (var ii=0; ii < document.forms.length; ii++) {
      formElements.push(document.forms[ii]);
    }
    // child documents?
    for (var jj=0; jj < document.defaultView.frames.length; jj++) {
      // recurse childdocument
      this._getAllFormElements(document.defaultView.frames[jj].document, formElements);
    }
  },
  
  /**
   * Return the prepath (usually the part upto the first single slash) of
   * a URL (http://some.domain)
   * if it cannot be determined return ""
   * 
   * @param  strURL {String}
   * @return {String} the prepath of strURL
   */
  _getURLPrepath: function(strURL) {
    var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                      .getService(Components.interfaces.nsIIOService);
    return ioService.newURI(strURL, null, null).prePath;  
  },

  /**
   * Get the effective css style of an element.
   *
   * @param  element {DOM element}
   * @param  property {String} the css property to obtain
   * @return {String} the effective css style
   */
  _getEffectiveStyle: function(element, property) {
    if (element.style == undefined) {
        return undefined; // not a styled element
    }

    var doc = element.ownerDocument;
    var effectiveStyle = doc.defaultView.getComputedStyle(element, null);
    var propertyValue = effectiveStyle.getPropertyValue(property);
    if ("inherit" == propertyValue && element.parentNode.style) {
        return this._getEffectiveStyle(element.parentNode, property);
    }
    return propertyValue;
  },

  /**
   * Test whether the element is displayed according to its display property.
   *
   * @param  elem {DOM element}
   * @return {boolean} whether or not the element is displayed
   */
  _isDisplayed: function(elem) {
    var display = this._getEffectiveStyle(elem, "display");
    if ("none" == display) return false;

    var visibility = this._getEffectiveStyle(elem, "visibility");
    if ("hidden" == visibility || "collapse" == visibility) return false;

    var opacity = this._getEffectiveStyle(elem, "opacity");
    if (0 == opacity) return false;

    if (elem.parentNode.style) {
        return this._isDisplayed(elem.parentNode);
    }
    return true;
  }
}
