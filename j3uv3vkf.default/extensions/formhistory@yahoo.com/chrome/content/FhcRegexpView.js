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
 * The Original Code is FhcRegexpView.
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
 * Regexp-view Methods for the regexp tree in FhcPreferences.
 *
 * Dependencies:
 *   HistoryWindowControl.xul, HistoryWindowControl.js, FhcUtil.js,
 *   FhcDbHandler.js, FhcPredefinedRegexp.js
 *
 */
const FhcRegexpView = {
  // nsITreeView attributes
  treeBox: null,
  rowCount: 0,
  atomService: null,
  //
  countLabel: "",
  selectCountLabel: "",
  dbHandler: null,
  bundle: null,
  prefHandler: null,
  alldata: [],
  data: [],
 
  /**
   * Initialize.
   */
  init: function(aDbHandler, aBundle, aPrefHandler) {
    // initialize tree
    var formTree = document.getElementById("regexpTree");
    formTree.view = this;
    
    // for treecell property (checkbox)
    this.atomService = Components.classes["@mozilla.org/atom-service;1"]
                        .getService(Components.interfaces.nsIAtomService);
                        
    // initialize handlers
    this.dbHandler = aDbHandler;
    this.bundle = aBundle;
    this.prefHandler = aPrefHandler;

    // read all regexp from the db into the treeView
    this.alldata = this.dbHandler.getAllRegexp();
    if (null == this.alldata) {
      // major problem with Cleanup DB!
      dump('\nMajor problem with Cleanup DB! (folder and/or file permissions?)\n');
      // return empty data so the rest of the app keeps working
      this.alldata = [];
    }
    
    // if (initially) empty, populate with predefined values
    if (0 == this.alldata.length) {
      var predefHandler = new FhcPredefinedRegexp(aDbHandler, aBundle);
      predefHandler.addPredefinedRegexpToDb();
      //delete predefHandler;
      // read again
      this.alldata = this.dbHandler.getAllRegexp();
    }

    this.countLabel = document.getElementById("itemCount");
    this.selectCountLabel = document.getElementById("selectCount");
    this._applyFilter();
  },

  /**
   * Extension close.
   */
  destroy: function() {
    return true;
  },

  /**
   * Repopulate again.
   */
  rePopulate: function() {
    this.alldata = this.dbHandler.getAllRegexp();
    this._applyFilter();
  },

  /**
   * Right-click popup contextmenu activation from FhcPreferences Dialog.
   *
   * @param event {Event}
   */
  menuPopup: function(event) {
    var selected = this.getSelected();
    document.getElementById("mnEditRegexp").setAttribute("disabled", (1 != selected.length));
    document.getElementById("mnDeleteRegexp").setAttribute("disabled", 0 == selected.length);
    return true;
  },

  /**
   * Popup menu-item selected, perform the action indicated by doAction.
   * Action is insert, edit or delete. Update the countlabel accordingly.
   *
   * @param doAction {String}
   *        one of ["Insert, "Edit", "Delete"]
   */
  editAction: function(doAction) {
    var selected = this.getSelected();
    if (doAction == "Insert") {
      this._addRegexp();
    } else if (selected.length > 0) {
      switch(doAction) {
        case "Edit":
          this._editRegexp(selected);
          break;
        case "Delete":
          this._removeRegexp(selected);
          break;
      }
    }
    this._updateCountLabel();
  },

  /**
   * Tree row is selected, enable/disable buttons and update selectcount label.
   *
   * @param event {Event}
   */
  treeSelect: function(event) {
    var selectCount = this.getSelectCount();

    // enable remove-button only when at leat 1 item is selected
    var btnRemove = document.getElementById("removeSelected");
    btnRemove.setAttribute("disabled", 0 == selectCount);

    // enable edit-button only when 1 item is selected
    var btnedit = document.getElementById("edit");
    btnedit.setAttribute("disabled", 1 != selectCount);

    // display selectCount
    this._updateSelectCountLabel(selectCount);
  },

  /**
   * Doubleclicked on a treeitem: start edit item.
   *
   * @param event {Event}
   */
  treeDblclick: function(event) {
    var selected = this.getSelected();

    var idCol = "";
    var editCol = document.getElementById("regexpTree").editingColumn;
    if (editCol != null) {
        idCol = editCol.id;
    }
    if ("" == idCol) {
      this._editRegexp(selected);
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
    // save original selection
    var orgSelection = this.getSelected();

    this.sortColumn(treeColumn, true);

    this.restoreSelection(orgSelection);
    this.treeBox.invalidate();
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
   * Return the selected regexp.
   *
   * @returns {Array}
   *          Array of regexp items
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
          id:          this.data[v].id,
          description: this.data[v].description,
          category:    this.data[v].category,
          regexp:      this.data[v].regexp,
          caseSens:    this.data[v].caseSens,
          useFor:      this.data[v].useFor,
          regexpType:  this.data[v].regexpType
        });
      }
    }
    return selected;
  },

  /**
   * Get the number of selected regexp.
   *
   * @returns {number}
   *          the number of selected regexp items
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
   * Check if a regexp already exist with the same properties.
   *
   * @param   regexp {Object}
   *          the regexp to test
   *
   * @returns {Boolean}
   *          Whether or not the regexp exists
   */
  regexpExists: function(regexp) {
    // iterate over all regexp
    for (var it=0; it < this.alldata.length; it++) {
      if (this._isRegexpEqual(regexp, this.alldata[it])) {
        return true;
      }
    }
    return false;
  },

  /**
   * Set the filter to names or values.
   *
   * @param namesOrValues {String}
   *        set filter to either "names" or "values"
   */
  setFilter: function(namesOrValues) {
    document.getElementById("cbShowNames").checked = ("names" == namesOrValues);
    document.getElementById("cbShowValues").checked = ("values" == namesOrValues);
    this._applyFilter();
  },

  /**
   * Called whenever the filter is changed (show names/values)
   */
  filterChanged: function(checkboxElem) {
    // make sure always one checkbox is checked
    // handy: when both unchecked you see only regexp available for both
    //var showNamesElm  = document.getElementById("cbShowNames");
    //var showValuesElm = document.getElementById("cbShowValues");
    //if (!showNamesElm.checked && !showValuesElm.checked) {
    //  if ("cbShowNames" == checkboxElem.id) {
    //    showValuesElm.checked = true;
    //  } else {
    //    showNamesElm.checked = true;
    //  }
    //}
    this._applyFilter();
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

  _applyFilter: function() {
    var showNames  = document.getElementById("cbShowNames").checked;
    var showValues = document.getElementById("cbShowValues").checked;

    // save original selection
    var orgSelection = this.getSelected();

    // clear view
    this.treeBox.rowCountChanged(0, -this.data.length);

    if (showNames && showValues) {
      this.data = this.alldata.concat();
    } else {
      this.data = [];
      for (var it=0; it<this.alldata.length; it++) {
        if (("B" == this.alldata[it].useFor) ||
            (showNames && "N" == this.alldata[it].useFor) ||
            (showValues && "V" == this.alldata[it].useFor))
        {
          this.data.push(this.alldata[it]);
        }
      }
    }

    this.rowCount = this.data.length;
    this.treeBox.rowCountChanged(0, this.data.length);

    // Apply sorting
    this.sortColumn();

    this.restoreSelection(orgSelection);
    this.treeBox.invalidate();

    // display count
    this._updateCountLabel();
  },

  /**
   * Update the count-label with the current state.
   */
  _updateCountLabel: function() {
    var msg = this.bundle.getString("historywindow.itemcount.label", [this.rowCount]);
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
   * Add one Regexp, use a dialog to obtain the name and/or value.
   *
   * @return {Boolean}
   *         true when user clicked Ok, false when cancel was clicked
   */
  _addRegexp: function() {
    var regexpExistCallbackFunction = function(newRegexp) {
          return FhcRegexpView.regexpExists(newRegexp);
        };

    // default useFor depending on filter
    var isNames = document.getElementById("cbShowNames").checked;
    var isValues = document.getElementById("cbShowValues").checked;
    var defaultUseFor = "B";
    if (isNames && !isValues) {
      defaultUseFor = "N";
    } else if (!isNames && isValues) {
      defaultUseFor = "V";
    }

    var params = {
        inn: {description: "",
              category:    "",
              regexp:      "",
              caseSens:    0,
              useFor:      defaultUseFor,
              regexpType:  ""
             },
        out: null,
        action: "add",
        regexpExistCallback: regexpExistCallbackFunction
      };
    FhcPreferences.showFhcEditRegexp(params);
    var result = false;
    if (params.out) {
      result = true;
      var newRegexp = {
            id:          -1,
            description: params.out.description,
            category:    params.out.category,
            regexp:      params.out.regexp,
            caseSens:    params.out.caseSens,
            useFor:      params.out.useFor,
            regexpType:  params.out.regexpType
          };
      var newIndex = this.dbHandler.addRegexp(newRegexp);
      if (newIndex) {
        newRegexp.id = newIndex;

        this.alldata.push(newRegexp);
        this._applyFilter();

        // select and scroll new item into view
        var index = this._findRegexpIndex(newRegexp.id);
        if (-1 < index) {
          var selection = this._getSelection();
          if (selection) {
            selection.select(index);
          }
          this.treeBox.ensureRowIsVisible(index);
        }
      }
    }
    return result;
  },

  /**
   * Edit a regexp, use a dialog to obtain the new name/value.
   *
   * @param selected {Array}
   *        array of selected (1) regexp items
   */
  _editRegexp: function(selected) {
    var regexpExistCallbackFunction = function(changedRegexp) {
          if (FhcRegexpView._isRegexpEqual(selected[0], changedRegexp)) {
            // nothing changed, no error
            return false;
          } else {
            return FhcRegexpView.regexpExists(changedRegexp);
          }
    };

    if (selected.length == 1) {
      var params = {
        inn:{description: selected[0].description,
              category:    selected[0].category,
              regexp:      selected[0].regexp,
              caseSens:    selected[0].caseSens,
              useFor:      selected[0].useFor,
              regexpType:  selected[0].regexpType
            },
        out:null,
        action:"edit",
        regexpExistCallback: regexpExistCallbackFunction
      };
      FhcPreferences.showFhcEditRegexp(params);
      if (params.out) {
        var editRegexp = {
          id:          selected[0].id,
          description: params.out.description,
          category:    params.out.category,
          regexp:      params.out.regexp,
          caseSens:    params.out.caseSens,
          useFor:      params.out.useFor,
          regexpType:  "" /*params.out.regexpType*/
        };
        if (this.dbHandler.updateRegexp(editRegexp)) {
          var index = this._findRegexpAllIndex(editRegexp.id);
          if (-1 < index) {
            // Update regexp in data storage
            this.alldata[index].description = editRegexp.description;
            this.alldata[index].category    = editRegexp.category;
            this.alldata[index].regexp      = editRegexp.regexp;
            this.alldata[index].caseSens    = editRegexp.caseSens;
            this.alldata[index].useFor      = editRegexp.useFor;
            this.alldata[index].regexpType  = editRegexp.regexpType;

            // Rebuild display
            this._applyFilter();

            // select and scroll edited item into view
            index = this._findRegexpIndex(editRegexp.id);
            if (-1 < index) {
              var selection = this._getSelection();
              if (selection) {
                selection.select(index);
              }
              this.treeBox.ensureRowIsVisible(index);
            }
          }
        }
      }
    }
  },

  /**
   * Ask user if it is okay to delete.
   */
  _confirmDelete: function() {
    var title   = this.bundle.getString("regexpview.prompt.delete.title");
    var message = this.bundle.getString("regexpview.prompt.delete");
    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                    .getService(Components.interfaces.nsIPromptService);
    var flags = prompts.BUTTON_TITLE_OK * prompts.BUTTON_POS_0 +
                prompts.BUTTON_TITLE_NO * prompts.BUTTON_POS_1;
    var check = {value: false};
    var button = prompts.confirmEx(window, title, message, flags,
                 "", "", "", "", check);
                 
    return (button == 0);
  },

  /**
   * Remove regexp.
   *
   * @param regexp {Array}
   *        array of selected (at least 1) regexp items
   */
  _removeRegexp: function(regexp) {
    if (!this._confirmDelete()) {
      return;
    }
    window.setCursor("wait");
    try {
      if (this.dbHandler.deleteRegexp(regexp)) {
        try {
          var regexpId, index;
          for (var it=0; it < regexp.length; it++) {
            regexpId = regexp[it].id;
            index = this._findRegexpAllIndex(regexpId);
            if (-1 < index) this.alldata.splice(index, 1);
          }
        } finally {
          // rebuild display
          this._applyFilter();
        }
      }
    } finally {
      window.setCursor("auto");
    }
  },

  /**
   * Update a single regexp already changed in data[];
   *
   * @param regexp {Object}
   *        a single regexp object
   */
  _updateRegexp: function(regexp) {
    // update the database
    this.dbHandler.updateRegexp(regexp);

    // update treeview
    this.treeBox.rowCountChanged(0, -this.rowCount);
    this.treeBox.invalidate();
    this.treeBox.rowCountChanged(1, this.data.length);
    
    this.sortColumn();

    // select and scroll edited item (back) into view
    var index = this._findRegexpIndex(regexp.id);
    if (-1 < index) {
      var selection = this._getSelection();
      if (selection) {
        selection.select(index);
      }
      this.treeBox.ensureRowIsVisible(index);
    }
  },

  /**
   * Test if given regexp are equal in all their relevant properties.
   *
   * @param reg1 {Object}
   *        regexp 1
   *
   * @param reg2 {Object}
   *        regexp 2
   *
   * @return {Boolean}
   *         whether or not the 2 regexp are equal
   */
  _isRegexpEqual: function(reg1, reg2) {
    return (reg1.regexp == reg2.regexp) &&
           (reg1.caseSens == reg2.caseSens);
  },

  /**
   * Find a regexp by Id in an array of regexp, return the array index if
   * found, -1 otherwise.
   *
   * @param  regexpId {String}
   *         the Id of the regexp to be found
   *
   * @returs {Number}
   *         the array index if found, otherwise -1
   */
  _findRegexpIndex: function(regexpId) {
    // iterate over all regexp
    for (var it=0; it < this.data.length; it++) {
      if (this.data[it].id == regexpId) {
        return it;
      }
    }
    return -1;
  },

  /**
   * Find a regexp by Id in alldata-rray of regexp, return the array index if
   * found, -1 otherwise.
   *
   * @param  regexpId {String}
   *         the Id of the regexp to be found
   *
   * @returs {Number}
   *         the array index if found, otherwise -1
   */
  _findRegexpAllIndex: function(regexpId) {
    // iterate over all regexp
    for (var it=0; it < this.alldata.length; it++) {
      if (this.alldata[it].id == regexpId) {
        return it;
      }
    }
    return -1;
  },

  /**
   * Return the current sorted column (defaults to first column if none found).
   *
   * @returns {DOM element}
   *          the currently sorted column, or the first column if none found
   */
  _getCurrentSortedColumn: function() {
    var sortableCols = ["descriptionCol", "categoryCol", "regexpCol", "useforCol"];
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
      sortedColumn.setAttribute("sortDirection", "ascending");
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
   * Get the compare function to sort by a specific column in a treelist.
   *
   * @param   columnId {String}
   *          the Id of the column to sort
   *
   * @returns {Function}
   *          the compare function for sorting an array of regexp items
   */
  _getSortCompareFunction: function(columnId) {
    var compareFunc;

    switch(columnId) {
      case "descriptionCol":
        compareFunc = function compare(a, b) {
          var result = FhcUtil.stringCompare(a.description, b.description);
          if (result == 0) result = FhcUtil.stringCompare(a.category, b.category);
          if (result == 0) result = FhcUtil.stringCompare(a.regexp, b.regexp);
          if (result == 0) result = a.id - b.id;
          return result;
        };
        break;

      case "categoryCol":
        compareFunc = function compare(a, b) {
          var result = FhcUtil.stringCompare(a.category, b.category);
          if (result == 0) result = FhcUtil.stringCompare(a.description, b.description);
          if (result == 0) result = FhcUtil.stringCompare(a.regexp, b.regexp);
          if (result == 0) result = a.id - b.id;
          return result;
        };
        break;

      case "regexpCol":
        compareFunc = function compare(a, b) {
          var result = FhcUtil.stringCompare(a.regexp, b.regexp);
          if (result == 0) result = FhcUtil.stringCompare(a.category, b.category);
          if (result == 0) result = FhcUtil.stringCompare(a.description, b.description);
          if (result == 0) result = a.id - b.id;
          return result;
        };
        break;

      case "useforCol":
        compareFunc = function compare(a, b) {
          var result = FhcUtil.stringCompare(a.useFor, b.useFor);
          if (result == 0) result = FhcUtil.stringCompare(a.category, b.category);
          if (result == 0) result = FhcUtil.stringCompare(a.description, b.description);
          if (result == 0) result = FhcUtil.stringCompare(a.regexp, b.regexp);
          if (result == 0) result = a.id - b.id;
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
   * Convert useFor char into locale String.
   *
   * @param  useFor {String}
   *         the char indicating the usage (N, V, B)
   *
   * @return {String}
   *         useFor translate to a locale String (Name, Value, Both)
   */
  _getUseforText: function(useFor) {
    switch(useFor) {
      case "N":return this.bundle.getString("regexpview.usefor.name");
      case "V":return this.bundle.getString("regexpview.usefor.value");
      case "B":return this.bundle.getString("regexpview.usefor.both");
    }
    return "";
  },

  /**
   * restore a selection.
   *
   */
  restoreSelection: function(entriesToSelect) {
    // create a hashmap of id's from the entriesToSelect
    var key, hashMap = new Array();
    for(var ii=0; ii < entriesToSelect.length; ii++) {
      key = entriesToSelect[ii].id;
      hashMap[key] = key;
    }

    // set the _tmpSelected flag in preparation of the _restoreSelectionFast
    // method
    for (var it=0; it < this.data.length; it++) {
      this.data[it]._tmpSelected = !(undefined == hashMap[this.data[it].id]);
    }
    //delete hashMap;

    // restore the selection
    this._restoreSelectionFast();
  },

  /**
   * Restore selection(s) from the data itself, very fast because
   * whether or not data is selected is stored inside the data itself.
   * Only works when the data itself is not changed between save & restore!
   */
  _restoreSelectionFast: function() {
    var selection = this._getSelection();
    if (!selection) {
      return;
    }
    // clear the current selection
    selection.clearSelection();

    this.treeBox.beginUpdateBatch();
    var firstSelectedRow = null, rangeBegin;
    for (var ii=0; ii < this.data.length; ii++) {
      if (this.data[ii]._tmpSelected) {
        if (!firstSelectedRow) firstSelectedRow = ii;
        // speedup: select ranges
        rangeBegin = ii;
        while(ii+1 < this.data.length && this.data[ii+1]._tmpSelected) {
          ii++;
        }
        selection.rangedSelect(rangeBegin, ii, true);
      }
    }
    if (firstSelectedRow != null) {
      this.treeBox.ensureRowIsVisible(firstSelectedRow);
    }
    this.treeBox.endUpdateBatch();
  },



  //----------------------------------------------------------------------------
  // Implementation of the nsITreeView interface
  //----------------------------------------------------------------------------
  getCellText: function(row, column) {
    var regexpObj = this.data[row];
    switch(column.id) {
      case "descriptionCol":
        return regexpObj.description;
      case "categoryCol":
        return regexpObj.category;
      case "regexpCol":
        return regexpObj.regexp;
      case "useforCol":
        return this._getUseforText(regexpObj.useFor);
      case "indexCol":
        return regexpObj.id;
      default:
        return null;
    }
  },
  
  // get the cell value (checkbox-column)
  getCellValue: function(row, col) {
    var regexpObj = this.data[row];
    switch(col.id) {
      case "caseCol":
        return (1==regexpObj.caseSens);
      default:
        return false;
    }
  },

  // update the cell value (text-column)
  setCellText: function(row, column, newValue) {
    var regexpObj = this.data[row];
    var oldValue = "";
    switch(column.id) {
      case "descriptionCol":
           oldValue = regexpObj.description;
           regexpObj.description = newValue;
           break;
      case "categoryCol":
           oldValue = regexpObj.category;
           regexpObj.category = newValue;
           break;
      case "regexpCol":
           oldValue = regexpObj.regexp;
           regexpObj.regexp = newValue;
           break;
    }
    if (oldValue != newValue) {
      regexpObj.regexpType = "";
      this._updateRegexp(regexpObj);
    }
  },

  // update the cell value (checkbox-column)
  setCellValue: function(row, col, newValue) {
    var regexpObj = this.data[row];
    var oldValue = null;
    var newValueNum = ("true" == newValue) ? "1" : "0";
    switch(col.id) {
      case "caseCol":
           oldValue = regexpObj.caseSens;
           regexpObj.caseSens = newValueNum;
           break;
    }

    if (oldValue != null && oldValue != newValueNum) {
      regexpObj.regexpType = "";
      this._updateRegexp(regexpObj);
    }
  },

  isEditable: function(idx, col)  {
    // all columns editable except the index column
    return (col.id != "indexCol" && col.id != "useforCol");
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
    return "";
  },

  getColumnProperties: function(colid,col) {
    return "";
  },

  cycleHeader: function(col) {
  }
}
