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
 * The Original Code is FhcFormSaveOverlay.
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
 * Methods for saving data in textarea's.
 * 
 * Dependencies: FhcDbHandler.js, FhcPreferenceHandler.js
 */

const FhcFormSaveOverlay = {
  timer:                   null,
  maintenanceTimer:        null,
  eventQueue:              [],
  dbHandler:               null,
  prefHandler:             null,
  observerService:         null,
  preferenceListener:      null,
  exceptionlistListener:   null,
  
  //preferences
  backupEnabled: true,
  saveNewIfOlder: 0,
  saveNewIfLength: 0,
  deleteIfOlder: 0,
  exceptionType: "",
  exceptionList: "",
  saveAlways: false,
  saveEncrypted: false,
  
  //local cache
  hostCache: {host:"", hostEnabled:false},

  init: function() {
    this.dbHandler = new FhcDbHandler();
    this.prefHandler = new FhcPreferenceHandler();
    
    this._initPreferences();
    this._registerPreferenceListener();
    
    this._registerExceptionlistListener();
    
    this.observerService = Components.classes["@mozilla.org/observer-service;1"]
                          .getService(Components.interfaces.nsIObserverService);

    addEventListener("submit", function(e){FhcFormSaveOverlay.onSubmit(e)}, false);
    addEventListener("reset",  function(e){FhcFormSaveOverlay.onReset(e)}, false);
    addEventListener("keyup",  function(e){FhcFormSaveOverlay.onKeyup(e)}, false);
    
    this._initEventTimer();
    this._initMaintenanceTimer();
  },
  
  destroy: function() {
    this._unregisterPreferenceListener();
    this._unregisterExceptionlistListener();
    this.eventQueue = [];
    if (this.maintenanceTimer != null) this.maintenanceTimer.cancel();
    if (this.timer != null) this.timer.cancel();
    delete this.dbHandler;
  },


  //----------------------------------------------------------------------------
  // Event timers
  //----------------------------------------------------------------------------
  
  /**
   * Initialize the timer for handling events from the event queue.
   * Handle events from the event-queue every 5 seconds.
   */
  _initEventTimer: function() {
    var timerEvent = {
      observe: function(subject, topic, data) {
        FhcFormSaveOverlay.handleEvents();
      }
    }
    this.timer = Components.classes["@mozilla.org/timer;1"]
                 .createInstance(Components.interfaces.nsITimer);
    this.timer.init(timerEvent, 5*1000, 
                    Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
  },

  /**
   * Initialize the maintenance timer.
   * Dispatch a maintenance event every minute.
   */
  _initMaintenanceTimer: function() {
    var maintenanceEvent = {
      observe: function(subject, topic, data) {
        FhcFormSaveOverlay._dispatchMaintenanceEvent();
      }
    }
    this.maintenanceTimer = Components.classes["@mozilla.org/timer;1"]
                            .createInstance(Components.interfaces.nsITimer);
    this.maintenanceTimer.init(maintenanceEvent, 1*60*1000, 
                               Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
  },


  //----------------------------------------------------------------------------
  // Event listeners
  //----------------------------------------------------------------------------

  onSubmit: function(event) {
    if (!this._isSaveAllowed()) return;
    //dump("FhcFormSaveOverlay::Form submit?\n");
    var form = this._findForm(event.target);
    if (form && form.elements){
      var formElements = form.elements;
      var uri = form.ownerDocument.documentURIObject;
      //dump("form id: " + form.id + "\n");
      //dump("form uri: " + uri.spec + "\n");
      //dump("formElements #: " + formElements.length + "\n");
      
      var d = new Date();
      var now = d.getTime() * 1000;
      var formFormid = this._getId(form);
      var formHost = this._getHost(uri);
      
      // clear previous formhistory
      //this.dbHandler.deleteFormElements(formElement.host, formElement.formid);
      var formField, allFormElements = [];
      for (var i=0; i<formElements.length; i++) {
        formField = formElements[i];
        //dump("###field id=" + formField.id + " type=" + formField.type + "\n");
        switch(formField.type){
          case "number":
          case "range":
          case "color":
                allFormElements.push({
                  id: this._getId(formField),
                  name: (formField.name) ? formField.name : "",
                  type: formField.type,
                  selected: 1,
                  value: formField.value,
                  formid: formFormid,
                  host: formHost,
                  url: uri.spec,
                  saved: now
                });
                break;          
          case "radio":
          case "checkbox":
                //dump("field id=" + formField.id + " type=" + formField.type + " checked=" + formField.checked + "\n");
                allFormElements.push({
                  id: this._getId(formField),
                  name: (formField.name) ? formField.name : "",
                  type: formField.type,
                  selected: formField.checked,
                  value: null,
                  formid: formFormid,
                  host: formHost,
                  url: uri.spec,
                  saved: now
                });
                break;
          case "select":
          case "select-multiple":
          case "select-one":
                //dump("select field:\n");
                if (formField.options) {
                  var option;
                  for (var j=0; j<formField.options.length; j++) {
                    option = formField.options[j];
                    // option may contain attribute label and/or value, if both missing use the text-content
                    //dump("- option id=" + option.id + " value=" + option.value + " selected=" + option.selected + "\n");
                    allFormElements.push({
                      id: this._getId(formField),
                      name: option.value,
                      type: formField.type,
                      selected: option.selected,
                      value: null,
                      formid: formFormid,
                      host: formHost,
                      url: uri.spec,
                      saved: now
                    });
                  }
                }
                break;
         }
      }
      
      if (0 < allFormElements.length) {
        this.dbHandler.saveFormElements(allFormElements);
        allFormElements = [];
      }
    }
    //dump("FhcFormSaveOverlay::onSubmit done.\n");
  },

  _findForm: function(element) {
    var form = element;
    while (form.parentNode && form.localName != 'form') {
      form = form.parentNode;
    } 
    if (form && form.localName == 'form') {
      return form;
    }
    return null;
  },

  onReset: function(event) {
    if (!this._isSaveAllowed()) return;
    //dump("FhcFormSaveOverlay::Form reset?\n");
  },

  onKeyup: function(event) {
    if (!this._isSaveAllowed()) return;
    
    // only handle displayable chars
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

    var t = event.originalTarget;
    var n = t.nodeName.toLowerCase();
    if ("textarea" === n) {
      //var id = (t.id) ? t.id : t.name;
      //dump("textarea with id: " + id + "\n");
      this._contentChangedHandler("textarea", t);
    }
    else if ("html" === n) {
      //dump("keyup from html\n");
      var p = t.parentNode;
      if (p && "on" === p.designMode) {
        this._contentChangedHandler("html", p);
      }
    }
    else if ("body" === n || "div" === n) {
      // body of iframe
      //dump("keyup from body\n");
      var doc = t.ownerDocument;
      var e = doc.activeElement;
      if (("on" === doc.designMode) || this._isContentEditable(e)) {
        //dump("content is editable\n");
        this._contentChangedHandler("body" === n ? "iframe" : "div", e);
      }
    }
  },

  _contentChangedHandler: function(type, node) {
    var uri;
    var formid = "";
    var id = (node.id) ? node.id : ((node.name) ? node.name : "");
    var name = (node.name) ? node.name : ((node.id) ? node.id : "");
    switch(type) {
      case "textarea":
        uri = node.ownerDocument.documentURIObject;
        formid = this._getFormId(node);
        break;
      case "html":
        uri = node.documentURIObject;
        break;
      case "div":
      case "iframe":
        uri = node.ownerDocument.documentURIObject;
        break;
    }

    if (this._isHostEnabled(uri)) {
      // add to queue (if not already queued)
      this._dispatchContentEvent(name, type, id, formid, uri, node);
    }
  },
  
  /**
   * return false when: backup is disabled
   * OR in private browsing mode and saving not overridden.
   */
  _isSaveAllowed: function() {
    if (!this.backupEnabled) return false;
    if (!this.saveAlways && this._isPrivateBrowsing()) return false;
    return true;
  },

  /**
   * return false when host is blacklisted or not on whitelist.
   * @param uri {URI}
   */
  _isHostEnabled: function(uri) {
    var host = this._getHost(uri);
    
    //try to use cache first
    if (this.hostCache.host == host) {
      return this.hostCache.hostEnabled;
    }
    
    //not cached, check preferences/exceptionlist
    this.hostCache.host = host;
    
    var hasListedException;
    switch(this.exceptionType) {
      case "multilinenoexception":
           this.hostCache.hostEnabled = true;
           break;
      case "multilinewhitelist":
           hasListedException = this.dbHandler.hasMultilineException(host);
           this.hostCache.hostEnabled = hasListedException;
           break;
      case "multilineblacklist":
           hasListedException = this.dbHandler.hasMultilineException(host);
           this.hostCache.hostEnabled = !hasListedException;
           break;
      default:
           this.hostCache.hostEnabled = true;
    }

    return this.hostCache.hostEnabled;
  },


  //----------------------------------------------------------------------------
  // Event dispatching methods
  //----------------------------------------------------------------------------

  /**
   * Place a content-changed event on the queue.
   * 
   * @param name {String}
   *        the name of the field if present otherwise the id
   *        
   * @param type {String}
   *        the type of the field (textarea|html|iframe)
   *        
   * @param id {String}
   *        the id of the field if present otherwise the name
   *        
   * @param formid {String}
   *        the id of the parent form of the field
   *        
   * @param uri {nsIURI}
   *        the uri of the page
   *        
   * @param node {Node}
   *        the node object representing the field
   */
  _dispatchContentEvent: function(name, type, id, formid, uri, node) {
    var event = {
      eventType:  0,
      node:       node,
      type:       type,
      id:         id,
      name:       name,
      formid:     formid,
      url:        uri.spec,
      host:       this._getHost(uri),
    //firstsaved: null,
      lastsaved:  null,
      content:    null
    };
    if (!this._alreadyQueued(event)) {
      this.eventQueue.push(event);
    }
  },
  
  /**
   * Place a maintenance event on the queue.
   */
  _dispatchMaintenanceEvent: function() {
    var event = {
      eventType: 1,
      node:      0
    };
    if (!this._alreadyQueued(event)) {
      this.eventQueue.push(event);
    }
  },

  /**
   * Check wether the event is already placed on the queue.
   * 
   * @param event {Object}
   *        a content or maintenance event
   */
  _alreadyQueued: function(event) {
    var e;
    for (var it=0; it<this.eventQueue.length; it++) {
      e = this.eventQueue[it];
      if (e.eventType == event.eventType && e.node == event.node) {
        return true;
      }
    }
    return false;
  },


  //----------------------------------------------------------------------------
  // Event handling methods
  //----------------------------------------------------------------------------

  /**
   * handle all events in the event-queue.
   */
  handleEvents: function() {
    if (0 < this.eventQueue.length) {
      //dump("TimerEvent and queue not empty!\n");
      var event;
      for (var it=0; it<this.eventQueue.length; it++) {
        event = this.eventQueue[it];
        switch(event.eventType) {
          case 0: this._handleContentEvent(event);
                  break;
          case 1: this._handleMaintenanceEvent();
                  break;
        }
      }
      this.eventQueue = [];
      //dump("Finished processing queue\n");
    }
  },

  /**
   * Save the changed content to the database.
   */
  _handleContentEvent: function(event) {
    //dump("_handleContentEvent\n");
    var d = new Date();
    var now = d.getTime() * 1000;
    
    //event.firstsaved = ;
    event.lastsaved = now;
    event.content = this._getContent(event);
    
    if (event.content.length > 0)  {
      this.dbHandler.saveOrUpdateMultilineItem(event, this.saveNewIfOlder, this.saveNewIfLength);

      // notify observers
      this.observerService.notifyObservers(null, "multiline-store-changed", "");
    }
  },
  
  /**
   * Perform the maintenance task.
   */
  _handleMaintenanceEvent: function() {
    //dump("_handleMaintenanceEvent\n");
    var d = new Date();
    var now = d.getTime() * 1000;
    var treshold = now - (this.deleteIfOlder * 60 * 1000 * 1000);
    
    if (0 != this.deleteIfOlder) {
      if (0 < this.dbHandler.deleteMultilineItemsOlder(treshold)) {
        // notify observers
        this.observerService.notifyObservers(null, "multiline-store-changed", "");
      }
    }
  },


  //----------------------------------------------------------------------------
  // HTML Field/Form helper methods
  //----------------------------------------------------------------------------

  /**
   * Get the editor (multiline) content from a HTML element.
   * 
   * @param  event {Event}
   *         eventlistener-event
   * @return {String}
   *         the editor/multiline text being edited by a user
   */
  _getContent: function(event) {
    var theContent = "";
    try {
      switch(event.type) {
        case "textarea":
             theContent = event.node.value;
             break;
        case "html":
             theContent = event.node.body.innerHTML;
             break;
        case "div":
        case "iframe":
             theContent = event.node.innerHTML;
             break;
      }
    } catch(e) {
      // possible "can't access dead object" TypeError, DOM object destroyed
    }
    return theContent;
  },
  
  /**
   * Get the id (or name) of the parent form if any for the HTML element.
   * 
   * @param  element {HTML Element}
   * @return {String} id, name or empty string of the parent form element
   * 
   */
  _getFormId: function(element) {
    var insideForm = false;
    var parentElm = element;
    while(parentElm && !insideForm) {
      parentElm = parentElm.parentNode;
      insideForm = (parentElm && "FORM" == parentElm.tagName);
    }
    return (insideForm && parentElm) ? this._getId(parentElm) : "";
  },
  
  /**
   * Get the id of a HTML element, if id not present return the name.
   * If neither is present return an empty string.
   * 
   * @param  element {HTML Element}
   * @return {String} id, name or empty string
   */
  _getId: function(element) {
    return (element.id) ? element.id : ((element.name) ? element.name : "");
  },
  
  /**
   * Return the host of a URL (http://host:port/path).
   * 
   * @param  aURI {nsIURI}
   * @return {String} the host of strURL
   */
  _getHost: function(aURI) {
    if (aURI.schemeIs("file")) {
      return "localhost";
    } else {
      return aURI.host;
    }
  },
  
  /**
   * Get the effective contentEditable property of an element.
   *
   * @param  element {DOM element}
   * @return {boolean} wether content is editable "true" or not "false"
   */
  _isContentEditable: function(element) {
    if (element.contentEditable == undefined) {
        return false;
    }
    if ("inherit" != element.contentEditable) {
        return ("true" == element.contentEditable);
    }

    var doc = element.ownerDocument;
    var effectiveStyle = doc.defaultView.getComputedStyle(element, null);
    var propertyValue = effectiveStyle.getPropertyValue("contentEditable");
    if ("inherit" == propertyValue && element.parentNode.style) {
        return this._isContentEditable(element.parentNode);
    }
    return ("true" == propertyValue);
  },
  
  
  //----------------------------------------------------------------------------
  // Preference helper methods
  //----------------------------------------------------------------------------

  _initPreferences: function() {
    this.backupEnabled   = this.prefHandler.isMultilineBackupEnabled();
    this.saveNewIfOlder  = this.prefHandler.getMultilineSaveNewIfOlder();
    this.saveNewIfLength = this.prefHandler.getMultilineSaveNewIfLength();
    this.deleteIfOlder   = this.prefHandler.getMultilineDeleteIfOlder();
    this.exceptionType   = this.prefHandler.getMultilineException();
    this.saveAlways      = this.prefHandler.isMultilineSaveAlways();
    this.saveEncrypted   = this.prefHandler.isMultilineSaveEncrypted();
  },
  
  /**
   *  Register a preference listener to act upon multiline preference changes.
   */
  _registerPreferenceListener: function() {
    var thisHwc = this;
    this.preferenceListener = {
      branch: null,
      observe: function(subject, topic, data) {
        if ("nsPref:changed" == topic) {
          switch (data) {
            case "backupenabled":
                 thisHwc.backupEnabled = thisHwc.prefHandler.isMultilineBackupEnabled();
                 break;
            case "saveolder":
                 thisHwc.saveNewIfOlder = thisHwc.prefHandler.getMultilineSaveNewIfOlder();
                 break;
            case "savelength":
                 thisHwc.saveNewIfLength = thisHwc.prefHandler.getMultilineSaveNewIfLength();
                 break;
            case "deleteolder":
                 thisHwc.deleteIfOlder = thisHwc.prefHandler.getMultilineDeleteIfOlder();
                 break;
            case "exception":
                 thisHwc.exceptionType = thisHwc.prefHandler.getMultilineException();
                 // invalidate cache
                 thisHwc.hostCache.host = "";
                 break;
            case "savealways":
                 thisHwc.saveAlways = thisHwc.prefHandler.isMultilineSaveAlways();
                 break;
            case "saveencrypted":
                 thisHwc.saveEncrypted = thisHwc.prefHandler.isMultilineSaveEncrypted();
                 break;
          }
        }
      },
      register: function() {
        var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                            .getService(Components.interfaces.nsIPrefService);
        this.branch = prefService.getBranch("extensions.formhistory.multiline.");
        this.branch.QueryInterface(Components.interfaces.nsIPrefBranch);
        this.branch.addObserver("", this, false);
      },
      unregister: function() {
        if (this.branch) 
          this.branch.removeObserver("", this);
      }
    }
    this.preferenceListener.register();
  },
 
  /**
   * Unregister the preference listener.
   */
  _unregisterPreferenceListener: function() {
    if (this.preferenceListener) {
      this.preferenceListener.unregister();
      this.preferenceListener = null;
    }
  },

  /**
   * Register a listener to act upon multiline exceptionlist changes.
   */
  _registerExceptionlistListener: function() {
    this.exceptionlistListener = {
      observe: function(subject, topic, state) {
        // invalidate cache
        FhcFormSaveOverlay.hostCache.host = "";
      },
      register: function() {
        Components.classes["@mozilla.org/observer-service;1"]
                  .getService(Components.interfaces.nsIObserverService)
                  .addObserver(this, "multiline-exceptionlist-changed", false);
      },
      unregister: function() {
        Components.classes["@mozilla.org/observer-service;1"]
                  .getService(Components.interfaces.nsIObserverService)
                  .removeObserver(this, "multiline-exceptionlist-changed");
      }
    };
    this.exceptionlistListener.register();
  },
  
  /**
   * Unregister the Exceptionlist listener.
   */
  _unregisterExceptionlistListener: function() {
    this.exceptionlistListener.unregister();
  },


  //----------------------------------------------------------------------------
  // Private browsing helper methods
  //----------------------------------------------------------------------------

  /**
   * Determine whether or not the browser-window is in private browsing mode.
   *
   * @return {boolean} whether or not in private browsing mode.
   */
  _isPrivateBrowsing: function() {
    var loadContext = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                  .getInterface(Components.interfaces.nsIWebNavigation)
                  .QueryInterface(Components.interfaces.nsILoadContext);
    return loadContext.usePrivateBrowsing;
  }
};

addEventListener("load",
  function(e) {
    FhcFormSaveOverlay.init(e);
    removeEventListener("load", arguments.callee, false);
  },
  false
);

addEventListener("unload",
  function(e) {
    FhcFormSaveOverlay.destroy(e);
  },
  false
);
