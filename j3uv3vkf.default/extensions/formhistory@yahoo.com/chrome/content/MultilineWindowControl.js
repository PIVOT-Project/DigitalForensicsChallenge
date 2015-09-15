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
 * The Original Code is MultilineWindowControl.
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
 * Multiline Methods for the dialog HistoryWindowControl.
 *
 * Dependencies:
 *   HistoryWindowControl.xul, HistoryWindowControl.js, FhcUtil.js,
 *   FhcDbHandler.js, FhcShowDialog.js.
 *
 */
const MultilineWindowControl = {
  // nsITreeView attributes
  treeBox: null,
  rowCount: 0,
  atomService: null,
  preferenceListener: null,
  nowDate: null,
  //
  countLabel: "",
  selectCountLabel: "",
  dbHandler: null,
  dateHandler: null,
  prefHandler: null,
  bundle: null,
  alldata: [],
  data: [],
  dbObserver: null,
 
  /**
   * Initialize.
   */
  init: function(aDbHandler, aDateHandler, aPrefHandler, aBundle) {
    this.nowdate = aDateHandler.getCurrentDate();
    
    // initialize tree
    var formTree = document.getElementById("multilineHistoryTree");
    formTree.view = this;

    // for treecell property (checkbox)
    this.atomService = Components.classes["@mozilla.org/atom-service;1"]
                        .getService(Components.interfaces.nsIAtomService);

    // initialize handlers
    this.dbHandler = aDbHandler;
    this.dateHandler = aDateHandler;
    this.prefHandler = aPrefHandler;
    this.bundle = aBundle;
    
    this.countLabel = document.getElementById("multilineItemCount");
    this.selectCountLabel = document.getElementById("multilineSelectCount");

    // read all multiline items from the db into the treeView
    this.repopulateView();

    // read preferences and apply to UI
    this.readAndShowPreferences();

    // set initial sort
    this.sortColumn();
    
    // listen to preference updates
    this._registerPrefListener();

    // observe changes to the database
    this._registerDbObserver();
  },

  /**
   * Extension close.
   */
  destroy: function() {
    this._unregisterDbObserver();
    this._unregisterPrefListener();
    return true;
  },

  /**
   *  onpopupshowing event handler.
   *  Show tooltip when hovering over a treecell, use HTML formatted text
   *  if content contains html tags.
   */
  showTooltip: function(event, tooltipNode) {
    // clear old tooltip
    while(tooltipNode.firstChild) {
      tooltipNode.removeChild(tooltipNode.firstChild);
    }
    tooltipNode.label = null;
    
    var row = {}, column = {}, part = {};
    this.treeBox.getCellAt(event.clientX, event.clientY, row, column, part);
    
    if (column.value != null && row.value != null) {
      var content = this.getCellText(row.value, column.value);

      if ("contentCol" == column.value.id && content && content.match(/<\w+/)) {
        // prepare html preview (convert html-text to DOM)
        var dom = FhcUtil.htmlStringToDOM(
          content, this.prefHandler.isMultilineHTMLSanitized()
        ); 

        // set formatted tooltip content
        tooltipNode.appendChild(dom);
      }
      else {
        // plain text content
        tooltipNode.label = content;
        //event.preventDefault();
      }
    }
  },

  /**
   *  onpopuphidden event handler.
   */
  hideTooltip: function(event, tooltipNode) {
    // clear tooltip
    while(tooltipNode.firstChild) {
      tooltipNode.removeChild(tooltipNode.firstChild);
    }
    tooltipNode.label = null;
  },

  /**
   * Right-click popup contextmenu activation from MultilineWindowControl Dialog.
   *
   * @param event {Event}
   */
  menuPopup: function(event) {
    var selected = this.getSelected();
    document.getElementById("mnDeleteMultiline").setAttribute("disabled", 0 == selected.length);
    document.getElementById("mnCopyMultilineToClipboard").setAttribute("disabled", 1 != selected.length);
    return true;
  },

  /**
   * Menubar activated from MultilineWindowControl Dialog (onpopupshowing).
   *
   * @param {Event} event
   */
  menubarPopup: function(event) {
    var selectCount = this.getSelectCount();
    document.getElementById("mnbarMlDelete").setAttribute("disabled", 0 == selectCount);
    return true;
  },

  /**
   * Perform the action indicated by doAction.
   * Action is Delete or View. Update the countlabel accordingly.
   *
   * @param doAction {String}
   *        one of ["Delete"]
   */
  editAction: function(doAction) {
    var selected = this.getSelected();
    if (selected.length > 0) {
      switch(doAction) {
        case "Delete":
          this._removeMultiline(selected);
          this._updateCountLabel();
          break;
        case "View":
          FhcShowDialog.doShowFhcMultilineItem(selected[0]);
          break;
      }
    }
  },

  /**
   * Copy multiline text of the selected item to the clipboard.
   *
   * @return {Boolean}
   *         true when copy succeeded
   */
  copyToClipboardAction: function() {
    var selected = this.getSelected();
    if (selected.length == 1) {
      Components.classes["@mozilla.org/widget/clipboardhelper;1"]
                .getService(Components.interfaces.nsIClipboardHelper)
                .copyString(selected[0].content);
    }
  },

  /**
   * Tree row is selected, enable/disable buttons and update selectcount label.
   *
   * @param event {Event}
   */
  treeSelect: function(event) {
    var selectCount = this.getSelectCount();

    // enable remove-button only when at leat 1 item is selected
    var btnRemove = document.getElementById("removeMultiline");
    btnRemove.setAttribute("disabled", 0 == selectCount);

    // enable view-button only when 1 item is selected
    var btnview = document.getElementById("viewMultiline");
    btnview.setAttribute("disabled", 1 != selectCount);

    // display selectCount
    this._updateSelectCountLabel(selectCount);
  },

  /**
   * Doubleclicked on a treeitem: start viewing item.
   *
   * @param event {Event}
   */
  treeDblclick: function(event) {
    var selected = this.getSelected();
    FhcShowDialog.doShowFhcMultilineItem(selected[0]);
  },

  /**
   * clicked on treecell.
   * 
   * @param event {Event}
   */
  treeClick: function(event) {
    // no action on right-click (context-menu)
    if (2 != event.button) {
      var tree = document.getElementById("multilineHistoryTree");
      var row = {}, col = {}, child = {};
      tree.treeBoxObject.getCellAt(event.clientX, event.clientY, row, col, child);
      if (col.value && "mlurlCol" == col.value.id) {
        var url = tree.view.getCellText(row.value, col.value);
        if (url) HistoryWindowControl.onUrlTreeCellClicked(url, event);
      }
    }
  },

  /**
   * Select all items.
   */
  selectAll: function() {
    var selection = this._getSelection();
    if (selection) {
      selection.selectAll();
    }
  },
  
  /**
   * Deselect all items.
   */
  selectNone: function() {
    var selection = this._getSelection();
    if (selection) {
      selection.clearSelection();
    }
  },

  /**
   * Sort the clicked column. Toggle the sortorder if already sorted.
   *
   * @param treeColumn {DOM element}
   *        the column the user has clicked
   */
  sort: function(treeColumn) {
    this.sortColumn(treeColumn, true);
  },

  /**
   * Sort the column.
   *
   * @param treeColumn {DOM element}
   *        the column the user has clicked
   *
   * @param toggle {Boolean} [Optional]
   *        whether or not to toggle the sortorder of an already sorted column
   *        default is do toggle
   */
  sortColumn: function(treeColumn, toggle) {
    var curSortedCol = this._getCurrentSortedColumn();

    if (toggle == undefined) toggle = false;
    if (treeColumn == undefined) treeColumn = curSortedCol;

    var sortAsc = true;
    if (treeColumn.id != curSortedCol.id) {
      // remove sort indicator of previous sorted column
      this._removeSortIndicator(curSortedCol);
    } else  {
      // set sort direction of new column
      sortAsc = ("ascending" == treeColumn.getAttribute("sortDirection"));
      if (toggle) sortAsc = ! sortAsc;
    }

    this.data.sort(this._getSortCompareFunction(treeColumn.id));
    if (!sortAsc) {
      this.data.reverse();
    }
    this._setSortIndicator(treeColumn, sortAsc);
    this.treeBox.invalidate();
  },

  /**
   * Import multiline fields from file, only add new entries.
   *
   * @param importedEntries {Array}
   *        array of multiline items
   *
   * @return {Object} status
   */
  importAction: function(importedEntries) {
    var noAdded = 0, noSkipped = 0, noErrors = 0;

    if (0 < importedEntries.length) {
      // filter out what is really new
      var newEntries = this._extractUniqueEntries(importedEntries);

      // add new entries to the database and repopulate the treeview
      if (0 < newEntries.length) {
        // add all new entries to the database in bulk
        if (this.dbHandler.bulkAddMultilineItems(newEntries)) {
          noAdded   = newEntries.length;
          noSkipped = importedEntries.length - noAdded;
          
          // rebuild/show all
          this.repopulateView();
        }
      } else {
        noSkipped = importedEntries.length;
      }
      noErrors = importedEntries.length - (noAdded + noSkipped);
    }

    // return the status
    return {
      noTotal: importedEntries.length,
      noAdded: noAdded,
      noSkipped: noSkipped,
      noErrors: noErrors
    };
  },
  
  /**
   * Extract from the entriesToTest only the entries that do not already exist.
   * 
   * @param  entriesToTest {Array}
   *         array of multiline entries
   * 
   * @return {Array}
   *         array of multiline entries that do not already exist.
   */
  _extractUniqueEntries: function(entriesToTest) {
    var uniqueEntries = [];

    // create a hashmap of existing multiline entries (firstsaved/lastsaved)
    var key;
    var hashMap = new Array();
    for(var ii=0; ii<this.alldata.length; ii++) {
      key = this.alldata[ii].firstsaved + "|" + this.alldata[ii].lastsaved;
      if (undefined == hashMap[key])
        hashMap[key] = key;
    }

    // check entriesToTest against hashmap
    for (var jj=0; jj<entriesToTest.length; jj++) {
      key = entriesToTest[jj].firstsaved + "|" + entriesToTest[jj].lastsaved;
      if (undefined == hashMap[key]) {
        uniqueEntries.push(entriesToTest[jj]);
        
        // add to hashmap also to detect duplicate entries in entriesToTest itself
        // only the first occurrence is added to uniqueEntries
        hashMap[key] = key;
      }
    }

    // free bulky overhead
    //delete hashMap;
    
    return uniqueEntries;
  },
  
  /**
   * Repopulate the database and repaint the view.
   */
  repopulateView: function() {
    this.nowdate = this.dateHandler.getCurrentDate();
    
    this.alldata = [];
    this.data = [];
    this.treeBox.rowCountChanged(0, -this.rowCount);
    this.treeBox.invalidate();
    this.rowCount = 0;
    this.alldata = this.dbHandler.getAllMultilineItems();
    
    this._applyFilter();
    
    this.rowCount = this.data.length;
    this.treeBox.rowCountChanged(1, this.data.length);

    // re-apply sort and update the count
    this.sortColumn();
    this._updateCountLabel();
  },

  /**
   * Filtertext changed, apply new filter.
   */
  filterChanged: function() {
    this.treeBox.rowCountChanged(0, -this.rowCount);
    this.treeBox.invalidate();
    
    this._applyFilter();
    
    this.rowCount = this.data.length;
    this.treeBox.rowCountChanged(1, this.data.length);

    // re-apply sort and update the count
    this.sortColumn();
    this._updateCountLabel();
  },
  
  /**
   * When preferences have changed, update the display accordingly.
   *
   * @param domElem {DOM element}
   *        the preference DOM element that has changed
   */
  prefsChanged: function(domElem) {
    switch (domElem.id) {
      case "filterMlMatchCase":
        this.prefHandler.setSearchCaseSensitive(domElem.checked);
        break;
    }
  },

  getAll: function() {
    return this.alldata;
  },

  getAllDisplayed: function() {
    return this.data;
  },
  
  /**
   * Return the selected multiline items.
   *
   * @returns {Array}
   *          Array of multiline items
   */
  getSelected: function() {
    var selected = [];
    var start = new Object();
    var end = new Object();
    var selection = this._getSelection();
    if (!selection) {
      return selected;
    }
    var rangeCount = selection.getRangeCount();
    for (var r = 0; r < rangeCount; r++) {
      selection.getRangeAt(r,start,end);
      for (var v = start.value; v <= end.value; v++){
        selected.push({
          id:         this.data[v].id,
          name:       this.data[v].name,
          type:       this.data[v].type,
          formid:     this.data[v].formid,
          content:    this.data[v].content,
          host:       this.data[v].host,
          url:        this.data[v].url,
          firstsaved: this.data[v].firstsaved,
          lastsaved:  this.data[v].lastsaved
        });
      }
    }
    return selected;
  },

  /**
   * Get the number of selected cleanup criteria.
   *
   * @returns {number}
   *          the number of selected cleanup criteria items
   */
  getSelectCount: function() {
    var selected = 0;
    var start = new Object();
    var end = new Object();
    var selection = this._getSelection();
    if (!selection) {
      return 0;
    }
    var rangeCount = selection.getRangeCount();
    for (var r = 0; r < rangeCount; r++) {
      selection.getRangeAt(r,start,end);
      for (var v = start.value; v <= end.value; v++) {
        ++selected;
      }
    }
    return selected;
  },

  /**
   * Read general preferences and synchronize with settings displayed by UI.
   */
  readAndShowPreferences: function() {
    // No preferences (yet) to synchronize
  },

  /**
   * Test if a filter is in effect
   */
  isDataFiltered: function() {
    return !(this.alldata.length == this.rowCount);
  },

  //----------------------------------------------------------------------------
  // Helper methods
  //----------------------------------------------------------------------------

  /**
   * Workaround for this.treeBox.view.selection.
   * Cannot access this.treeBox.view.selection without a warning in FF4
   * because this.treeBox.view is [xpconnect wrapped]
   * (Warning: reference to undefined property this.treeBox.view)
   */
  _getSelection: function() {
    var tbox = this.treeBox;
    var view = tbox.view;
    if (view.selection) {
      return view.selection;
    }
    return null;
  },
  
  /**
   * Filter on content.
   */
  _applyFilter: function() {
    var filterText = document.getElementById("filterMLText").value;
    var currentHostOnly = document.getElementById("displayhostonly").checked;
    
    var host = "";
    if (currentHostOnly) {

      if (window.opener) {
        var curWindow = window.opener.opener ? window.opener.opener : window.opener;
        var mainDocument = curWindow.content.document;
        if (mainDocument) {
          if (mainDocument.baseURIObject.schemeIs("file")) {
            host = "localhost";
          } else if ("about" != mainDocument.baseURIObject.scheme) {
            host = mainDocument.baseURIObject.host;
          }
        }
      }
    }
    
    this.data = [];
    for(var ii=0; ii<this.alldata.length; ii++) {

      if ("" == host || host == this.alldata[ii].host) {
        if ("" == filterText || FhcUtil.inStr(this.alldata[ii].content, filterText)) {
          this.data.push(this.alldata[ii]);
        }
      }
    }
  },

  /**
   * Update the count-label with the current state.
   */
  _updateCountLabel: function() {
    var msg = this.bundle.getString("historywindow.itemcount.label", [this.rowCount]);
    if (this.alldata.length > this.rowCount) {
      msg += " " + this.bundle.getString("historywindow.itemcountof.label", [this.alldata.length]);
    }
    this.countLabel.setAttribute("value", msg);
  },

  /**
   * Update the countselect-label with the current state.
   */
  _updateSelectCountLabel: function(selectCount) {
    var msg = (1 > selectCount) ? "" : this.bundle.getString("historywindow.selectcount.label", [selectCount]);
    this.selectCountLabel.setAttribute("value", msg);
  },

  /**
   * Remove multiline items, ask for confirmation if more than 1 item is about
   * to be removed.
   *
   * @param items {Array}
   *        array of selected (at least 1) multiline item
   */
  _removeMultiline: function(items) {
    var prefix = "multilinewindow.prompt.delete.";
    var msg = (1 < items.length)
              ? this.bundle.getString(prefix + "multipleentries", [items.length])
              : this.bundle.getString(prefix + "singleentry");
    if (HistoryWindowControl.confirmDialogWithPref(
        this.bundle.getString(prefix + "title"),  msg, (1 < items.length)))
    {
      window.setCursor("wait");
      try {
        if (this.dbHandler.deleteMultiline(items)) {
          this.repopulateView();
        }
      } finally {
        window.setCursor("auto");
      }
    }
  },

  /**
   * Return the current sorted column (defaults to first column if none found).
   *
   * @returns {DOM element}
   *          the currently sorted column, or the first column if none found
   */
  _getCurrentSortedColumn: function() {
    var sortableCols = ["lastsavedCol", "agelastsavedCol",
                        "firstsavedCol", "agefirstsavedCol", 
                        "mlidCol", "mlformidCol", "mlnameCol", 
                        "contentCol", "typeCol", "mlhostCol", "mlurlCol"];
    var elem, firstColumn, sortedColumn = null;
    for (var ii=0; ii<sortableCols.length; ii++) {
      elem = document.getElementById(sortableCols[ii]);
      if (ii==0) firstColumn = elem;
      if (elem.getAttribute('sortDirection')) {
        sortedColumn = elem;
        break;
      }
    }
    if (!sortedColumn) {
      sortedColumn = firstColumn;
      sortedColumn.setAttribute("sortDirection", "descending");
    }
    return sortedColumn;
  },

  /**
   * Remove up/down arrow in treeheader indicating the sortdirection.
   *
   * @param columnElem {DOM element}
   *        the treecolumn
   */
  _removeSortIndicator: function(columnElem) {
    if (columnElem) columnElem.removeAttribute("sortDirection");
  },

  /**
   * Set the up/down arrow on a treeColumn indicating the sortdirection.
   *
   * @param columnElem {DOM element}
   *        the treecolumn
   *
   * @param ascending {Boolean}
   *        whether or not the sort direction is ascending
   */
  _setSortIndicator: function(columnElem, ascending) {
    if (columnElem) columnElem.setAttribute("sortDirection", ascending ? "ascending" : "descending");
  },

  /**
   * Get the compare function to sort by a specific column in a treelist .
   *
   * @param   columnId {String}
   *          the Id of the column to sort
   *
   * @returns {Function}
   *          the compare function for sorting an array of multiline items
   */
  _getSortCompareFunction: function(columnId) {
    var compareFunc;

    switch(columnId) {
      case "firstsavedCol":
      case "agefirstsavedCol":
        compareFunc = function compare(a, b) {
          var result = a.firstsaved - b.firstsaved;
          return result;
        };
        break;

      case "lastsavedCol":
      case "agelastsavedCol":
        compareFunc = function compare(a, b) {
          var result = a.lastsaved - b.lastsaved;
          return result;
        };
        break;

      case "mlidCol":
        compareFunc = function compare(a, b) {
          var result = FhcUtil.stringCompare(a.id, b.id);
          if (result == 0) result = b.lastsaved - a.lastsaved;
          return result;
        };
        break;

      case "mlformidCol":
        compareFunc = function compare(a, b) {
          var result = FhcUtil.stringCompare(a.formid, b.formid);
          if (result == 0) result = b.lastsaved - a.lastsaved;
          return result;
        };
        break;

      case "mlnameCol":
        compareFunc = function compare(a, b) {
          var result = FhcUtil.stringCompare(a.name, b.name);
          if (result == 0) result = b.lastsaved - a.lastsaved;
          return result;
        };
        break;

      case "contentCol":
        compareFunc = function compare(a, b) {
          var result = FhcUtil.stringCompare(a.content, b.content);
          if (result == 0) result = b.lastsaved - a.lastsaved;
          return result;
        };
        break;

      case "typeCol":
        compareFunc = function compare(a, b) {
          var result = FhcUtil.stringCompare(a.type, b.type);
          if (result == 0) result = b.lastsaved - a.lastsaved;
          return result;
        };
        break;

      case "mlhostCol":
        compareFunc = function compare(a, b) {
          var result = FhcUtil.stringCompare(a.host, b.host);
          if (result == 0) result = b.lastsaved - a.lastsaved;
          return result;
        };
        break;

      case "mlurlCol":
        compareFunc = function compare(a, b) {
          var result = FhcUtil.stringCompare(a.url, b.url);
          if (result == 0) result = b.lastsaved - a.lastsaved;
          return result;
        };
        break;

      default:
        compareFunc = function compare(a, b) {};
        break;
    }
    return compareFunc;
  },


  /**
   * Register a preference listener to act upon relevant changes
   */
  _registerPrefListener: function() {
    var thisHwc = this;
    this.preferenceListener = new FhcUtil.PrefListener("extensions.formhistory.",
      function(branch, name) {
        switch (name) {
          case "searchCaseSensitive":
               // adjust local var to reflect new preference value
               FhcUtil.isCaseSensitive = thisHwc.prefHandler.isSearchCaseSensitive();

               // adjust displayed search control accordingly
               var checkboxElem = document.getElementById("filterMlMatchCase");
               checkboxElem.checked = FhcUtil.isCaseSensitive;

               // apply changes to view
               thisHwc.filterChanged();
               break;
          case "useCustomDateTimeFormat":
          case "customDateTimeFormat":
               if (thisHwc.prefHandler.isUseCustomDateTimeFormat()) {
                 thisHwc.dateHandler.setCustomDateFormat(thisHwc.prefHandler.getCustomDateTimeFormat());
               } else {
                 thisHwc.dateHandler.setCustomDateFormat(null);
               }

               // apply new dateformat to treeview
               this.treeBox.invalidate();
               break;
        }
      });
    this.preferenceListener.register();
  },
 
  /**
   * Unregister the preference listener
   */
  _unregisterPrefListener: function() {
    if (this.preferenceListener) {
      this.preferenceListener.unregister();
      this.preferenceListener = null;
    }
  },

  /**
   * Register the database observer.
   */
  _registerDbObserver: function() {
    this.dbObserver = {
      observe: function(subject, topic, state) {
        MultilineWindowControl.repopulateView();
      },
      register: function() {
        Components.classes["@mozilla.org/observer-service;1"]
                  .getService(Components.interfaces.nsIObserverService)
                  .addObserver(this, "multiline-store-changed", false);
      },
      unregister: function() {
        Components.classes["@mozilla.org/observer-service;1"]
                  .getService(Components.interfaces.nsIObserverService)
                  .removeObserver(this, "multiline-store-changed");
      }
    };
    this.dbObserver.register();
   },

  /**
   * Unregister the database observer.
   */
   _unregisterDbObserver: function() {
     this.dbObserver.unregister();
     delete this.dbObserver;
   },

  //----------------------------------------------------------------------------
  // Implementation of the nsITreeView interface
  //----------------------------------------------------------------------------

  // get the cell value (text column)
  getCellText: function(row, column) {
    var multilineObj = this.data[row];
    switch(column.id) {
      case "firstsavedCol":
        return this.dateHandler.toDateString(multilineObj.firstsaved);
      case "agefirstsavedCol":
        return this.dateHandler.getFuzzyAge(this.nowdate, multilineObj.firstsaved);
      case "lastsavedCol":
        return this.dateHandler.toDateString(multilineObj.lastsaved);
      case "agelastsavedCol":
        return this.dateHandler.getFuzzyAge(this.nowdate, multilineObj.lastsaved);
      case "mlidCol":
        return multilineObj.id;
      case "mlformidCol":
        return multilineObj.formid;
      case "mlnameCol":
        return multilineObj.name;
      case "contentCol":
        return multilineObj.content;
      case "typeCol":
        return multilineObj.type;
      case "mlhostCol":
        return multilineObj.host;
      case "mlurlCol":
        return multilineObj.url;
      default:
        return null;
    }
  },

  isEditable: function(idx, col)  {
    return false;
  },

  setTree: function(treeBox) {
    this.treeBox = treeBox;
  },

  isContainer: function(row) {
    return false;
  },

  isSeparator: function(row) {
    return false;
  },

  isSorted: function() {
    return false;
  },

  getLevel: function(row) {
    return 0;
  },

  getImageSrc: function(row,col) {
    return null;
  },

  getRowProperties: function(row) {
    var aserv = Components.classes["@mozilla.org/atom-service;1"]
              .getService(Components.interfaces.nsIAtomService);
    var styleProp = this.prefHandler.getCustomTreeSkin();
    return aserv.getAtom(styleProp).toString(); 
},

  getCellProperties: function(row,col) {
    var aserv;
    switch(col.id) {
      case "mlurlCol":
        aserv=Components.classes["@mozilla.org/atom-service;1"]
                  .getService(Components.interfaces.nsIAtomService);
        return aserv.getAtom("urlColumn").toString();
        break;
      default:
        break;
    }
    return "";
  },

  getColumnProperties: function(colid,col) {
    return "";
  },

  cycleHeader: function(col) {
  },
  
  
  //----------------------------------------------------------------------------
  // Implementation of the nsIObserverService interface
  //----------------------------------------------------------------------------

  observe: function(subject, topic, data) {
	dump("Observed topic: " + topic + "\n");
  }
}
