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
 * The Original Code is HistoryTreeView.
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
 * HistoryTreeView implements nsITreeView 
 *
 * Methods for the history tree of the HistoryWindowControl
 *
 * Dependencies: FhcUtil.js, FhcDateHandler.js
 */
function HistoryTreeView(fhcDatehandler, fhcPrefHandler) {
  // date handler
  this.dateHandler = fhcDatehandler;
  this.prefHandler = fhcPrefHandler;
  
  // Current date
  this.nowDate = this.dateHandler.getCurrentDate();
  
  // nsITreeView attribute rowCount
  this.rowCount = 0;
  
  // nsITreeView attribute treeBox
  this.treeBox = null;
  
  // datasets containing items of type FormHistoryItem
  this.alldata = [];  // complete initial dataset
  this.data = [];     // displayed (sub)set (might be filtered)
  
  // pagefilter (if not null, only display entries from this set)
  this.fieldNamesFilter = null;

  // custom filter (function that filters the dataset)
  this.customFilter = null,

  // custom filter2 (function that filters the dataset)
  this.customFilter2 = null,

  // callback function for editable treecolumn
  this.editColumnCallBackFunc = null,

  //current active filterValue (name/value)
  this.filterValue = "";
}


HistoryTreeView.prototype = {
  // add a row to the view
  addRow: function(id, name, value, used, first, last, place) {
    this.nowDate = this.dateHandler.getCurrentDate();
    this._addData(new FormHistoryItem(id, name, value, used, first, last, place));
    this.treeBox.rowCountChanged(this.data.length-1, 1);
  },
  
  // sort a specific column
  sortColumn: function(treeColumn, toggle) {
    var curSortedCol = this._getCurrentSortedColumn();

    if (toggle == undefined) toggle = false;
    if (treeColumn == undefined) treeColumn = curSortedCol;
    
    // save original selection
    //var orgSelection = this.getSelected();
    this._saveSelectionFast();

    this._adjustSortOrder(treeColumn, curSortedCol, toggle);

    // restore selection
    //this.restoreSelection(orgSelection);
    this._restoreSelectionFast();

    // repaint    
    this.treeBox.invalidate();
    //this.treeBox.scrollToRow(topVisibleRow);
  },
  
  // Filter items
  applyFilter: function(newValue) {
    if (newValue || ""==newValue) {
      this.filterValue = newValue;
    }
    
    // save original selection
    var orgSelection = this.getSelected();

    // clear view
    this.treeBox.rowCountChanged(0, -this.data.length);

    // initially set displayed data to include all data
    // clone by using the concat() method
    this.data = this.alldata.concat();

    // filter on fieldname/value
    this._applyNameValueFilter();

    // filter on fieldnames only
    this._applyFieldnameFilter();

    // custom filter
    if (this.customFilter) {
      // call the custom callback function
      this.data = this.customFilter(this.data);
    }

    // custom filter2
    if (this.customFilter2) {
      // call the custom callback function
      this.data = this.customFilter2(this.data);
    }

    // set new rowcount
    this.rowCount = this.data.length;
    
    // restore sortorder
    var curCol = this._getCurrentSortedColumn();
    this._adjustSortOrder(curCol, curCol, false);
    
    // repaint view
    this.treeBox.rowCountChanged(0, this.data.length);

    // restore selection
    this.restoreSelection(orgSelection);
    this.treeBox.invalidate();
  },

  // Only display entries with specified fieldnames (all if fieldNames is empty)
  setFieldnameFilter: function(fieldNames) {
    this.fieldNamesFilter = fieldNames;
    this.applyFilter();
  },
  
  // Set a custom filter by providing a callback function
  // function takes array of entries as parameter and return the filtered array
  setCustomFilter: function(callBackFunction) {
    this.customFilter = callBackFunction;
    this.applyFilter();
  },

  // Set a second custom filter by providing a callback function
  // function takes array of entries as parameter and return the filtered array
  setCustomFilter2: function(callBackFunction) {
    this.customFilter2 = callBackFunction;
    this.applyFilter();
  },

  setEditColumnCallBackFunction: function(callbackFunction) {
    this.editColumnCallBackFunc = callbackFunction;
  },

  // get All entries
  getAll: function() {
    return this.alldata;
  },
  
  // get All displayed entries
  getAllDisplayed: function() {
    return this.data;
  },

  // Get the current selected column
  getSelectedColumn: function() {
    var selection = this._getSelection();
    if (selection) {
      return selection.currentColumn;
    }
    return null;
  },

  // get selected entries
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
        selected.push(new FormHistoryItem(
          this.data[v].id,
          this.data[v].name,
          this.data[v].value,
          this.data[v].used,
          this.data[v].first,
          this.data[v].last,
          this.data[v].place)
        );
      }
    }
    return selected;
  },

  // restore a selection
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
  
  // get no of selected entries
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
      for (var v = start.value; v <= end.value; v++){
        ++selected;
      }
    }
    return selected;
  },
  
  // add a new entry
  addEntry: function(entry) {
    //dump('New entry: name=' + entry.name + '  value=' + entry.value + '  id=' + entry.id + '\n\n');
    this.addRow(entry.id, entry.name, entry.value, entry.used, entry.first, entry.last, entry.place);
    // rebuild display
    this.applyFilter();
    // if new item is visible (not filterd out), select and scroll into view
    var index = this._getDataIndex(entry.id);
    if (-1 < index) {
      var selection = this._getSelection();
      if (selection) {
        selection.select(index);
      }
      this.treeBox.ensureRowIsVisible(index);
    }
  },
  
  // Update an existing entry (index might change, because of sortorder/filter)
  updateEntry: function(entry) {
    //dump('Update treeview entry: name=' + entry.name + '  value=' + entry.value + '  id=' + entry.id + '\n\n');
    var index = this._getAllDataIndex(entry.id);
    if (-1 < index) {
      // Update entry in alldata storage
      this.alldata[index].name = entry.name;
      this.alldata[index].value = entry.value;
      this.alldata[index].used = entry.used;
      this.alldata[index].first = entry.first;
      this.alldata[index].last = entry.last;
      this.alldata[index].place = entry.place;
      // Rebuild (filtered) data + display
      this.applyFilter();
    }
  },
  
  // Remove all entries from given entries array
  deleteEntries: function(entries) {
    //dump('Remove ' + entries.length + ' entries!\n');
    this.beginBatch();
    var index;
    try {
      for (var it=0; it < entries.length; it++) {
        var entryId = entries[it].id;
        index = this._getDataIndex(entryId);
        this._removeData(entryId);
        this.treeBox.rowCountChanged(index, -1);
      }
    } finally {
      // make sure endbatch is called
      this.endBatch();
      this.treeBox.invalidate();
    }
    // select the next available entry (or last entry if we are at the bottom)
    if (index == this.rowCount && this.rowCount > 0) {
      index = this.rowCount -1;
    }
    if (index < this.rowCount) {
      this.treeBox.ensureRowIsVisible(index);
      var selection = this._getSelection();
      if (selection) {
        selection.toggleSelect(index);
      }
    }
  },
  
  // Get all entries with the specified fieldname
  getEntriesByName: function(fieldname) {
    //dump('getEntriesByName\n');
    var result = [];
    // iterate over all entries
    for (var it=0; it < this.data.length; it++) {
      if (this.data[it].name == fieldname) {
      result.push(this.data[it]);
      }
    }
    return result;
  },

  // Get all entries with the specified value
  getEntriesByValue: function(value) {
    //dump('getEntriesByValue\n');
    var result = [];
    // iterate over all entries
    for (var it=0; it < this.data.length; it++) {
      if (this.data[it].value == value) {
      result.push(this.data[it]);
      }
    }
    return result;
  },
  
  // Select al entries in the tree with the given value
  selectEntriesByValue: function(aValue) {
    var selection = this._getSelection();
    if (selection) {
      var firstSelect;

      // iterate over all entries
      for (var it=0; it < this.data.length; it++) {
        if (this.data[it].value == aValue) {
          selection.toggleSelect(it);
          if (!firstSelect) firstSelect = it;
        }
      }
      if (firstSelect) {
        this.treeBox.ensureRowIsVisible(firstSelect);
      }
    }
  },

  // Select al entries in the tree by Index from the aIndices array
  selectEntriesByIndex: function(aIndices) {
    var selection = this._getSelection();
    if (selection) {
      var firstSelect;

      // iterate over all indices
      for (var it=0; it < aIndices.length; it++) {
        selection.toggleSelect(aIndices[it]);
        if (!firstSelect) firstSelect = aIndices[it];
      }
      if (firstSelect) {
        this.treeBox.ensureRowIsVisible(firstSelect);
      }
    }
  },
  
  // Select all
  selectAll: function() {
    var selection = this._getSelection();
    if (selection) {
      selection.selectAll();
    }
  },
  
  // Deselect all
  selectNone: function() {
    var selection = this._getSelection();
    if (selection) {
      selection.clearSelection();
    }
  },
  
  // Invert selection
  selectInvert: function() {
    var selection = this._getSelection();
    if (selection) {
      // method selection.invertSelection() is not implemented!
      this.beginBatch();

      var beginRange, isSelected;
      for (var it=0; it < this.data.length; it++) {
        //selection.toggleSelect(it);
        isSelected = selection.isSelected(it);
        beginRange = it;
        while(it+1<this.data.length && isSelected==selection.isSelected(it+1)) {
          ++it;
        }
        if (isSelected) {
          selection.clearRange(beginRange, it);
        } else {
          selection.rangedSelect(beginRange, it, true);
        }
      }
      
      this.endBatch();
    }
  },

  // Test if a given entry already exists
  entryExists: function(newEntry) {
    for (var ii=0; ii<this.alldata.length; ii++) {
      if (this.alldata[ii].name == newEntry.name && this.alldata[ii].value == newEntry.value)
        return true;
    }
    return false;
  },

  // Extract from the entriesToTest only the entries that do not already exist
  extractUniqueEntries: function(entriesToTest) {
    var uniqueEntries = [];

    // create a name-value hashmap of the existing formhistory entries
    var key;
    var hashMap = new Array();
    for(var ii=0; ii<this.alldata.length; ii++) {
      key = this.alldata[ii].name + "]=[" + this.alldata[ii].value;
      if (undefined == hashMap[key])
        hashMap[key] = key;
    }

    // check entriesToTest against hashmap
    for (var jj=0; jj<entriesToTest.length; jj++) {
      key = entriesToTest[jj].name + "]=[" + entriesToTest[jj].value;
      if (undefined == hashMap[key]) {
        uniqueEntries.push(entriesToTest[jj]);
        
        // add also to hashmap to detect duplicate entries in entriesToTest itself
        // only the first occurrence is added to uniqueEntries
        hashMap[key] = key;
      }
    }

    // free bulky overhead
    //delete hashMap;
    
    return uniqueEntries;
  },

  // Call this method when making many small changes, potentially faster
  // make sure to call endUpdateBatch when done
  beginBatch: function() {
    this.treeBox.beginUpdateBatch();
  },
  
  // Ends a batch operation previously started with beginUpdateBatch
  endBatch: function() {
    this.treeBox.endUpdateBatch();
  },

  // Clear
  empty: function() {
    this.selectNone();
    this.alldata = [];
    this.data = [];
    this.treeBox.rowCountChanged(0, -this.rowCount);
    this.treeBox.invalidate();
    this.rowCount = 0;
  },

  // Test if a filter is in effect
  isDataFiltered: function() {
    return !(this.alldata.length == this.data.length);
  },

  repaint: function() {
    this.treeBox.invalidate();
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

  // Store data for viewing/filtering + extra backup store (unfiltered)
  _addData: function(item){
    this.alldata.push(item);
    this.data.push(item);
    this.rowCount += 1;
  },

  // Remove one element from the storage arrays
  _removeData: function(entryId) {
    var indexAlldata = this._getAllDataIndex(entryId);
    if (-1 < indexAlldata) this.alldata.splice(indexAlldata, 1);
    
    var indexData = this._getDataIndex(entryId);
    if (-1 < indexData) this.data.splice(indexData, 1);
    
    this.rowCount -= 1;
  },

  // When filter is active, only display entries with specific fieldNames 
  _applyFieldnameFilter: function() {
    // filter active?
    if (!this.fieldNamesFilter) {
      return;
    }

    // only keep entries with matching fieldnames
    var filteredData = [];
    for (var fi=0; fi < this.fieldNamesFilter.length; fi++) {
      for (var ei=0; ei < this.data.length; ei++) {
        if (FhcUtil.stringCompare(this.fieldNamesFilter[fi], this.data[ei].name) == 0) {
          filteredData.push(this.data[ei]);
        }
      }
    }
    this.data = filteredData;
  },

  // When filtervalue contains a value, filter entries on fieldname and value
  _applyNameValueFilter: function() {
    if ("" != this.filterValue) {
      var value = this.filterValue;
      var itemFilter = function callback(item, index, array) {
        return FhcUtil.inStr(item.name, value) || FhcUtil.inStr(item.value, value);
      };
      this.data = this.data.filter(itemFilter);
    }
  },

  // If sort is requested of already sorted column, toggle the sortorder
  _adjustSortOrder: function(treeColumn, curSortedColumn, toggle) {
    var sortAsc = true;
    if (treeColumn.id != curSortedColumn.id) {
      // remove sort indicator of previous sorted column
      this._removeSortIndicator(curSortedColumn);
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
  },

  // Return the current sorted column (defaults to first column if none found)
  _getCurrentSortedColumn: function() {
    var sortableCols = ["nameCol", "valueCol","timesusedCol","firstusedCol", "lastusedCol", "ageFirstCol", "ageCol", "hostCol", "urlCol", "pagetitleCol", "indexCol"];
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

  // remove up/down arrow indicating the sortdirection
  _removeSortIndicator: function(columnElem) {
    if (columnElem) columnElem.removeAttribute("sortDirection");
  },

  // set the up/down arrow indicating the sortdirection
  _setSortIndicator: function(columnElem, ascending) {
    if (columnElem) columnElem.setAttribute("sortDirection", ascending ? "ascending" : "descending");
  },

  // get a compare function for Array.sort on a specific column
  _getSortCompareFunction: function(columnId) {
    var compareFunc;
    
    switch(columnId) {
      case "nameCol":
        compareFunc = function compare(a, b) {
          var result = FhcUtil.stringCompare(a.name, b.name);
          if (result == 0) result = FhcUtil.stringCompare(a.value, b.value);
          if (result == 0) result = a.id - b.id;
          return result;
        };
        break;

      case "valueCol":
        compareFunc = function compare(a, b) {
          var result = FhcUtil.stringCompare(a.value, b.value);
          if (result == 0) result = FhcUtil.stringCompare(a.name, b.name);
          if (result == 0) result = a.id - b.id;
          return result;
        };
        break;
        
      case "timesusedCol":
        compareFunc = function compare(a, b) {
          var result = a.used - b.used;
          if (result == 0) result = FhcUtil.stringCompare(a.name, b.name);
          if (result == 0) result = FhcUtil.stringCompare(a.value, b.value);
          return result;
        };
        break;
        
      case "firstusedCol":
      case "ageFirstCol":
        compareFunc = function compare(a, b) {
          var result = a.first - b.first;
          if (result == 0) result = FhcUtil.stringCompare(a.name, b.name);
          if (result == 0) result = FhcUtil.stringCompare(a.value, b.value);
          return result;
        };
        break;
        
      case "lastusedCol":
      case "ageCol":
        compareFunc = function compare(a, b) {
          var result = a.last - b.last;
          if (result == 0) result = FhcUtil.stringCompare(a.name, b.name);
          if (result == 0) result = FhcUtil.stringCompare(a.value, b.value);
          return result;
        };
        break;

      case "hostCol":
        compareFunc = function compare(a, b) {
          var result = a.place.length - b.place.length;
          if (a.place.length > 0 && b.place.length > 0) {
            result = FhcUtil.stringCompare(a.place[0].host, b.place[0].host);
          }
          if (result == 0) result = FhcUtil.stringCompare(a.name, b.name);
          if (result == 0) result = FhcUtil.stringCompare(a.value, b.value);
          return result;
        };
        break;

      case "urlCol":
        compareFunc = function compare(a, b) {
          var result = a.place.length - b.place.length;
          if (a.place.length > 0 && b.place.length > 0) {
            result = FhcUtil.stringCompare(a.place[0].url, b.place[0].url);
          }
          if (result == 0) result = FhcUtil.stringCompare(a.name, b.name);
          if (result == 0) result = FhcUtil.stringCompare(a.value, b.value);
          return result;
        };
        break;

      case "pagetitleCol":
        compareFunc = function compare(a, b) {
          var result = a.place.length - b.place.length;
          if (a.place.length > 0 && b.place.length > 0) {
            result = FhcUtil.stringCompare(a.place[0].title, b.place[0].title);
          }
          if (result == 0) result = FhcUtil.stringCompare(a.name, b.name);
          if (result == 0) result = FhcUtil.stringCompare(a.value, b.value);
          return result;
        };
        break;
        
      case "indexCol":
        compareFunc = function compare(a, b) {
          return a.id - b.id;
        };
        break;
        
      default:
        compareFunc = function compare(a, b) {};
        break;
    }
    return compareFunc;
  },

  // Store the current selection(s) in the data itself so we can easily
  // restore the selection very fast later on
  _saveSelectionFast: function() {
    var selection = this._getSelection();
    if (selection) {
      for (var ii=0; ii < this.data.length; ii++) {
        this.data[ii]._tmpSelected = selection.isSelected(ii);
      }
    }
  },

  // Restore selection(s) from the data itself, very fast because
  // whether or not data is selected is stored inside the data itself
  // Only works when the data itself is not changed between save & restore!
  _restoreSelectionFast: function() {
    var selection = this._getSelection();
    if (!selection) {
        return;
    }

    // clear the current selection
    selection.clearSelection();

    this.beginBatch();
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
    this.endBatch();
  },

  // find an entry with the given Id an return the index
  _getAllDataIndex: function(entryId) {
    return this._findEntryIndex(this.alldata, entryId);
  },
  
  // find an entry with the given Id an return the index
  _getDataIndex: function(entryId) {
    return this._findEntryIndex(this.data, entryId);
  },
  
  // find an entry by Id inside an array
  _findEntryIndex: function(arrayOfEntries, entryId) {
    // iterate over all entries
    for (var it=0; it < arrayOfEntries.length; it++) {
      if (arrayOfEntries[it].id == entryId) {
        return it;
      }
    }
    return -1;
  },

  //----------------------------------------------------------------------------
  // Implementation of the nsITreeView interface
  //----------------------------------------------------------------------------
  getCellText: function(row, column) {
    switch(column.id) {
      case "nameCol":
        return this.data[row].name;
      case "valueCol":
        return this.data[row].value;
      case "indexCol":
        return this.data[row].id;
      case "timesusedCol":
        // right aligned, keep some distance from the right adjacent column
        return this.data[row].used + "";
      case "firstusedCol":
        return this.dateHandler.toDateString(this.data[row].first);
      case "lastusedCol":
        return this.dateHandler.toDateString(this.data[row].last);
      case "ageCol":
        return  this.dateHandler.getFuzzyAge(this.nowDate, this.data[row].last);
      case "ageFirstCol":
        return  this.dateHandler.getFuzzyAge(this.nowDate, this.data[row].first);
      case "hostCol":
        return (this.data[row].place.length>0) ? this.data[row].place[0].host : "";
      case "urlCol":
        return (this.data[row].place.length>0) ? this.data[row].place[0].url : "";
      case "pagetitleCol":
        return (this.data[row].place.length>0) ? this.data[row].place[0].title : "";
      default:
        return null;
    }
  },

  setCellText: function(row, column, newValue) {
    // Typically called when editing in treecell (isEditable)
    var oldEntry = new FormHistoryItem(
      this.data[row].id,
      this.data[row].name,
      this.data[row].value,
      this.data[row].used,
      this.data[row].first,
      this.data[row].last,
      this.data[row].place);

    var changedEntry = new FormHistoryItem(
      this.data[row].id,
      this.data[row].name,
      this.data[row].value,
      this.data[row].used,
      this.data[row].first,
      this.data[row].last,
      this.data[row].place);

    var oldValue;
    switch(column.id) {
      case "nameCol":
        oldValue = this.data[row].name;
        this.data[row].name = newValue;
        changedEntry.name = newValue;
        break;
      case "valueCol":
        oldValue = this.data[row].value;
        this.data[row].value = newValue;
        changedEntry.value = newValue;
        break;
      case "timesusedCol":
        oldValue = this.data[row].used;
        var intValue = parseInt(newValue);
        // alow negative number
        // if (!isNaN(intValue)) intValue = Math.abs(intValue);
        this.data[row].used = intValue;
        changedEntry.used = intValue;
        break;
      default:
        // edit other columns not supported
        oldValue = newValue;
        break;
    }
    if (oldValue != newValue) {
      if (null != this.editColumnCallBackFunc) {
        this.editColumnCallBackFunc(changedEntry, oldEntry);
      }
    }
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

  isEditable: function(idx, column)  {
    return (column.id=='nameCol' || column.id=='valueCol' || column.id=='timesusedCol');
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
      case "hostCol":
      case "pagetitleCol":
        aserv=Components.classes["@mozilla.org/atom-service;1"]
                  .getService(Components.interfaces.nsIAtomService);
        return aserv.getAtom("placeColumn").toString();
        break;
      case "urlCol":
        aserv=Components.classes["@mozilla.org/atom-service;1"]
                  .getService(Components.interfaces.nsIAtomService);
        return aserv.getAtom("placeUrlColumn").toString();
        break;
      default:
        break;
    }
    /*
    if (col.id=='hostCol' || col.id=='urlCol' || col.id=='pagetitleCol') {
      var aserv=Components.classes["@mozilla.org/atom-service;1"]
                .getService(Components.interfaces.nsIAtomService);
      return aserv.getAtom("placeColumn").toString();
    }
    */
    return "";
  },
  
  getColumnProperties: function(colid,col) {
    return "";
  },
  
  cycleHeader: function(col) {
  }
}

// Class containing FormHistory data.
function FormHistoryItem(id, name, value, used, first, last, place) {
  this.id = id;
  this.name = name;
  this.value = value;
  this.used = used;
  this.first = first;
  this.last = last;
  this.place = place;
  //temp storage for fast selection restore
  this._tmpSelected = false; 
}
