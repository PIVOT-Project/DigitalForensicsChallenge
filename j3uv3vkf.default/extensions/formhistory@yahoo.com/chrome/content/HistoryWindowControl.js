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
 * The Original Code is HistoryWindowControl.
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
 * Form History Control
 *
 * Methods for the dialog HistoryWindowControl
 *
 * Dependencies:
 *   HistoryWindowControl.xul,
 *   HistoryTreeView.js, CleanupWindowControl.js,
 *   CleanupProtectView.js, MultilineWindowControl,
 *   FhcDbHandler.js, FhcUtil.js, FhcBundle.js,
 *   FhcPreferenceHandler.js, FhcDateHandler.js,
 *   FhcBrowsingListener, FhcShowDialog.js,
 *   FhcPredefinedRegexp.js
 */
const HistoryWindowControl = {
  treeView: null,
  countLabel: 0,
  selectCountLabel: "",
  bundle: null,
  dbHandler: null,
  dateHandler: null,
  preferences: null,
  preferenceListener: null,
  browserListener: null,
  curWindow: null,
  fieldFilter: {active:false, name:""},
  pageFilter: {active:false},
  hideLoginmanagedFields: true,
  fieldExclusionList: [],

  init: function() {
    //dump('\n\nFormhistory extension initializing...\n');
    // initialize
    this.bundle = new FhcBundle();
    this.preferences = new FhcPreferenceHandler();
    this.dbHandler = new FhcDbHandler();
    this.dateHandler = new FhcDateHandler(this.bundle);

    // Initialize tree-skin
    var treeElm = document.getElementById("formHistoryTree");
    this.preferences.setCustomTreeSkin(treeElm);

    // test formhistory db status, show anomalies
    if (!this.dbHandler.formhistoryDbReady()) {
      this.showNotificationBox("historywindow.notification.dbnotready", "warn");
    } else if (!this.dbHandler.databaseDirOkay()) {
      this.showNotificationBox("historywindow.notification.direrror", "error");
    } else if (FhcUtil.inPrivateBrowsingMode()) {
      this.showNotificationBox("historywindow.notification.privatebrowsing", "info");
    } else if (0 == this.dbHandler.getNoOfItems()) {
      this.showNotificationBox("historywindow.notification.dbempty", "info");
    }

    // get user preferences
    this.hideLoginmanagedFields = this.preferences.isHideLoginmanagedFields();
    FhcUtil.isCaseSensitive = this.preferences.isSearchCaseSensitive();
    if (this.preferences.isUseCustomDateTimeFormat()) {
      this.dateHandler.setCustomDateFormat(this.preferences.getCustomDateTimeFormat());
    }
    this.fieldExclusionList = this.preferences.getExclusions();

    // set initial case sensitivity
    this._updateSearchElements();

    // set initial advanced checkboxes
    this._toggleMatchExactCheckboxes();

    // initialize objects related to the cleanup part
    CleanupWindowControl.init(
      this.dbHandler, this.dateHandler, this.preferences, this.bundle);
    CleanupProtectView.init(
      this.dbHandler, this.dateHandler, this.bundle, this.preferences);

    // multiline history support
    MultilineWindowControl.init(
      this.dbHandler, this.dateHandler, this.preferences, this.bundle);
    this._hideOrShowMultilineTab();

    // initialize count label vars
    this.countLabel = document.getElementById("itemCount");
    this.selectCountLabel = document.getElementById("selectCount");

    // initialize tree vars
    var formTree = document.getElementById("formHistoryTree");
    this.treeView = new HistoryTreeView(this.dateHandler, this.preferences);
    formTree.view = this.treeView;

    // set callbackfunction to receive update from tree column editing
    this.treeView.setEditColumnCallBackFunction(this._editEntryCallback);

    // enable searchOnlyField checkbox if a focused text input field
    // is present in the main document
    var hasFocusedTextInput = false;
    if (window.opener) {
      this.curWindow = window.opener;
      var elem = this.curWindow.document.commandDispatcher.focusedElement;
      hasFocusedTextInput = FhcUtil.isInputTextElement(elem);
      document.getElementById("searchfieldonly").setAttribute("disabled", !hasFocusedTextInput);
    }

    // read and display data
    if (this.dbHandler.formhistoryDbReady()) {
      this._setupDataView();
    }
    
    // dialog opened with argument searchField or default-pagefilter-preference
    // is set to true
    var hasArguments = ("arguments" in window && window.arguments.length > 0 && window.arguments[0]);
    if (hasArguments && window.arguments[0].searchField) {
      // only display entries for the focused field
      document.getElementById("searchfieldonly").setAttribute("checked", hasFocusedTextInput);
      this.searchOnlyFieldChanged(hasFocusedTextInput);
    } else if (hasArguments && window.arguments[0].searchbarField) {
      // only display entries for the searchbar
      document.getElementById("searchfieldonly").setAttribute("checked", true);
      this.searchOnlyFieldChanged(true, "searchbar-history");
    } else if (hasArguments && window.arguments[0].multilineTab) {
      // start with multilinetab selected
      if (!document.getElementById("editorHistoryTab").hidden) {
        document.getElementById('historyWindowTabs').selectedIndex = 2;
        document.getElementById("displayhostonly").setAttribute("checked", true);
        MultilineWindowControl.filterChanged();
      }
    } else if (this.preferences.isDefaultSearchCurrentPageChecked()) {
      // apply pagefilter
      document.getElementById("searchpageonly").setAttribute("checked", true);
      this.searchOnlyPageChanged(true);
    }

    // listen to preference updates
    this._registerPrefListener();

    // listen to session purge event (may delete formhistory items)
    this._registerBrowserListener();

    //dump('Formhistory extension initialized.\n');
    return true;
  },

  /**
   * Extension close, cleanup.
   */
  destroy: function() {
    CleanupWindowControl.destroy();
    CleanupProtectView.destroy();
    MultilineWindowControl.destroy();
    this._unregisterPrefListener();
    this._unregisterBrowserListener();
    delete this.treeView;
    delete this.dbHandler;
    delete this.dateHandler;
    delete this.bundle;
    delete this.preferences;
    //dump('Formhistory extension destroyed.\n');
    return true;
  },

  /**
   * Activate an already open window, process new parameters.
   */
  initAlreadyOpen: function(parameters) {
    // enable searchOnlyField checkbox if a focused text input field
    // is present in the main document
    var hasFocusedInput = false;
    if (parameters && parameters.opener) {
      this.curWindow = parameters.opener;
      var elem = this.curWindow.document.commandDispatcher.focusedElement;
      hasFocusedInput = FhcUtil.isInputTextElement(elem);
      document.getElementById("searchfieldonly").setAttribute("disabled", !hasFocusedInput);
    }

    // dialog opened with argument searchField
    if (parameters && parameters.searchField) {
      // only display entries for the focused field
      document.getElementById("searchfieldonly").setAttribute("checked", hasFocusedInput);
      this.searchOnlyFieldChanged(hasFocusedInput);
    } else if (parameters && parameters.searchbarField) {
      // only display entries for the searchbar
      document.getElementById("searchfieldonly").setAttribute("checked", true);
      this.searchOnlyFieldChanged(true, "searchbar-history");
    } else if (parameters && parameters.multilineTab) {
      // start with multilinetab selected
      if (!document.getElementById("editorHistoryTab").hidden) {
        document.getElementById('historyWindowTabs').selectedIndex = 2;
        document.getElementById("displayhostonly").setAttribute("checked", true);
        MultilineWindowControl.filterChanged();
      }
    } 
  },


  /**
   * Show the notification box with a message looked-up by a bundle-key.
   * 
   * @param notificationKey {String}
   *        the key to lookup mesaages from the bundle.
   *
   * @param type {String}
   *        type of the notification [info|warn|error]
   */
  showNotificationBox: function(notificationKey, type) {
    document.getElementById("notification-icon-info").hidden = ("info" != type);
    document.getElementById("notification-icon-warn").hidden = ("warn" != type);
    document.getElementById("notification-icon-error").hidden = ("error" != type);

    var notificationMsg = this.bundle.getString(notificationKey);
    var helpMsgTitle = this.bundle.getString("historywindow.notification." + type) + ":";
    var helpMsg1 = this.bundle.getString(notificationKey + ".explain1");
    var helpMsg2 = this.bundle.getString(notificationKey + ".explain2");

    document.getElementById("notification-text").value = notificationMsg;
    document.getElementById("notification-helptitle").value = helpMsgTitle;
    document.getElementById("notification-help1").value = helpMsg1;
    document.getElementById("notification-help2").value = helpMsg2;

    document.getElementById("notification-box").collapsed = false;
  },

  /**
   * hide the notification box.
   */
  hideNotificationBox: function() {
    this.hideNotificationHelp()
    document.getElementById("notification-box").collapsed = true;
  },

  /**
   * Show additional information for the currently displayed notification.
   */
  showNotificationHelp: function() {
    var toolTip = document.getElementById("notification-tip");
    if ("open" == toolTip.state) {
      toolTip.hidePopup();
    } else {
      var anchorElem = document.getElementById("notification-box");
      toolTip.openPopup(anchorElem, "after_pointer", 0, 0, false, false);
    }
  },

  /**
   * Show additional information for the currently displayed notification.
   */
  hideNotificationHelp: function() {
    var toolTip = document.getElementById("notification-tip");
    toolTip.hidePopup();
  },

  /**
   * Repopulate the view from scratch
   */
  reloadView: function() {
    this._repopulateView();
    MultilineWindowControl.repopulateView();
  },

  /**
   * Toggle between simple and advanced search
   */
  toggleSearch: function() {
    var simpleSearchBox = document.getElementById('simple-search');
    var advancedSearchBox = document.getElementById('advanced-search');

    simpleSearchBox.hidden = !simpleSearchBox.hidden;
    advancedSearchBox.hidden = !advancedSearchBox.hidden;

    if (!advancedSearchBox.hidden) {
      // for persistence to work (absence of attr can not be persisted)
      advancedSearchBox.setAttribute("hidden", "false");

      // clear simple search criteria
      var simpleSearchValue = document.getElementById("filterText").value;
      if ("" != document.getElementById("filterText").value) {
        this.filterChanged(null);
      }

      // copy simple search criteria to advanced criteria
      if ("" != simpleSearchValue) {
        document.getElementById('adv_fieldvalue').value = simpleSearchValue;
        document.getElementById('adv_fieldvalue_regexp').checked = false;
      }
      this.advancedFilterChanged();

    } else {
      // for persistence to work (absence of attr can not be persisted)
      simpleSearchBox.setAttribute("hidden", "false");

      // simple searchmode: disable custom filter
      this.treeView.setCustomFilter2(null);

      // copy advanced search criteria to simple criteria (unless its a regexp)
      var advancedSearchValue = document.getElementById("adv_fieldvalue").value;
      var simpleSearchElem = document.getElementById('filterText');
      var isRegExp = document.getElementById('adv_fieldvalue_regexp').checked;
      if ("" != advancedSearchValue && !isRegExp) {
        simpleSearchElem.value = advancedSearchValue;
        this.filterChanged(simpleSearchElem);
      } else {
        this.filterChanged(null);
      }
    }
  },

  /**
   * Called whenever the user makes changes to the advanced filter criteria.
   */
  advancedFilterChanged: function() {
    window.setCursor("wait"); // might be slow

    // apply filter
    this.treeView.setCustomFilter2(this._filterAdvancedSearchEntries);

    // handle gui
    this._toggleAdvancedSearchClearButton();
    this._toggleMatchExactCheckboxes();
    this._setRadioRegexpList();
    this._updateCountLabel();

    window.setCursor("auto");
  },

  /**
   * Clear the advanced filter criteria.
   */
  advancedFilterClear: function() {
    // clear all filter values
    var ids = this._getAllAdvancedSearchCriteriaIds();
    var elem;
    for (var it=0; it < ids.length; it++) {
      elem = document.getElementById(ids[it]);
      elem.value = "";
      // clear custom date/time attributes (locale independent)
      if (elem.hasAttribute("milliseconds")) {
        elem.removeAttribute("milliseconds");
      }
    }

    // apply changes to the filter
    this.advancedFilterChanged();
  },

  /**
   * Popup/Hide the regexp menu.
   *
   * @param textboxId {String}
   *        the id of the textbox initiating this method which is used to
   *        determine the regexp-menu to display.
   */
  showRegExpMenu: function(textboxId) {
    var txtBoxElem = document.getElementById(textboxId);
    var regexpMenu;
    switch(textboxId) {
      case "adv_fieldname":
           regexpMenu = document.getElementById("regexp-namelist-menu");
           break;
      case "adv_fieldvalue":
           regexpMenu = document.getElementById("regexp-list-menu");
           break;
    }
    if ("open" == regexpMenu.state) {
      regexpMenu.hidePopup();

    } else {
      // read the regexp list from the database
      var regexpData = this.dbHandler.getAllRegexp();
      if (null == regexpData) {
        // major problem with Cleanup DB!
        dump('\nMajor problem with Cleanup DB! (folder and/or file permissions?)\n');
        regexpData = [];
      }

      // if (initially) empty, populate db with predefined values
      if (0 == regexpData.length) {
        var predefHandler = new FhcPredefinedRegexp(this.dbHandler, this.bundle);
        predefHandler.addPredefinedRegexpToDb();
        //delete predefHandler;
        // read again
        regexpData = this.dbHandler.getAllRegexp();
      }

      // check if regexp menu needs rebuild
      var keyStore = "FhcGlobalRegexpListDirty";
      var ref = Application.storage.get(keyStore, "");
      if ("okay" != ref || regexpMenu.childNodes.length <= 4) {
        // menu never built before ("") or dirty ("dirty"), rebuild both menus
        this._rebuildRegexpMenu(regexpData, "N", document.getElementById("regexp-namelist-menu"));
        this._rebuildRegexpMenu(regexpData, "V", document.getElementById("regexp-list-menu"));

        Application.storage.set(keyStore, "okay");
      }
      //delete regexpData;

      regexpMenu.openPopup(txtBoxElem, "after_end", 0, 0, false, false);
      regexpMenu.setAttribute("destinationid", textboxId);
    }
  },

  /**
   * Rebuild the regular expressions menu.
   *
   * @param regexpData {regexp Array}
   *        the regexp data to be added to the menu
   *
   * @param useFor {String}
   *        the type of menuitems ("N" for names, "V" for values)
   *
   * @param regexpMenu {Menu Element}
   *        the menu where regexp menuitems should be added to
   *
   */
  _rebuildRegexpMenu: function(regexpData, useFor, regexpMenu) {
    // delete old menu items (items without an id) from the list
    var nodes = regexpMenu.childNodes;
    for (var nn=nodes.length-1; nn>=0; nn--) {
      if (!nodes[nn].id) {
        regexpMenu.removeChild(nodes[nn]);
      }
    }

    // insert before the last two items (manage-menuitem and menu-separator)
    var insertPoint = regexpMenu.childNodes[regexpMenu.childNodes.length-2];

    // add new menu items to the list
    var menuItem, menus, catMenu;
    for (var it=regexpData.length-1; it>=0; it--) {
      if (useFor == regexpData[it].useFor || "B" == regexpData[it].useFor) {
        menuItem = FhcUtil.createMenuItem(regexpData[it].description, regexpData[it].regexp);
        menuItem.setAttribute("caseSens", regexpData[it].caseSens);
        menuItem.setAttribute("autocheck", "false");
        menuItem.setAttribute("type", "checkbox");
        menuItem.addEventListener("command", function(){var _this = this;HistoryWindowControl.onSelectRegExp(_this)}, false);

        if ("" != regexpData[it].category) {
          menus = regexpMenu.getElementsByTagName("menu");
          catMenu = null;
          for (var ii=0; ii<menus.length && !catMenu; ii++) {
            if (menus[ii].getAttribute("label") == regexpData[it].category) {
              catMenu = menus[ii];
            }
          }
          if (null == catMenu) {
            catMenu = FhcUtil.createMenu(regexpData[it].category);
            catMenu.setAttribute("class", "menu-iconic fh_submenu");
            regexpMenu.insertBefore(catMenu, insertPoint);
            insertPoint = catMenu;
          }
          catMenu.firstChild.insertBefore(menuItem, catMenu.firstChild.firstChild);
        } else {
          regexpMenu.insertBefore(menuItem, insertPoint);
          insertPoint = menuItem;
        }
      }
    }
  },

  /**
   * Checkmark the chosen regexp in the menu, set the new regexp and activate
   * the regexp filter.
   *
   * @param regexMenuItem {menuitem}
   *        the selected menuitem holding the new regular expression.
   */
  onSelectRegExp: function(regexMenuItem) {
    var parentMenu = FhcUtil.getMenuItemRootPopup(regexMenuItem);
    var destinationId = parentMenu.getAttribute("destinationid");
    var destTextbox = document.getElementById(destinationId);

    // indicate (by setting a checkmark) the chosen menuitem
    this._clearRadioRegexpList(parentMenu);
    regexMenuItem.setAttribute("checked", "true");

    // set the regexp
    destTextbox.value = regexMenuItem.value;

    // set the regexp/case checkbox
    document.getElementById(destinationId + "_regexp").checked = true;
    document.getElementById(destinationId + "_case").checked =
                        "1" == regexMenuItem.getAttribute("caseSens");

    // apply the advanced filter
    HistoryWindowControl.advancedFilterChanged();
  },

  /**
   * Select another tabpanel.
   * 
   * @param newIndex {integer}
   *        the index of the selected tab.
   */
  onSelectTab: function(newIndex) {
    if (newIndex==0 ) {
      // switched to formhistory while coming from the cleanup tabpanel
      if (document.getElementById("searchcleanuponly").checked) {
        // cleanup options may have changed, re-apply filter;
        this.searchOnlyCleanupChanged(true);
      }
    }

    // Either show the history-menu-items or the cleanup-menu-items
    var editPopupMenu = document.getElementById('edit-popup');
    var menuItems = editPopupMenu.childNodes;
    var id7;
    for(var ii=0; ii<menuItems.length; ii++) {
      id7 = menuItems.item(ii).id.substring(0,7);
      if (id7 == 'mnbarFh') {
        menuItems.item(ii).hidden = (0 != newIndex);
      } else if (id7 == 'mnbarCu') {
        menuItems.item(ii).hidden = (1 != newIndex);
      } else if (id7 == 'mnbarMl') {
        menuItems.item(ii).hidden = (2 != newIndex);
      }
    }
  },

  // Right-click popup contextmenu activation from FormHistoryControl Dialog
  menuPopup: function(event) {
    var selected = this.treeView.getSelected();
    document.getElementById("mnEdit").setAttribute("disabled", (0 == selected.length));
    document.getElementById("mnDelete").setAttribute("disabled", 0 == selected.length);
    document.getElementById("mnDeleteName").setAttribute("disabled", 1 != selected.length);
    document.getElementById("mnDeleteValue").setAttribute("disabled", 1 != selected.length);
    document.getElementById("mnAddCleanup").setAttribute("disabled", 0 == selected.length);
    document.getElementById("mnAddProtect").setAttribute("disabled", 0 == selected.length);
    return true;
  },
  
  // Menubar activated from FormHistoryControl Dialog (onpopupshowing)
  menubarPopup: function(event) {
    var selected = this.treeView.getSelected();
    document.getElementById("mnbarFhEdit").setAttribute("disabled", (1 != selected.length));
    document.getElementById("mnbarFhDelete").setAttribute("disabled", 0 == selected.length);
    document.getElementById("mnbarFhDeleteName").setAttribute("disabled", 1 != selected.length);
    document.getElementById("mnbarFhDeleteValue").setAttribute("disabled", 1 != selected.length);
    document.getElementById("mnbarFhAddCleanup").setAttribute("disabled", 0 == selected.length);
    document.getElementById("mnbarFhAddProtect").setAttribute("disabled", 0 == selected.length);

    var tabs = document.getElementById('historyWindowTabs');
    switch(tabs.selectedIndex) {
      case 0:
        // this menubarPopup()
        break;
      case 1:
        var cleanupTabs = document.getElementById('historyWindowCleanupTabs');
        switch (cleanupTabs.selectedIndex) {
          case 0:
               CleanupWindowControl.menubarPopup(event);
               break;
          case 1:
               CleanupProtectView.menubarPopup(event);
               break;
        }
      case 2:
        MultilineWindowControl.menubarPopup(event);
        break;
    }

    return true;
  },

  // Edit action activated by keypress, dispatch to correct tabpanel
  editKeyAction: function(doAction) {
    var tabs = document.getElementById('historyWindowTabs');
    switch(tabs.selectedIndex) {
      case 0:
        this.editAction(doAction);
        break;
      case 1:
        var cleanupTabs = document.getElementById('historyWindowCleanupTabs');
        switch (cleanupTabs.selectedIndex) {
          case 0:
               CleanupWindowControl.editAction(doAction);
               break;
          case 1:
               CleanupProtectView.editAction(doAction);
               break;
        }
        break;
      case 2:
        MultilineWindowControl.editAction(doAction);
        break;
    }
  },

  // Popup menu-item selected
  editAction: function(doAction) {
    var selected = this.treeView.getSelected();
    if (doAction == "Insert") {
      this._addEntry();
    } else if (selected.length > 0) {
      switch(doAction) {
        case "Edit":
          this._editEntry(selected);
          break;
        case "Delete":
          this._removeEntries(selected);
          break;
        case "DeleteName":
          this._removeAllWithName(selected[0].name);
          break;
        case "DeleteValue":
          this._removeAllWithValue(selected[0].value);
          break;
      }
    }
  },

  // Enter a date and time for a textbox via a dialog
  enterDateTime: function(evt, textboxId) {
    // assuming the textbox is of type "search", if user clicked inside the
    // right-hand side when a value was present he probably clicked
    // the "clear value" icon
    if (evt && ("click" == evt.type)) {
      if ("textbox-search-clear" == evt.originalTarget.className) {
        this._clearDateTime(textboxId);
        return;
      }
    }

    var elmTextbox = document.getElementById(textboxId);
    var oldDateMilSec = elmTextbox.getAttribute("milliseconds");

    // if user got here by keypress, delete the character just entered
    var keyPressed = "";
    if (1 == elmTextbox.value.length) {
      keyPressed = elmTextbox.value;
      elmTextbox.value = "";
    }

    // show the date/time dialog with current date/time as default
    var params = {
          inn: {date: oldDateMilSec, key: keyPressed},
          out: null
        };
    FhcShowDialog.doShowFhcDateTime(params);

    // get the newly entered date/time value
    if (params.out) {
      var newDateMilSec = params.out.date;
      elmTextbox.value = this.dateHandler.toDateString(1000 * newDateMilSec);
      elmTextbox.setAttribute("milliseconds", newDateMilSec);
    }
    this.advancedFilterChanged();
  },

  // Insert a new entry (add button)
  insertEntry: function() {
    // test if tree has the focus
    var treeHasFocus = this._isTreeFocused();

    this._addEntry();

    // restore focus
    this._focusTree(treeHasFocus);
  },
  
  // Edit an existing entry
  editEntry: function() {
    // test if tree has the focus
    var treeHasFocus = this._isTreeFocused();

    var selected = this.treeView.getSelected();
    this._editEntry(selected);

    // restore focus
    this._focusTree(treeHasFocus);
  },
  
  // Remove selected entries (remove button)
  removeSelected: function() {
    // test if tree has the focus
    var treeHasFocus = this._isTreeFocused();

    var selected = this.treeView.getSelected();
    this._removeEntries(selected);

    // restore focus
    this._focusTree(treeHasFocus);
  },
  
  // Remove all(!) entries (remove all button)
  removeAll: function() {
    // Clone the data array so we can pass a copy
    var allEntries = this.treeView.data.concat();
    this._removeAll(allEntries);
  },

  // selectAll action activated by keypress, dispatch to correct tabpanel
  selectAllKey: function() {
    var tabs = document.getElementById('historyWindowTabs');
    switch(tabs.selectedIndex) {
      case 0:
        this.selectAll();
        break;
      case 1:
        var cleanupTabs = document.getElementById('historyWindowCleanupTabs');
        switch (cleanupTabs.selectedIndex) {
          case 0:
               CleanupWindowControl.selectAll();
               break;
          case 1:
               CleanupProtectView.selectAll();
               break;
        }
        break;
      case 2:
        MultilineWindowControl.selectAll();
        break;
    }
  },

  // Select all entries
  selectAll: function() {
    this.treeView.selectAll();
  },
  
  // selectNone action activated by keypress, dispatch to correct tabpanel
  selectNoneKey: function() {
    var tabs = document.getElementById('historyWindowTabs');
    switch(tabs.selectedIndex) {
      case 0:
        this.selectNone();
        break;
      case 1:
        var cleanupTabs = document.getElementById('historyWindowCleanupTabs');
        switch (cleanupTabs.selectedIndex) {
          case 0:
               CleanupWindowControl.selectNone();
               break;
          case 1:
               CleanupProtectView.selectNone();
               break;
        }
        break;
      case 2:
        MultilineWindowControl.selectNone();
        break;
    }
  },

  // Deselect all entries
  selectNone: function() {
    this.treeView.selectNone();
  },
  
  // selectInvert action activated by keypress, dispatch to correct tabpanel
  selectInvertKey: function() {
    var tabs = document.getElementById('historyWindowTabs');
    switch(tabs.selectedIndex) {
      case 0:
        this.selectInvert();
        break;
      case 1:
        // not implemented
        // CleanupWindowControl.selectInvert();
        break;
      case 2:
        // not implemented
        // MultilineWindowControl.selectInvert();
        break;
    }
  },

  // Invert selection of entries
  selectInvert: function() {
    // can be slow
    window.setCursor("wait");
    this.treeView.selectInvert();
    window.setCursor("auto");
  },
  
  // Add current selected item as cleanup criteria
  addToCleanup: function() {
    var selected = this.treeView.getSelected();
    if (selected.length == 1) {
      this._selectTab(1);
      this._selectCleanupTab(0);
      if (!CleanupWindowControl._addCriteria(selected)) {
        this._selectTab(0);
      }
    } else {
      CleanupWindowControl._addMultipleCriteria(selected);
    }
  },

  // Add current selected item as protect criteria
  addToProtect: function() {
    var selected = this.treeView.getSelected();
    if (selected.length == 1) {
      this._selectTab(1);
      this._selectCleanupTab(1);
      if (!CleanupProtectView._addCriteria(selected)) {
        this._selectTab(0);
      }
    } else {
      CleanupProtectView._addMultipleCriteria(selected);
    }
  },

  // Tree row selected
  treeSelect: function(event) {
    var selectCount = this.treeView.getSelectCount();
    
    // enable remove-button only when at leat 1 item is selected
    var btnRemove = document.getElementById("removeSelected");
    btnRemove.setAttribute("disabled", 0 == selectCount);
    
    // enable edit-button only when 1 item is selected
    var btnedit = document.getElementById("editEntry");
    btnedit.setAttribute("disabled", 1 != selectCount);
    
    // enable removeall/selectall-button only when at leat 1 item is present
    var btnRemoveAll = document.getElementById("removeAll");
    btnRemoveAll.setAttribute("disabled", 0 == this.treeView.rowCount);

    // show nr of selected entries
    this._updateSelectCountLabel(selectCount);
  },
  
  // Doubleclick on treeitem == edit item
  treeDblclick: function(event) {
    var selected = this.treeView.getSelected();

    var idCol = "";
    var editCol = document.getElementById("formHistoryTree").editingColumn;
    if (editCol != null) {
        idCol = editCol.id;
    }
    if (idCol!="nameCol" && idCol!="valueCol" && idCol!="timesusedCol") {
      this._editEntry(selected);
    }
  },

  // clicked on treecell
  treeClick: function(event) {
    // no action on right-click (context-menu)
    if (2 != event.button) {
      var tree = document.getElementById("formHistoryTree");
      var row = {}, col = {}, child = {};
      tree.treeBoxObject.getCellAt(event.clientX, event.clientY, row, col, child);
      if (col.value && "urlCol" == col.value.id) {
        var url = tree.view.getCellText(row.value, col.value);
        if (url) HistoryWindowControl.onUrlTreeCellClicked(url, event);
      }
    }
  },

  // clicked on url in treecell, popup a link-menu for opening an URL in the
  // browser or just copy the link location.
  onUrlTreeCellClicked: function(url, event) {
    var urlMenu = document.getElementById("open-url-menu");
    
    if ("open" == urlMenu.state) {
      urlMenu.hidePopup();
    }
    else {
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

      urlMenu.openPopup(null, "after_pointer", event.clientX, event.clientY, false, false);
    }
  },

  // user clicked open-url-menu item
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
  },

  // Sort column (toggle if already sorted)
  sort: function(treeColumn) {
    this.treeView.sortColumn(treeColumn, true);
  },

  // Filtertext changed, apply new filter
  filterChanged: function(domObject) {
    if (!domObject) {
      domObject = document.getElementById("filterText");
      domObject.value = "";
    }
    this.treeView.applyFilter(domObject.value);
    this._updateCountLabel();

    // enable removeall-button only when at leat 1 item is present
    var btnRemoveAll = document.getElementById("removeAll");
    btnRemoveAll.setAttribute("disabled", 0 == this.treeView.rowCount);
  },

  // Filter checkbox matchCase changed
  filterMatchCaseChanged: function(isCaseSensitive) {
    // Adjust preferences
    this.preferences.setSearchCaseSensitive(isCaseSensitive);
  },

  // Search only fieldnames matching the current text input field
  searchOnlyFieldChanged: function(searchOnlyInField, optionalFieldName) {
    var textInputNames = null;
    var fieldValue;
    window.setCursor("wait"); // might be slow

    this.fieldFilter.active = searchOnlyInField;
    this.fieldFilter.name= "";

    // searchfield and searchpage are mutually exclusive, uncheck the other
    document.getElementById("searchpageonly").setAttribute("checked", false);
    this.pageFilter.active = false;

    if (searchOnlyInField) {
      textInputNames = [];

      if (optionalFieldName) {
        // known fieldname (searchbar-history)
        var searchField = this.curWindow.document.commandDispatcher.focusedElement;
        fieldValue = searchField.value;
        textInputNames.push(optionalFieldName);
      }
      else {
        var inputField = this.curWindow.document.commandDispatcher.focusedElement;
        var isFocusedInput = FhcUtil.isInputTextElement(inputField);
        if (isFocusedInput) {
          var fieldname = (inputField.name && inputField.name.length > 0) ? inputField.name : inputField.id;

          // this is true for firefox on win platform
          if (fieldname == "" && "html:input" == inputField.nodeName) {
            fieldname = "searchbar-history";
          }

          var showField = true;
          if (this.hideLoginmanagedFields) {
            showField = !FhcUtil.isInputInLoginManagedForm(this.curWindow.getBrowser().contentDocument, inputField);
          }

          if (showField) {
            fieldValue = inputField.value;
            textInputNames.push(fieldname);

            // store fieldname for later use
            this.fieldFilter.name = fieldname;
          }
        }
      }
    }

    // apply filter
    this.treeView.setFieldnameFilter(textInputNames);
    this._updateCountLabel();

    // if field contains a value, and nothing has been selected already
    // then try to select the entry/entries with the fieldvalue
    if (searchOnlyInField && fieldValue && fieldValue.length > 0) {
      if (this.treeView.getSelectCount() == 0) {
        this.treeView.selectEntriesByValue(fieldValue);
      }
    }
    window.setCursor("auto");
  },

  // Search only in page activated/deactivated
  searchOnlyPageChanged: function(searchOnlyInPage) {
    var textInputNames = null;
    window.setCursor("wait"); // might be slow

    // searchfield and searchpage are mutually exclusive, uncheck the other
    document.getElementById("searchfieldonly").setAttribute("checked", false);
    this.fieldFilter.active = false;
    this.pageFilter.active = searchOnlyInPage;

    if (searchOnlyInPage) {
      textInputNames = [];
      
      var mainDocument = FhcUtil.getMainDocument(this.curWindow);
    
      // search document (including children!) for all input text elements
      var inputTags = FhcUtil.getInputTextNames(mainDocument);
    
      // get formfields managed by the loginmanager
      var loginFields = [];
      if (this.hideLoginmanagedFields) {
        loginFields = FhcUtil.getFormLoginManagedFields(mainDocument);
      }

      // get the textinput names (exclude duplicates, exclude loginmanaged if applicable)
      textInputNames = [];
      for (var ii=0; ii < inputTags.length; ii++) {
        // exclude fields managed by the loginmanager
        if (!FhcUtil.arrayContainsString(loginFields, inputTags[ii])
               && !FhcUtil.arrayContainsString(textInputNames, inputTags[ii])) {
          textInputNames.push(inputTags[ii]);
        }
      }
    }
    // apply filter
    this.treeView.setFieldnameFilter(textInputNames);
    this._updateCountLabel();

    window.setCursor("auto");
  },

  // Search only in cleanup-entries activated/deactivated
  searchOnlyCleanupChanged: function(searchOnlyCleanup) {
    window.setCursor("wait"); // might be slow

    // apply filter
    if (searchOnlyCleanup) {
      this.treeView.setCustomFilter(CleanupWindowControl.filterMatchingEntries);
    } else {
      this.treeView.setCustomFilter(null);
    }
    this._updateCountLabel();

    window.setCursor("auto");
  },

  // Export all data to a user specified file
  exportActionAll: function() {
    //dump('exportAction!\n');
    var selectedHist = 0 < this.treeView.getSelectCount();
    var filteredHist = this.treeView.isDataFiltered() && (0 < this.treeView.rowCount);
    
    var selectedMulti = 0 < MultilineWindowControl.getSelectCount();
    var filteredMulti = MultilineWindowControl.isDataFiltered();
    
    var params = {
          inn: {haveSelectedHist: selectedHist,
                haveFilteredHist: filteredHist,
                haveSelectedMulti: selectedMulti,
                haveFilteredMulti: filteredMulti
               },
          out: null
        };
    FhcShowDialog.doShowFhcExport(params);
    
    if (params.out) {
      var hist  = [];
      var mult  = [];
      var exportMutCfg = params.out.exportMultiCfg;
      var exportCusCfg = params.out.exportCustSaveCfg;
      var exportClean  = params.out.exportCleanupCfg;
      var exportKeys   = params.out.exportKeyBindings;
      var exportRegexp = params.out.exportRegexp;
      if (params.out.exportHistory) {
        switch (params.out.exportHistoryWhat) {
            case "all":hist = this.treeView.getAll();break;
            case "selected":hist = this.treeView.getSelected();break;
            case "search":hist = this.treeView.getAllDisplayed();break;
        }
      }
      if (params.out.exportMultiline) {
        switch (params.out.exportMultilineWhat) {
            case "all":mult = MultilineWindowControl.getAll();break;
            case "selected":mult = MultilineWindowControl.getSelected();break;
            case "search":mult = MultilineWindowControl.getAllDisplayed();break;
        }
      }
      
      var exportOptions = {
        entries:           hist,
        multilines:        mult,
        exportMultiCfg:    exportMutCfg,
        exportCustSaveCfg: exportCusCfg,
        exportClean:       exportClean,
        exportKeys:        exportKeys,
        exportRegexp:      exportRegexp
      };
      
      FhcUtil.exportXMLdata(
        this.bundle.getString("historywindow.prompt.exportdialog.title"),
        exportOptions,
        this.preferences,
        this.dbHandler,
        this.dateHandler);
    }
  },

  // Import History-data from file, only add new entries
  importAction: function() {
    //dump('importAction!\n');
    var data = FhcUtil.importXMLdata(
          this.bundle.getString("historywindow.prompt.importdialog.title"),
          this.preferences,
          this.dateHandler);
          
    if (data == null) {
      return;
    }
    
    var multilineCfgItems = 0;
    if (data.multilineCfg != null) {
      for(var property1 in data.multilineCfg) {
        multilineCfgItems++;
      }
      // exceptionlist is container with sub-properties
      multilineCfgItems--;
      multilineCfgItems += data.multilineCfg.exceptionlist.length;
    }
    
    var custsaveCfgItems = 0;
    if (data.custSaveCfg != null) {
      for(var property2 in data.custSaveCfg) {
        custsaveCfgItems++;
      }
      // exceptionlist is container with sub-properties
      custsaveCfgItems--;
      custsaveCfgItems += data.custSaveCfg.exceptionlist.length;
    }    
    
    var params = {
          inn: {history:   data.entries.length,
                multiline: data.multiline.length,
                multicfg:  multilineCfgItems,
                custsavcfg:custsaveCfgItems,
                cleanup:   data.protect.length + data.cleanup.length,
                keys:      data.keys.length,
                regexp:    data.regexp.length
               },
          out: null
        };
    FhcShowDialog.doShowFhcImport(params);
    
    if (params.out) {
      
      window.setCursor("wait"); // could be slow
      try {
        var hiResult = null;
        var mlResult = null;
        var mcResult = null;
        var exResult = null;
        var cxResult = null;
        var csResult = null;
        var clResult = null;
        var reResult = null;
        var keResult = null;
        
        if (params.out.importHistory) {
          hiResult = this._importAction(data.entries);
        }

        if (params.out.importMultiline) {
          mlResult = MultilineWindowControl.importAction(data.multiline);
        }

        if (params.out.importMulticfg) {
          var mlPrefs = data.multilineCfg;
          var count = 0;
          if (mlPrefs.backupEnabled != null)   {count++;this.preferences.setMultilineBackupEnabled(  "true" == mlPrefs.backupEnabled);}
          if (mlPrefs.saveNewIfOlder != null)  {count++;this.preferences.setMultilineSaveNewIfOlder( mlPrefs.saveNewIfOlder);}
          if (mlPrefs.saveNewIfLength != null) {count++;this.preferences.setMultilineSaveNewIfLength(mlPrefs.saveNewIfLength);}
          if (mlPrefs.deleteIfOlder != null)   {count++;this.preferences.setMultilineDeleteIfOlder(  mlPrefs.deleteIfOlder);}
          if (mlPrefs.exception != null)       {count++;this.preferences.setMultilineException(      mlPrefs.exception);}
          if (mlPrefs.saveAlways != null)      {count++;this.preferences.setMultilineSaveAlways(     "true" == mlPrefs.saveAlways);}
          if (mlPrefs.saveEncrypted != null)   {count++;this.preferences.setMultilineSaveEncrypted(  "true" == mlPrefs.saveEncrypted);}
          if (mlPrefs.exceptionlist != null) {
            exResult = this._importExceptions(mlPrefs.exceptionlist);
          }
          mcResult = {
            noTotal:   count,
            noAdded:   count,
            noSkipped: "",
            noErrors:  0
          };
        }

        if (params.out.importCustscfg) {
          var csPrefs = data.custSaveCfg;
          var csCount = 0;
          if (csPrefs.saveEnabled != null) {csCount++;this.preferences.setManageFhcException(csPrefs.saveEnabled);}
          if (csPrefs.exceptionlist != null) {
            cxResult = this._importCustSaveExceptions(csPrefs.exceptionlist);
          }          
          csResult = {
            noTotal:   csCount,
            noAdded:   csCount,
            noSkipped: "",
            noErrors:  0
          };
          // notify observers
          Components.classes["@mozilla.org/observer-service;1"]
                    .getService(Components.interfaces.nsIObserverService)
                    .notifyObservers(null, "managefhc-exceptionlist-changed", "");
        }
        
        if (params.out.importCleanup) {
          var prResult = CleanupProtectView.importAction(data.protect);
          var cuResult = CleanupWindowControl.importAction(data.cleanup);
          clResult = {
            noTotal: prResult.noTotal + cuResult.noTotal,
            noAdded: cuResult.noAdded + prResult.noAdded,
            noSkipped: cuResult.noSkipped + prResult.noSkipped,
            noErrors: cuResult.noErrors + prResult.noErrors
          };
          
          var clPrefs = data.cleanupCfg;
          if (clPrefs.cleanupDaysChecked != null)  this.preferences.setCleanupDaysChecked( "true" == clPrefs.cleanupDaysChecked);
          if (clPrefs.cleanupDays != null)         this.preferences.setCleanupDays(        clPrefs.cleanupDays);
          if (clPrefs.cleanupTimesChecked != null) this.preferences.setCleanupTimesChecked("true" == clPrefs.cleanupTimesChecked);
          if (clPrefs.cleanupTimes != null)        this.preferences.setCleanupTimes(       clPrefs.cleanupTimes);
          if (clPrefs.cleanupOnShutdown != null)   this.preferences.setCleanupOnShutdown(  "true" == clPrefs.cleanupOnShutdown);
          if (clPrefs.cleanupOnTabClose != null)   this.preferences.setCleanupOnTabClose(  "true" == clPrefs.cleanupOnTabClose);
        }

        if (params.out.importRegexp) {
          reResult = this._importRegexp(data.regexp);
        }

        if (params.out.importKeys) {
          keResult = this._importKeys(data.keys);
        }

        // report import status
        var statusParams = {
          history: hiResult,
          multiline: mlResult,
          multicfg: mcResult,
          multiexc: exResult,
          custsexc: cxResult,
          custscfg: csResult,
          cleanup: clResult,
          regexp: reResult,
          keys: keResult
        }
        FhcShowDialog.doShowFhcImportStatus(statusParams);
          
      } finally {
        data = null;

        // re-apply searchfilters to reflect changes to cleanup criteria
        this.treeView.applyFilter();
        this._updateCountLabel();

        window.setCursor("auto");
      }
    }
  },

  _importKeys: function(importedEntries) {
    var bindingValueComplex, bindingValue;
    
    var added = 0;
    for(var kk=0; kk<importedEntries.length; kk++) {

      bindingValueComplex = this.preferences.getKeybindingValue(importedEntries[kk].id);
      bindingValue = bindingValueComplex ? bindingValueComplex.data : "";

      if (bindingValue != importedEntries[kk].value) {
        added++;
        this.preferences.setKeybindingValue(importedEntries[kk].id, importedEntries[kk].value);
      }
    }
    return {
      noTotal: importedEntries.length,
      noAdded: added,
      noSkipped: importedEntries.length - added,
      noErrors: 0
    };
  },

  _importAction: function(importedEntries) {
    var noAdded = 0, noSkipped = 0, noErrors = 0;
      
    if (0 < importedEntries.length) {
      // filter out what is really new
      var newEntries = this.treeView.extractUniqueEntries(importedEntries);

      // add new entries to the database and repopulate the treeview
      if (0 < newEntries.length) {
        // add all new entries to the database in bulk
        if (this.dbHandler.bulkAddEntries(newEntries)) {
          noAdded   = newEntries.length;
          noSkipped = importedEntries.length - noAdded;
          
          // rebuild/show all
          this._repopulateView();
        }
      } else {
        noSkipped = importedEntries.length;
      }
      noErrors = importedEntries.length - (noAdded + noSkipped);
    }

    // return the status
    return {
      noTotal:   importedEntries.length,
      noAdded:   noAdded,
      noSkipped: noSkipped,
      noErrors:  noErrors
    }
  },

  // Export CSV data to a user specified file
  exportActionCSV: function() {
    var selectedHist = 0 < this.treeView.getSelectCount();
    var filteredHist = this.treeView.isDataFiltered() && (0 < this.treeView.rowCount);
    
    var params = {
          inn: {haveSelectedHist: selectedHist,
                haveFilteredHist: filteredHist
               },
          out: null
        };
    FhcShowDialog.doShowFhcExportCSV(params);
    
    if (params.out) {
      var historyEntries  = [];
      switch (params.out.exportHistoryWhat) {
        case "all":      historyEntries = this.treeView.getAll();break;
        case "selected": historyEntries = this.treeView.getSelected();break;
        case "search":   historyEntries = this.treeView.getAllDisplayed();break;
      }

      FhcUtil.exportEntriesCSV(
        this.bundle.getString("historywindow.prompt.exportdialog.title"),
        historyEntries,
        this.preferences
      );
    }
  },

  // Return the treeView
  getHistoryTreeView: function() {
    return this.treeView;
  },

  // Make sure all data is displayed by turning off all filtering options
  // also clear any selections
  displayAll: function() {
    this.selectNone();
    this.filterChanged(null);
    if (document.getElementById("searchfieldonly").checked == true) {
      document.getElementById("searchfieldonly").checked = false;
      this.searchOnlyFieldChanged(false);
    } else if (document.getElementById("searchpageonly").checked == true) {
      document.getElementById("searchpageonly").checked = false;
      this.searchOnlyPageChanged(false);
    }
  },

  // Show confirmdialog unless turned off in preferences
  // if dialog is shown, offer user option to not show this in the future
  confirmDialogWithPref: function(title, message, isMultiple) {
    // check if warning needs to be issued according to userpreference
    var showWarning = (isMultiple && this.preferences.isWarnOnDeleteMultiple()) ||
                        (!isMultiple && this.preferences.isWarnOnDeleteOne());
    var isOkay = !showWarning;

    if (showWarning) {
      var chkMsg = isMultiple
                   ? this.bundle.getString("prompt.check.delete.multipleentries.askagain")
                   : this.bundle.getString("prompt.check.delete.singleentry.askagain");
      var confirmResult = FhcUtil.confirmDialog(title, message, chkMsg);
      isOkay = confirmResult.isOkay;

      // if user clicked okay and checked the noWarn box, save as preference
      if (confirmResult.isOkay && confirmResult.isChecked) {
        isMultiple
          ? this.preferences.setWarnOnDeleteMultiple(false)
          : this.preferences.setWarnOnDeleteOne(false);
      }
    }
    return isOkay;
  },



  //----------------------------------------------------------------------------
  // Cleanup methods
  //----------------------------------------------------------------------------

  // Tabpanel select
  onSelectCleanupTab: function(newIndex) {
    var tabsElem = document.getElementById("historyWindowCleanupTabs");

    // show or hide cleanup/protect treecount-labels
    var elmCleanupLabels = document.getElementById('cleanupCountLabels');
    var elmProtectlabels = document.getElementById('protectCountLabels');
    elmCleanupLabels.hidden = !(newIndex == 0);
    elmProtectlabels.hidden = !(newIndex == 1);

    // make sure that CleanupWindowControl/CleanupProtectView is initialized
    if (CleanupWindowControl.treeBox) {
      
      // disable/enable buttons
      switch (tabsElem.selectedIndex) {
        case 0:
             CleanupWindowControl.treeSelect();
             break;
        case 1:
             CleanupProtectView.treeSelect();
             break;
      }
    }
  },

  /**
   * Close the cleanup preview and return to the Cleanup-tab.
   */
  closeCleanupPreview: function() {
    document.getElementById("preview-box-top").collapsed = true;
    document.getElementById("preview-box-bottom").collapsed = true;
    document.getElementById("searchcleanuponly").setAttribute("checked", false);
    this.searchOnlyCleanupChanged(false);

    // hide "close preview" button
    document.getElementById("closePreview").hidden = true;
    // show edit buttons
    document.getElementById("removeSelected").hidden = false;
    //document.getElementById("removeAll").hidden = false;
    document.getElementById("editEntry").hidden = false;
    document.getElementById("insertEntry").hidden = false;

    //this._selectTab(1);
  },

  /**
   * Popup menu-item selected (cleanUp), perform the action indicated by
   * doAction.
   *
   * @param doAction {String}
   *        one of ["Insert, "Edit", "Delete"]
   */
  editCleanupAction: function(doAction) {
    var tabs = document.getElementById('historyWindowCleanupTabs');
    switch (tabs.selectedIndex) {
      case 0:
           CleanupWindowControl.editAction(doAction);
           break;
      case 1:
           CleanupProtectView.editAction(doAction);
           break;
    }
  },

  /**
   * Cleanup Select all items from the edit menu.
   */
  selectCleanupAll: function() {
    var tabs = document.getElementById('historyWindowCleanupTabs');
    switch (tabs.selectedIndex) {
      case 0:
           CleanupWindowControl.selectAll();
           break;
      case 1:
           CleanupProtectView.selectAll();
           break;
    }
  },

  /**
   * Cleanup Select no items from the edit menu.
   */
  selectCleanupNone: function() {
    var tabs = document.getElementById('historyWindowCleanupTabs');
    switch (tabs.selectedIndex) {
      case 0:
           CleanupWindowControl.selectNone();
           break;
      case 1:
           CleanupProtectView.selectNone();
           break;
    }
  },

  /**
   * Import multiline exceptions, only add new entries.
   *
   * @param importedExceptions {Array}
   *        array of exceptions
   *
   * @return {Object} status
   */
  _importExceptions: function(importedExceptions) {
    var noAdded = 0, noSkipped = 0, noErrors = 0, noTotal = 0;
    
    if (importedExceptions != null) {
      var exist, newExceptions = [];
      var curExceptions = this.dbHandler.getAllMultilineExceptions();
      for(var ii=0; ii<importedExceptions.length; ii++) {
        ++noTotal;
        exist = false;
        for(var cc=0; cc<curExceptions.length; cc++) {
          exist = (importedExceptions[ii].host == curExceptions[cc].host);
          if (exist) break;
        }
        if (!exist) {
          newExceptions.push(importedExceptions[ii]);
        }
      }

      // add new exceptions to the database and repopulate the treeview
      if (0 < newExceptions.length) {
        // add all new exceptions to the database in bulk
        if (this.dbHandler.bulkAddMultilineExceptions(newExceptions)) {
          noAdded   = newExceptions.length;
          noSkipped = noTotal - noAdded;
        }
      } else {
        noSkipped = noTotal;
      }
      noErrors = noTotal - (noAdded + noSkipped);
    }

    // return the status
    return {
      noTotal: importedExceptions.length,
      noAdded: noAdded,
      noSkipped: noSkipped,
      noErrors: noErrors
    }
  },


  /**
   * Import custom save exceptions, only add new entries.
   *
   * @param importedExceptions {Array}
   *        array of exceptions
   *
   * @return {Object} status
   */
  _importCustSaveExceptions: function(importedExceptions) {
    var noAdded = 0, noSkipped = 0, noErrors = 0, noTotal = 0;
    
    if (importedExceptions != null) {
      var exist, newExceptions = [];
      var curExceptions = this.dbHandler.getAllCustomsaveExceptions();
      for(var ii=0; ii<importedExceptions.length; ii++) {
        ++noTotal;
        exist = false;
        for(var cc=0; cc<curExceptions.length; cc++) {
          exist = (importedExceptions[ii].url == curExceptions[cc].url);
          if (exist) break;
        }
        if (!exist) {
          newExceptions.push(importedExceptions[ii]);
        }
      }

      // add new exceptions to the database and repopulate the treeview
      if (0 < newExceptions.length) {
        // add all new exceptions to the database in bulk
        if (this.dbHandler.bulkAddCustomsaveExceptions(newExceptions)) {
          noAdded   = newExceptions.length;
          noSkipped = noTotal - noAdded;
        }
      } else {
        noSkipped = noTotal;
      }
      noErrors = noTotal - (noAdded + noSkipped);
    }

    // return the status
    return {
      noTotal: importedExceptions.length,
      noAdded: noAdded,
      noSkipped: noSkipped,
      noErrors: noErrors
    }
  },
  
  /**
   * Import regexp, only add new entries.
   *
   * @param importedRegexps {Array}
   *        array of regexp
   *
   * @return {Object} status
   */
  _importRegexp: function(importedRegexps) {
    var noAdded = 0, noSkipped = 0, noErrors = 0, noTotal = 0;

    if (importedRegexps != null) {
      var exist, newRegexp = [];
      var curRegexp = this.dbHandler.getAllRegexp();
      for(var ii=0; ii<importedRegexps.length; ii++) {
        ++noTotal;
        exist = false;
        for(var cc=0; cc<curRegexp.length; cc++) {
          exist = (importedRegexps[ii].regexp == curRegexp[cc].regexp) &&
                  (importedRegexps[ii].caseSens == curRegexp[cc].caseSens);
          if (exist) break;
        }
        if (!exist) {
          newRegexp.push(importedRegexps[ii]);
        }
      }

      // add new criteria to the database and repopulate the treeview
      if (0 < newRegexp.length) {
        // add all new criteria to the database in bulk
        if (this.dbHandler.bulkAddRegexp(newRegexp)) {
          noAdded   = newRegexp.length;
          noSkipped = noTotal - noAdded;
        }
      } else {
        noSkipped = noTotal;
      }
      noErrors = noTotal - (noAdded + noSkipped);
    }

    // return the status
    return {
      noTotal: importedRegexps.length,
      noAdded: noAdded,
      noSkipped: noSkipped,
      noErrors: noErrors
    }
  },



  //----------------------------------------------------------------------------
  // Advanced search methods
  //----------------------------------------------------------------------------

  /**
   * Return a list of all element-id's of inputboxes containing filter criteria.
   *
   * @return {Array}
   *         a list of element id's used for advanced search criteria.
   */
  _getAllAdvancedSearchCriteriaIds: function() {
    var id = [];
    id.push('adv_fieldname');
    id.push('adv_fieldvalue');
    id.push('adv_times_from');
    id.push('adv_times_to');
    id.push('host_search');
    id.push('adv_usedfirst_from');
    id.push('adv_usedfirst_to');
    id.push('adv_usedlast_from');
    id.push('adv_usedlast_to');
    return id;
  },

  /**
   * Make the Clear button only active when searchcriteria are present.
   */
  _toggleAdvancedSearchClearButton: function() {
    var ids = this._getAllAdvancedSearchCriteriaIds();
    var hasValues = false;
    for (var it=0; it < ids.length; it++) {
      if (document.getElementById(ids[it]).value != "") {
        hasValues = true;
        break;
      }
    }
    var btnClear = document.getElementById("advanced_clear");
    btnClear.setAttribute("disabled", !hasValues);
  },
  
  /**
   * Disable the MatchExact checkbox if the RegExp checkbox is checked.
   */
  _toggleMatchExactCheckboxes: function() {
    var isRegExp = document.getElementById("adv_fieldname_regexp").checked;
    document.getElementById("adv_fieldname_exact").disabled = isRegExp;
    this._checkRegExpIfAny("adv_fieldname", isRegExp);

    isRegExp = document.getElementById("adv_fieldvalue_regexp").checked;
    document.getElementById("adv_fieldvalue_exact").disabled = isRegExp;
    this._checkRegExpIfAny("adv_fieldvalue", isRegExp);
  },

  /**
   * If no advanced fieldvalue: clear the radio checkmark in the regexp list
   */
  _setRadioRegexpList: function() {
    var regexpMenu;
    if ("" == document.getElementById("adv_fieldname").value) {
      regexpMenu = document.getElementById("regexp-namelist-menu");
      this._clearRadioRegexpList(regexpMenu);
    }
    if ("" == document.getElementById("adv_fieldvalue").value) {
      regexpMenu = document.getElementById("regexp-list-menu");
      this._clearRadioRegexpList(regexpMenu);
    }
  },

  /**
   * Clear the radio checkmark in the regexp list.
   */
  _clearRadioRegexpList: function(regexpMenu) {
    // make sure nothing is checked (radio) in the regexp list
    
    for each (var menuItem in regexpMenu.childNodes) {
      if (menuItem) {
        if ("menuitem" == menuItem.nodeName) {
          if (menuItem.hasAttribute("checked")) {
            menuItem.removeAttribute("checked");
          }
        }
        else if (("menu" == menuItem.nodeName) || ("menupopup" == menuItem.nodeName)) {
          // recurse items submenu
          this._clearRadioRegexpList(menuItem);
        }
      }
    }
  },

  /**
   * If the textbox contains a RegEx, check if it is valid.
   * Display a marker with a tooltip if the RegExp can not be evaluated.
   *
   * @param regexElemId {String}
   *        the id of the textbox conaining the RegExp
   *
   * @param isRegExp {Boolean}
   *        whether or not to evaluate the textboxvalue as a RegExp
   *
   */
  _checkRegExpIfAny: function (regexElemId, isRegExp) {
    if (isRegExp) {
      var regExp = document.getElementById(regexElemId).value;
      var statusMsg = this._testRegExp(regExp);
      this._setRegexTooltip(regexElemId, statusMsg);
    } else {
      this._setRegexTooltip(regexElemId, "");
    }
  },

  /**
   * Add or delete a tooltip depending on the message.
   *
   * @param regexElemId {String}
   *        the id of the textbox conaining the RegExp
   *
   * @param msg {String}
   *        the status message to display in the tooltip
   *
   */
  _setRegexTooltip: function(regexElemId, msg) {
    var stateElem = document.getElementById(regexElemId + "-regex-state");
    if ("" != msg) {
      stateElem.value = "*";
      stateElem.tooltip = regexElemId + "-regex-tip";
      document.getElementById(regexElemId + "-regex-errmsg").value = msg;
    } else {
      stateElem.value = "";
      stateElem.tooltip = "";
    }
  },

  /**
   * Test if a Regular Expression can be evaluated.
   *
   * @param  regExp {String}
   *         the regular expression
   *         
   * @return {String}
   *         exception message if regExp invalid otherwise empty string
   */
  _testRegExp: function(regExp) {
    var errMsg = "";
    if ("" != regExp) {
      try {
        var re = new RegExp(regExp);
        re.test("dummy");
      } catch(e) {
        errMsg = e;
      }
    }
    return errMsg;
  },

  /**
   * Clear the value of the date/time textbox
   */
  _clearDateTime: function(textboxId) {
    var elmTextbox = document.getElementById(textboxId);
    elmTextbox.value = "";
    elmTextbox.removeAttribute("milliseconds");
    this.advancedFilterChanged();
  },

  /**
   * Function (used as callback by HistoryWindowControl) to filter formhistory
   * entries matching cleanup criteria.
   *
   * @param  entries {Array}
   *         array of FormHistory entry objects
   *
   * @return {Array}
   *         array of matching FormHistory entry objects
   */
  _filterAdvancedSearchEntries: function(entries) {
    var matches = [], isMatch, theDate;

    var nameValue    = document.getElementById('adv_fieldname').value;
    var doCaseName   = document.getElementById('adv_fieldname_case').checked;
    var doExactName  = document.getElementById('adv_fieldname_exact').checked;
    var doRegExpName = document.getElementById('adv_fieldname_regexp').checked;

    var valueValue    = document.getElementById('adv_fieldvalue').value;
    var doCaseValue   = document.getElementById('adv_fieldvalue_case').checked;
    var doExactValue  = document.getElementById('adv_fieldvalue_exact').checked;
    var doRegExpValue = document.getElementById('adv_fieldvalue_regexp').checked;

    var timesFrom = document.getElementById("adv_times_from").value;
    var timesTo   = document.getElementById("adv_times_to").value;

    var host = document.getElementById("host_search").value;

    var usedFirstFromMs   = document.getElementById("adv_usedfirst_from").getAttribute("milliseconds");
    var usedFirstFromDate = (usedFirstFromMs) ? new Date(parseInt(usedFirstFromMs, 10)) : null;
    var usedFirstToMs   = document.getElementById("adv_usedfirst_to").getAttribute("milliseconds");
    var usedFirstToDate = (usedFirstToMs) ? new Date(parseInt(usedFirstToMs, 10)) : null;
    var usedLastFromMs  = document.getElementById("adv_usedlast_from").getAttribute("milliseconds");
    var usedLastFromDate = (usedLastFromMs) ? new Date(parseInt(usedLastFromMs, 10)) : null;
    var usedLastToMs    = document.getElementById("adv_usedlast_to").getAttribute("milliseconds");
    var usedLastToDate = (usedLastToMs) ? new Date(parseInt(usedLastToMs, 10)) : null;

    // iterate all entries and collect matches
    for(var hh=0; hh<entries.length; hh++) {
      isMatch = true;

      // fieldname
      if (isMatch && ("" != nameValue)) {
        isMatch = FhcUtil.isMatchingString(doExactName, doCaseName, doRegExpName, nameValue, entries[hh].name);
      }
      // fieldvalue
      if (isMatch && ("" != valueValue)) {
        isMatch = FhcUtil.isMatchingString(doExactValue, doCaseValue, doRegExpValue, valueValue, entries[hh].value);
      }
      // times used
      if (isMatch && ("" != timesFrom)) {
        isMatch = ((0 + timesFrom) <= entries[hh].used);
      }
      if (isMatch && ("" != timesTo)) {
        isMatch = ((0 + timesTo) >= entries[hh].used);
      }
      // host
      if (isMatch && ("" != host)) {
        isMatch = (entries[hh].place.length > 0) && FhcUtil.inStr(entries[hh].place[0].host, host);
      }
      // used first
      if (isMatch && (usedFirstFromDate)) {
        theDate = this.dateHandler.microsecondsToSimpleDate(entries[hh].first);
        isMatch = (theDate >= usedFirstFromDate);
      }
      if (isMatch && (usedFirstToDate)) {
        theDate = this.dateHandler.microsecondsToSimpleDate(entries[hh].first);
        isMatch = (theDate <= usedFirstToDate);
      }
      // used last
      if (isMatch && (usedLastFromDate)) {
        theDate = this.dateHandler.microsecondsToSimpleDate(entries[hh].last);
        isMatch = (theDate >= usedLastFromDate);
      }
      if (isMatch && (usedLastToDate)) {
        theDate = this.dateHandler.microsecondsToSimpleDate(entries[hh].last);
        isMatch = (theDate <= usedLastToDate);
      }

      if (isMatch) {
        // we have a winner!
        matches.push(entries[hh]);
      }
    }
    return matches;
  },

  /**
   * Re-apply date formatting to date fields.
   */
  _applyDateFormatToDateFields: function() {
    var elem, dateMilSec;
    var ids = this._getAllAdvancedSearchCriteriaIds();
    for (var it=0; it < ids.length; it++) {
      elem = document.getElementById(ids[it]);
      if ("" != elem.value) {
         dateMilSec = elem.getAttribute("milliseconds");
         elem.value = this.dateHandler.toDateString(1000 * dateMilSec);
      }
    }
  },


  //----------------------------------------------------------------------------
  // Helper methods
  //----------------------------------------------------------------------------

  // switch to a specific tabpanel
  _selectTab: function(newIndex) {
    var tabsElem = document.getElementById("historyWindowTabs");
    if (tabsElem.selectedIndex != newIndex) {
      tabsElem.selectedIndex = newIndex;
      this.onSelectTab(newIndex);
    }
  },

  // switch to a specific cleanup tabpanel
  _selectCleanupTab: function(newIndex) {
    var tabsElem = document.getElementById("historyWindowCleanupTabs");
    if (tabsElem.selectedIndex != newIndex) {
      tabsElem.selectedIndex = newIndex;
    }
    this.onSelectCleanupTab(newIndex);
  },

  // Repopulate the view from scratch
  _repopulateView: function() {
    // read all data again
    this._setupDataView();

    // re-apply field/page filter
    if (this.fieldFilter.active) {
      this.searchOnlyFieldChanged(true);
    } else if (this.pageFilter.active) {
      this.searchOnlyPageChanged(true);
    }
  
    // re-apply filters
    this.treeView.applyFilter();
    this._updateCountLabel();
  },

  // Read data from the database into the treeview
  _setupDataView: function() {
    // make sure its empty
    this.treeView.empty();

    //XXX: remove timing dumps
    //var start = new Date();

    // read all entries from the db into the treeView
    var entries = this.dbHandler.getAllEntries();

    //var end = new Date();
    //dump("Get all entries took " + (end.getTime() - start.getTime()) + " ms\n");

    // filter out loginmanaged fields
    if (this.hideLoginmanagedFields) {
      entries = this._filterAllLoginmanaged(entries);
    }

    // filter out fields from exclusion list
    if (0 < this.fieldExclusionList.length) {
      entries = this._filterExclusions(entries);
    }

    // display entries in tree
    if (entries.length > 0) {
      this.treeView.beginBatch();
      for (var i=0; i < entries.length; i++) {
        this.treeView.addRow(
          entries[i].id,
          entries[i].name,
          entries[i].value,
          entries[i].used,
          entries[i].first,
          entries[i].last,
          entries[i].place);
      }
      this.treeView.endBatch();
    }
    entries = null;
  
    // add place info
    this._fillPlaces();
    
    // apply the initial sortorder
    this.treeView.sortColumn();

    // set the new rowcount    
    this._updateCountLabel();
  },

  /**
   * Add place info to all formhistory entries.
   */
  _fillPlaces: function() {
    var entries = this.treeView.getAll();
    //XXX: remove timing dumps
    //var start = new Date();
    
    var handled = this.dbHandler.addVisitedPlaceToEntries(entries, 0);
    
    // if it takes too long, handle remainder asynchronously
    if (handled > 0) {
      this._fillPlacesAsync(entries, handled);
    }
    
    //var end = new Date();
    //dump("Get related placed (sync) took " + (end.getTime() - start.getTime()) + " ms\n\n");
  },

  _fillPlacesAsync: function(entries, lastHandled) {
    var event = {
      notify: function(timer) {
        var handled = HistoryWindowControl.dbHandler.addVisitedPlaceToEntries(entries, lastHandled+1);
        if (handled > 0) {
          HistoryWindowControl._fillPlacesAsync(entries, handled);
        } else {
          HistoryWindowControl.treeView.sortColumn();
        }
      }
    }
    this._setAsyncTimer(event, 5);
  },

  _setAsyncTimer: function(event, delay) {
    var timer =  Components.classes["@mozilla.org/timer;1"]
                    .createInstance(Components.interfaces.nsITimer);
    timer.initWithCallback(event, delay, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
  },

  // If no of items in db and treeview are out of sync, repopulate view
  _checkDbChange: function() {
    //if (this.dbHandler.getNoOfItems() != this.treeView.getAll().length) {
      var selected = this.treeView.getSelected();
      this._repopulateView();
      this.treeView.restoreSelection(selected);
    //}
  },

  // Add a new entry, use a dialog to obtain new name/value 
  _addEntry: function() {
    var now = this.dateHandler.getCurrentDate();
    var nowStr = this.dateHandler.toDateString(now);

    var entryExistCallbackFunction = function(newEntry) {
          return HistoryWindowControl.treeView.entryExists(newEntry);
        };

    var params = {
          inn: {name:  "",
                value: "",
                used:  0,
                first: nowStr,
                last:  nowStr,
                place: []
               },
          out: null,
          action: "add",
          entryExistCallback: entryExistCallbackFunction
        };

    // if fieldfilter active, supply the current fieldname
    if (this.fieldFilter.active) {
      params.inn.name = this.fieldFilter.name;
    }
    // else if 1 entry selected, supply the selected fieldname
    else if (this.treeView.getSelectCount() == 1) {
      var selected = this.treeView.getSelected();
      params.inn.name = selected[0].name;
    }

    FhcShowDialog.doShowFhcEditEntry(params);
    if (params.out) {
      var newEntry = {
            id:    -1,
            name:  params.out.name,
            value: params.out.value,
            used:  params.out.used,
            first: now,
            last:  now,
            place: []
          };
      var newIndex = this.dbHandler.addEntry(newEntry);
      if (newIndex) {
        newEntry.id = newIndex;
        this.treeView.addEntry(newEntry);
        this._updateCountLabel();
      }
    }
  },

  // Callbackfunction used by HistoryTreeView for editing in treecolumn
  _editEntryCallback: function(changedEntry, oldEntry) {
      // convert from FormHistoryItem
      var editEntry = {
        id:    changedEntry.id,
        name:  changedEntry.name,
        value: changedEntry.value,
        used:  changedEntry.used,
        first: changedEntry.first,
        last:  changedEntry.last
      };

    // Validate
    if (editEntry.name == "" || editEntry.value == "" || !FhcUtil.isNumeric(editEntry.used)) {
      // revert change in treeview
      HistoryWindowControl.treeView.updateEntry(oldEntry);
      return;
    }

    // data already changed in tree, update database accordingly
    if (HistoryWindowControl.dbHandler.updateEntry(editEntry)) {
      // position might change, update view
      HistoryWindowControl.treeView.applyFilter();
    }
  },

  // Edit an entry, use a dialog to obtain new name/value
  _editEntry: function(selected) {
    var entryExistCallbackFunction = null;
    var params;

    if (selected.length == 1) {
      // edit one entry
      entryExistCallbackFunction = function(changedEntry) {
        if (changedEntry.name == selected[0].name
              && changedEntry.value == selected[0].value) {
          // nothing changed, no error
          return false;
        } else {
          return HistoryWindowControl.treeView.entryExists(changedEntry);
        }
      };

      params = {
        inn:{name:  selected[0].name,
             value: selected[0].value,
             used:  selected[0].used,
             first: this.dateHandler.toDateString(selected[0].first),
             last:  this.dateHandler.toDateString(selected[0].last),
             place: selected[0].place,
             firstRaw: selected[0].first,
             lastRaw:  selected[0].last
            },
        out:null,
        action:"edit",
        entryExistCallback: entryExistCallbackFunction
      };
      FhcShowDialog.doShowFhcEditEntry(params);
      if (params.out) {
        var editEntry = {
          id:    selected[0].id,
          name:  params.out.name,
          value: params.out.value,
          used:  params.out.used,
          first: selected[0].first,
          last:  selected[0].last,
          place: selected[0].place
        };
        if (this.dbHandler.updateEntry(editEntry)) {
          this.treeView.updateEntry(editEntry);
        }
      }
    }
    else {
      // edit multiple entries
      var commonUsedValue = selected[0].used;
      for (var ii=1; ii < selected.length; ii++) {
        if (commonUsedValue != selected[ii].used) {
          commonUsedValue = "";
          ii = selected.length;
        }
      }
      params = {
        inn:{name: "", value: "", used: commonUsedValue, first: "",
              last: "", place: [], firstRaw: "", lastRaw:  ""
            },
        out:null,
        action:"editmultiple",
        entryExistCallback: null
      };
      FhcShowDialog.doShowFhcEditEntry(params);
      if (params.out) {
        window.setCursor("wait"); // might be slow
        var newUsedValue = params.out.used;
        if (this.dbHandler.bulkEditEntries(selected, newUsedValue)) {
          this._repopulateView();
          this.treeView.restoreSelection(selected);
        }
        window.setCursor("auto");
      }
    }
  },
  
  // Remove entries, ask for confirmation if more than 1 entry is about to be removed
  _removeEntries: function(entries) {
    var prefix = "historywindow.prompt.delete.";
    var msg = (1 < entries.length)
              ? this.bundle.getString(prefix + "multipleentries", [entries.length])
              : this.bundle.getString(prefix + "singleentry");
    if (this.confirmDialogWithPref(
          this.bundle.getString(prefix + "title"), msg, (1 < entries.length)))
    {
      this._deleteEntries(entries);
    }
  },
  
  // Remove all displayed entries
  _removeAll: function(entries) {
    if (this.confirmDialogWithPref(
      this.bundle.getString("historywindow.prompt.deleteall.title"),
      this.bundle.getString("historywindow.prompt.deleteall", [entries.length]),
      true))
    {
      this._deleteEntries(entries);
    }
  },

  // Remove all displayed entries with the given fieldname
  _removeAllWithName: function(fieldname) {
    if (this.confirmDialogWithPref(
      this.bundle.getString("historywindow.prompt.deleteallwithname.title"),
      this.bundle.getString("historywindow.prompt.deleteallwithname", [fieldname]),
      true))
    {
      var entries = this.treeView.getEntriesByName(fieldname);
      this._deleteEntries(entries);
    }
  },
  
  // Remove all displayed entries with the same value
  _removeAllWithValue: function(value) {
    if (this.confirmDialogWithPref(
      this.bundle.getString("historywindow.prompt.deleteallwithvalue.title"),
      this.bundle.getString("historywindow.prompt.deleteallwithvalue", [value]),
      true))
    {
      var entries = this.treeView.getEntriesByValue(value);
      this._deleteEntries(entries);
    }
  },
  
  // Delete entries
  _deleteEntries: function(entries) {
    if (this.dbHandler.deleteEntries(entries)) {
      this.treeView.deleteEntries(entries);
      this._updateCountLabel();
    }
  },

  /**
   * Invoked when Cleanup-dB has changed and a repaint is needed.
   */
  _cleanupDbChanged: function() {
    CleanupWindowControl.repopulateView();
    CleanupProtectView.repopulateView();
  },

  // Filter out Loginmanaged entries
  _filterAllLoginmanaged: function(entries) {
    var loginManagedNames = FhcUtil.getAllLoginmanagedFields();
    var filteredEntries = [];
     for (var ii=0; ii < entries.length; ii++) {
       if (!FhcUtil.arrayContainsString(loginManagedNames, entries[ii].name)) {
         filteredEntries.push(entries[ii]);
       }
    }
    return filteredEntries;
  },

  // Filter out (exclude) some fields based on the fieldname
  _filterExclusions: function(entries) {
    var filteredEntries = [], exclude;
    for (var i=0; i < entries.length; i++) {
      exclude = false;
      for (var ex=0; ex < this.fieldExclusionList.length && !exclude; ex++) {
        exclude = (entries[i].name == this.fieldExclusionList[ex]);
      }
      if (!exclude) filteredEntries.push(entries[i]);
    }
    return filteredEntries;
  },

  // Check if tree currently has the focus
  _isTreeFocused: function() {
    return document.getElementById("formHistoryTree").currentIndex > -1;
  },
  
  // Set the focus to the tree
  _focusTree: function(doSetFocus) {
    if (doSetFocus) {
      document.getElementById("formHistoryTree").focus();
    }
  },

  // Update the count-label with the current state
  _updateCountLabel: function() {
    var msg = this.bundle.getString("historywindow.itemcount.label", [this.treeView.rowCount]);
    if (this.treeView.isDataFiltered()) {
        msg += " " + this.bundle.getString("historywindow.itemcountof.label", [this.treeView.getAll().length]);
    }
    this.countLabel.setAttribute("value", msg);
  },
  
  // Update the countselect-label with the current state
  _updateSelectCountLabel: function(selectCount) {
    var msg = (1 > selectCount) ? "" : this.bundle.getString("historywindow.selectcount.label", [selectCount]);
    this.selectCountLabel.setAttribute("value", msg);
  },
  
  // Reflect changes of search-criteria in displayed controls
  _updateSearchElements: function() {
    var checkboxElem = document.getElementById("filterMatchCase");
    checkboxElem.checked = FhcUtil.isCaseSensitive;
    checkboxElem = document.getElementById("filterMlMatchCase");
    checkboxElem.checked = FhcUtil.isCaseSensitive;
  },

  // Hide the multiline tab if editor history is disabled
  _hideOrShowMultilineTab: function() {
    var doShow = this.preferences.isMultilineBackupEnabled()
    document.getElementById("editorHistoryTabPanel").hidden = !doShow;
    document.getElementById("editorHistoryTab").hidden = !doShow;
    if (!doShow) {
     // if tab is to be hidden but is selected, select another tab
     var tabs = document.getElementById('historyWindowTabs');
     if (2 == tabs.selectedIndex) {
       tabs.selectedIndex = 0;
     }
    }
  },

  // Register a preference listener to act upon relevant changes
  _registerPrefListener: function() {
    var thisHwc = this;
    this.preferenceListener = new FhcUtil.PrefListener("extensions.formhistory.",
      function(branch, name) {
        switch (name) {
          case "hideLoginmanagedFields":
               // adjust local var to reflect new preference value
               thisHwc.hideLoginmanagedFields = thisHwc.preferences.isHideLoginmanagedFields();

               // read all data again
               thisHwc._repopulateView();
               break;
          case "exclusions":
               // adjust local var to reflect new preference value
               thisHwc.fieldExclusionList = thisHwc.preferences.getExclusions();

               // read all data again
               thisHwc._repopulateView();
               break;
          case "searchCaseSensitive":
               // adjust local var to reflect new preference value
               FhcUtil.isCaseSensitive = thisHwc.preferences.isSearchCaseSensitive();

               // adjust displayed search controls accordingly
               thisHwc._updateSearchElements();

               // re-apply searchfilters
               thisHwc.treeView.applyFilter();
               thisHwc._updateCountLabel();
               thisHwc.sortColumn();
               thisHwc.sortColumn();
               break;
          case "useCustomDateTimeFormat":
          case "customDateTimeFormat":
               if (thisHwc.preferences.isUseCustomDateTimeFormat()) {
                 thisHwc.dateHandler.setCustomDateFormat(thisHwc.preferences.getCustomDateTimeFormat());
               } else {
                 thisHwc.dateHandler.setCustomDateFormat(null);
               }
               // apply new dateformat to treeview
               thisHwc.treeView.repaint();
               // re-apply new formatting to date fields
               thisHwc._applyDateFormatToDateFields();
               break;
          case "cleanupOnShutdown":
          case "cleanupOnTabClose":
          case "cleanupDaysChecked":
          case "cleanupDays":
          case "cleanupTimesChecked":
          case "cleanupTimes":
               CleanupWindowControl.readAndShowPreferences();
               break;
          case "multiline.backupenabled":
               thisHwc._hideOrShowMultilineTab();
               break;
        }
      });
    this.preferenceListener.register();
  },
 
  // Unregister the preference listener
  _unregisterPrefListener: function() {
    if (this.preferenceListener) {
      this.preferenceListener.unregister();
      this.preferenceListener = null;
    }
  },

  // Listen to session store changes
  _registerBrowserListener: function() {
    this.browserListener = new FhcBrowserListener();
    this.browserListener.watcher = {
      // Called when the sanitizer runs to purge all history and other information.
      onSessionStoreChange: function() {
        HistoryWindowControl._checkDbChange();
      },
      // Called when the sanitizer runs to purge all history and other information.
      onCleanupDbChange: function() {
        HistoryWindowControl._cleanupDbChanged();
      }
    }
  },

  // Unregister the browser listener
  _unregisterBrowserListener: function() {
    if (this.browserListener) {
      this.browserListener.destroy();
      this.browserListener = null;
    }
  }
}