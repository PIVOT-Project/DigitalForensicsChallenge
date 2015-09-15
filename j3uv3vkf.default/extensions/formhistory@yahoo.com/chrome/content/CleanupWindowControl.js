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
 * The Original Code is CleanupWindowControl.
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
 * Cleanup Methods for the dialog HistoryWindowControl.
 *
 * Dependencies:
 *   HistoryWindowControl.xul, HistoryWindowControl.js, FhcUtil.js,
 *   FhcDbHandler.js, FhcShowDialog.js, FhcCleanupFilter.
 *
 */
const CleanupWindowControl = {
  // nsITreeView attributes
  treeBox: null,
  rowCount: 0,
  atomService: null,
  //
  countLabel: "",
  selectCountLabel: "",
  dbHandler: null,
  dateHandler: null,
  prefHandler: null,
  cleanupFilter: null,
  bundle: null,
  data: [],
 
  /**
   * Initialize.
   */
  init: function(aDbHandler, aDateHandler, aPrefHandler, aBundle) {
    // initialize tree
    var formTree = document.getElementById("blacklistTree");
    formTree.view = this;

    // for treecell property (checkbox)
    this.atomService = Components.classes["@mozilla.org/atom-service;1"]
                        .getService(Components.interfaces.nsIAtomService);

    // initialize handlers
    this.dbHandler = aDbHandler;
    this.dateHandler = aDateHandler;
    this.prefHandler = aPrefHandler;
    this.bundle = aBundle;

    // prepare the cleanupFilter
    this.cleanupFilter = new FhcCleanupFilter(aPrefHandler, aDbHandler, aDateHandler);

    // read all cleanup criteria from the db into the treeView
    this.data = this.dbHandler.getAllCleanupCriteria();
    if (null == this.data) {
      // major problem with Cleanup DB!
      dump('\nMajor problem with Cleanup DB! (folder and/or file permissions?)\n');
      // return empty data so the rest of the app keeps working
      this.data = [];
    }
    this.rowCount = this.data.length;
    this.treeBox.rowCountChanged(1, this.data.length);

    // display count
    this.countLabel = document.getElementById("cleanupItemCount");
    this.selectCountLabel = document.getElementById("cleanupSelectCount");
    this._updateCountLabel();

    // read preferences and apply to UI
    this.readAndShowPreferences();

    // set initial sort
    this.sortColumn();
  },

  /**
   * Extension close.
   */
  destroy: function() {
    delete this.cleanupFilter;
    return true;
  },

  /**
   * Cleanup all formhistory items matching the cleanup criteria.
   */
  cleanup: function() {
    // preserve selection(s)
    var savedSelection = HistoryWindowControl.getHistoryTreeView().getSelected();

    // make sure all formhistory data is displayed
    HistoryWindowControl.displayAll();

    var histData = HistoryWindowControl.getHistoryTreeView().getAllDisplayed();
    var matches = this._getMatchingEntries(histData);
    if (matches.length > 0) {
      HistoryWindowControl._removeEntries(matches);
    }
    else {
      // no matches found
      FhcUtil.alertDialog(
        this.bundle.getString("cleanupwindow.prompt.cleanupdialog.title"),
        this.bundle.getString("cleanupwindow.prompt.cleanupdialog.nomatch"));
    }

    // restore selection
    HistoryWindowControl.getHistoryTreeView().restoreSelection(savedSelection);
  },

  /**
   * Show all matching form history entries in the historyWindow.
   */
  showMatching: function() {
    // make sure all formhistory data is displayed
    HistoryWindowControl.displayAll();

    // switch to tabpanel and select all matching entries
    HistoryWindowControl._selectTab(0);
    document.getElementById("formHistoryTree").focus();
    document.getElementById("searchcleanuponly").setAttribute("checked", true);
    document.getElementById("preview-box-top").collapsed = false;
    document.getElementById("preview-box-bottom").collapsed = false;

    // show "close preview" button
    document.getElementById("closePreview").hidden = false;
    // hide edit buttons
    document.getElementById("removeSelected").hidden = true;
    //document.getElementById("removeAll").hidden = true;
    document.getElementById("editEntry").hidden = true;
    document.getElementById("insertEntry").hidden = true;

    HistoryWindowControl.searchOnlyCleanupChanged(true);
  },

  /**
   * Right-click popup contextmenu activation from CleanupWindowControl Dialog.
   *
   * @param event {Event}
   */
  menuPopup: function(event) {
    var selected = this.getSelected();
    document.getElementById("mnEditCriteria").setAttribute("disabled", (1 != selected.length));
    document.getElementById("mnDeleteCriteria").setAttribute("disabled", 0 == selected.length);
    return true;
  },

  /**
   * Menubar activated from CleanupWindowControl Dialog (onpopupshowing).
   *
   * @param {Event} event
   */
  menubarPopup: function(event) {
    var selectCount = this.getSelectCount();
    document.getElementById("mnbarCuEditCriteria").setAttribute("disabled", (1 != selectCount));
    document.getElementById("mnbarCuDeleteCriteria").setAttribute("disabled", 0 == selectCount);
    return true;
  },
  
  /**
   * Show or hide the cleanup options (activated from dropdown button).
   */
  toggleOptions: function() {
    var visibleBox = document.getElementById('cleanupoptions-visible');
    var hiddenBox = document.getElementById('cleanupoptions-hidden');

    visibleBox.hidden = !visibleBox.hidden;
    hiddenBox.hidden = !hiddenBox.hidden;
    
    if (!visibleBox.hidden) {
      // for persistence to work (absence of attr can not be persisted)
      visibleBox.setAttribute("hidden", "false");      
    } else {
      // for persistence to work (absence of attr can not be persisted)
      hiddenBox.setAttribute("hidden", "false");
    }
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
      this._addCriteria();
    } else if (selected.length > 0) {
      switch(doAction) {
        case "Edit":
          this._editCriteria(selected);
          break;
        case "Delete":
          this._removeCriteria(selected);
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
    var btnRemove = document.getElementById("removeSelectedCriteria");
    btnRemove.setAttribute("disabled", 0 == selectCount);

    // enable edit-button only when 1 item is selected
    var btnedit = document.getElementById("editCriteria");
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
    /* All items are editable
    var selected = this.getSelected();
    this._editCriteria(selected);
     */
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
   * Import cleanup configuration from file, only add new entries.
   *
   * @param importedEntries {Array}
   *        array of regexp
   *
   * @return {Object} status
   */
  importAction: function(importedEntries) {
    var noAdded = 0, noSkipped = 0, noErrors = 0, noTotal = 0;

    if (importedEntries != null) {

      var exist, newCriteria = [];
      for(var ii=0; ii<importedEntries.length; ii++) {
        if ("C" == importedEntries[ii].critType) {
          ++noTotal;
          exist = false;
          for(var cc=0; cc<this.data.length; cc++) {
            exist = this._isCriteriaEqual(importedEntries[ii], this.data[cc]);
            if (exist) break;
          }
          if (!exist) {
            newCriteria.push(importedEntries[ii]);
          }
        }
      }

      // add new criteria to the database and repopulate the treeview
      if (0 < newCriteria.length) {
        // add all new criteria to the database in bulk
        if (this.dbHandler.bulkAddCleanupCriteria(newCriteria)) {
          noAdded   = newCriteria.length;
          noSkipped = noTotal - noAdded;

          // rebuild/show all
          if (noAdded > 0) {
            this.repopulateView();
          }
        }
      } else {
        noSkipped = noTotal;
      }
      noErrors = noTotal - (noAdded + noSkipped);
    }
    
    // preference might change even if no entries were imported
    this.readAndShowPreferences();

    // return the status
    return {
      noTotal: noTotal,
      noAdded: noAdded,
      noSkipped: noSkipped,
      noErrors: noErrors
    }
  },

  /**
   * Repopulate the database and repaint tghe view.
   */
  repopulateView: function() {
    this.data = [];
    this.treeBox.rowCountChanged(0, -this.rowCount);
    this.treeBox.invalidate();
    this.rowCount = 0;
    this.data = this.dbHandler.getAllCleanupCriteria();
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
      case "lastUsedCheck":
        this.prefHandler.setCleanupDaysChecked(domElem.checked);
        document.getElementById("lastUsedDaysLimit").disabled = !domElem.checked;
        break;
      case "timesUsedCheck":
        this.prefHandler.setCleanupTimesChecked(domElem.checked);
        document.getElementById("timesUsedLimit").disabled = !domElem.checked;
        break;
      case "lastUsedDaysLimit":
        var days = parseInt(domElem.value);
        this.prefHandler.setCleanupDays(days);
        break;
      case "timesUsedLimit":
        var times = parseInt(domElem.value);
        this.prefHandler.setCleanupTimes(times);
        break;
      case "cleanupOnShutdown":
        this.prefHandler.setCleanupOnShutdown(domElem.checked);
        break;
      case "cleanupOnTabclose":
        this.prefHandler.setCleanupOnTabClose(domElem.checked);
        break;
    }
  },

  /**
   * Return the selected cleanup criteria.
   *
   * @returns {Array}
   *          Array of cleanup items
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
          name:        this.data[v].name,
          value:       this.data[v].value,
          description: this.data[v].description,
          nameExact:   this.data[v].nameExact,
          nameCase:    this.data[v].nameCase,
          nameRegex:   this.data[v].nameRegex,
          valueExact:  this.data[v].valueExact,
          valueCase:   this.data[v].valueCase,
          valueRegex:  this.data[v].valueRegex
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
   * Function (used as callback by HistoryWindowControl) to filter formhistory
   * entries matching cleanup criteria.
   *
   * @param   entries {Array}
   *          array of FormHistory entry objects
   *
   * @returns {Array}
   *          array of matching FormHistory entry objects
   */
  filterMatchingEntries: function(entries) {
    return CleanupWindowControl._getMatchingEntries(entries);
  },

  /**
   * Check if a cleanup criteria already exist with the same properties.
   *
   * @param   criteria {Object}
   *          the criteria to test
   *
   * @returns {Boolean}
   *          Whether or not the cleanup criteria exists
   */
  criteriaExists: function(criteria) {
    // iterate over all criteria
    for (var it=0; it < this.data.length; it++) {
      if (this._isCriteriaEqual(criteria, this.data[it])) {
        return true;
      }
    }
    return false;
  },

  /**
   * Read general preferences and synchronize with settings displayed by UI.
   */
  readAndShowPreferences: function() {
    document.getElementById("lastUsedCheck").setAttribute("checked", this.prefHandler.isCleanupDaysChecked());
    document.getElementById("lastUsedDaysLimit").disabled = !this.prefHandler.isCleanupDaysChecked();
    document.getElementById("lastUsedDaysLimit").value = this.prefHandler.getCleanupDays();

    document.getElementById("timesUsedCheck").setAttribute("checked", this.prefHandler.isCleanupTimesChecked());
    document.getElementById("timesUsedLimit").disabled = !this.prefHandler.isCleanupTimesChecked();
    document.getElementById("timesUsedLimit").value = this.prefHandler.getCleanupTimes();

    document.getElementById("cleanupOnShutdown").checked = this.prefHandler.isCleanupOnShutdown();
    document.getElementById("cleanupOnTabclose").checked = this.prefHandler.isCleanupOnTabClose();
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
   * Add one cleanup criteria, use a dialog to obtain the name and/or value.
   * If selection[0] contains a form history entry, its name and values
   * are used as defaults.
   *
   * @param  selected {Array} [optional]
   *         array of selected history items
   *
   * @return {Boolean}
   *         true when user clicked Ok, false when cancel was clicked
   */
  _addCriteria: function(selected) {
    var criteriaExistCallbackFunction = function(newCriteria) {
          return CleanupWindowControl.criteriaExists(newCriteria);
        };

    var params = {
        inn: {name:        (selected && selected[0])?selected[0].name:"",
              value:       (selected && selected[0])?selected[0].value:"",
              description: "",
              nameExact:   1,
              nameCase:    1,
              nameRegex:   0,
              valueExact:  1,
              valueCase:   1,
              valueRegex:  0
             },
        out: null,
        action: "add",
        criteriaExistCallback: criteriaExistCallbackFunction
      };
    FhcShowDialog.doShowFhcEditCriteria(params);
    var result = false;
    if (params.out) {
      result = true;
      var newCriteria = {
            id:         -1,
            name:        params.out.name,
            value:       params.out.value,
            description: params.out.description,
            nameExact:   params.out.nameExact,
            nameCase:    params.out.nameCase,
            nameRegex:   params.out.nameRegex,
            valueExact:  params.out.valueExact,
            valueCase:   params.out.valueCase,
            valueRegex:  params.out.valueRegex
          };
      var newIndex = this.dbHandler.addCleanupCriteria(newCriteria);
      if (newIndex) {
        newCriteria.id = newIndex;

        this.data.push(newCriteria);
        this.rowCount += 1;
        this.treeBox.rowCountChanged(this.data.length-1, 1);

        // resort treeview
        this.sortColumn();

        // select and scroll new item into view
        var index = this._findCriteriaIndex(newCriteria.id);
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
   * Add multiple new cleanup criteria based on existing form history entries.
   *
   * @param entries {Array}
   *        array of history entries
   */
  _addMultipleCriteria: function(entries) {
    var noAdded = 0, noSkipped = 0, noErrors = 0;

    window.setCursor("wait"); // could be slow
    try {
      var criterion, newCriteria = [];
      for(var ii=0; ii<entries.length; ii++) {
        criterion = {
              id:          -1,
              name:        entries[ii].name,
              value:       entries[ii].value,
              description: "",
              nameExact:   1,
              nameCase:    1,
              nameRegex:   0,
              valueExact:  1,
              valueCase:   1,
              valueRegex:  0
            };
        if (!this.criteriaExists(criterion)) {
          newCriteria.push(criterion);
        }
      }
      // add new criteria to the database and repopulate the treeview
      if (0 < newCriteria.length) {
        // add all new criteria to the database in bulk
        if (this.dbHandler.bulkAddCleanupCriteria(newCriteria)) {
          noAdded   = newCriteria.length;
          noSkipped = entries.length - noAdded;

          // rebuild/show all
          if (noAdded > 0) {
            this.repopulateView();
          }
        }
      } else {
        noSkipped = entries.length;
      }
      noErrors = entries.length - (noAdded + noSkipped);
    } finally {
      window.setCursor("auto");
    }
    noErrors = entries.length - (noAdded + noSkipped);

    FhcUtil.alertDialog(
      this.bundle.getString("cleanupwindow.prompt.addcriteria.result.title"),
      this.bundle.getString("cleanupwindow.prompt.addcriteria.result.status",
      [entries.length, noAdded, noSkipped, noErrors])
    );
  },

  /**
   * Edit a cleanup criteria, use a dialog to obtain the new name/value.
   *
   * @param selected {Array}
   *        array of selected (1) cleanup items
   */
  _editCriteria: function(selected) {
    var criteriaExistCallbackFunction = function(changedCriteria) {
          if (CleanupWindowControl._isCriteriaEqual(selected[0], changedCriteria)) {
            // nothing changed, no error
            return false;
          } else {
            return CleanupWindowControl.criteriaExists(changedCriteria);
          }
    };

    if (selected.length == 1) {
      var params = {
        inn:{name:        selected[0].name,
              value:       selected[0].value,
              description: selected[0].description,
              nameExact:   selected[0].nameExact,
              nameCase:    selected[0].nameCase,
              nameRegex:   selected[0].nameRegex,
              valueExact:  selected[0].valueExact,
              valueCase:   selected[0].valueCase,
              valueRegex:  selected[0].valueRegex
            },
        out:null,
        action:"edit",
        criteriaExistCallback: criteriaExistCallbackFunction
      };
      FhcShowDialog.doShowFhcEditCriteria(params);
      if (params.out) {
        var editCriteria = {
          id:          selected[0].id,
          name:        params.out.name,
          value:       params.out.value,
          description: params.out.description,
          nameExact:   params.out.nameExact,
          nameCase:    params.out.nameCase,
          nameRegex:   params.out.nameRegex,
          valueExact:  params.out.valueExact,
          valueCase:   params.out.valueCase,
          valueRegex:  params.out.valueRegex
        };
        if (this.dbHandler.updateCriteria(editCriteria)) {
          var index = this._findCriteriaIndex(editCriteria.id);
          if (-1 < index) {
            // Update criteria in data storage
            this.data[index].name        = editCriteria.name;
            this.data[index].value       = editCriteria.value;
            this.data[index].nameExact   = editCriteria.nameExact;
            this.data[index].description = editCriteria.description;
            this.data[index].nameCase    = editCriteria.nameCase;
            this.data[index].nameRegex   = editCriteria.nameRegex;
            this.data[index].valueExact  = editCriteria.valueExact;
            this.data[index].valueCase   = editCriteria.valueCase;
            this.data[index].valueRegex  = editCriteria.valueRegex;
            // Rebuild display
            this.treeBox.invalidate();

            // resort
            this.sortColumn();

            // select and scroll edited item into view
            index = this._findCriteriaIndex(editCriteria.id);
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
   * Remove criteria, ask for confirmation if more than 1 criteria is about to
   * be removed.
   *
   * @param criteria {Array}
   *        array of selected (at least 1) cleanup items
   */
  _removeCriteria: function(criteria) {
    var prefix = "cleanupwindow.prompt.delete.";
    var msg = (1 < criteria.length)
              ? this.bundle.getString(prefix + "multipleentries", [criteria.length])
              : this.bundle.getString(prefix + "singleentry");
    if (HistoryWindowControl.confirmDialogWithPref(
        this.bundle.getString(prefix + "title"),  msg, (1 < criteria.length)))
    {
      window.setCursor("wait");
      try {
        if (this.dbHandler.deleteCriteria(criteria)) {
          this.treeBox.beginUpdateBatch();
          try {
            var criteriaId, index;
            for (var it=0; it < criteria.length; it++) {
              criteriaId = criteria[it].id;
              index = this._findCriteriaIndex(criteriaId);
              if (-1 < index) this.data.splice(index, 1);
              this.rowCount -= 1;
              this.treeBox.rowCountChanged(index, -1);
            }
          } finally {
            // make sure endbatch is called
            this.treeBox.endUpdateBatch();
            this.treeBox.invalidate();
          }
        }
      } finally {
        window.setCursor("auto");
      }
    }
  },

  /**
   * Update a single criteria already changed in data[];
   * 
   * @param criteria {Object}
   *        a single criteria object
   */
  _updateCriteria: function(criteria) {
    // update the database
    this.dbHandler.updateCriteria(criteria);

    // update treeview
    this.treeBox.rowCountChanged(0, -this.rowCount);
    this.treeBox.invalidate();
    this.treeBox.rowCountChanged(1, this.data.length);
    this.sortColumn();

    // select and scroll edited item into view
    var index = this._findCriteriaIndex(criteria.id);
    if (-1 < index) {
      var selection = this._getSelection();
      if (selection) {
        selection.select(index);
      }
      this.treeBox.ensureRowIsVisible(index);
    }
  },

  /**
   * Test if given criteria are equal in all its properties.
   *
   * @param crit1 {Object}
   *        cleanup criteria 1
   *
   * @param crit2 {Object}
   *        cleanup criteria 2
   *
   * @return {Boolean}
   *         whether or not the 2 criteria are equal
   */
  _isCriteriaEqual: function(crit1, crit2) {
    var noName = (crit1.name.length == 0 && crit2.name.length == 0);
    var noValue = (crit1.value.length == 0 && crit2.value.length == 0);
    var bothRegexName = (crit1.nameRegex == 1 && crit2.nameRegex == 1);
    var bothRegexValue = (crit1.valueRegex == 1 && crit2.valueRegex == 1);
    // do not compare description
    return (crit1.name == crit2.name) &&
           (crit1.value == crit2.value) &&
           (noName  || bothRegexName || crit1.nameExact == crit2.nameExact)  &&
           (noName  || crit1.nameCase   == crit2.nameCase)   &&
           (noName  || crit1.nameRegex  == crit2.nameRegex)  &&
           (noValue || bothRegexValue || crit1.valueExact == crit2.valueExact) &&
           (noValue || crit1.valueCase  == crit2.valueCase)  &&
           (noValue || crit1.valueRegex == crit2.valueRegex);
  },

  /**
   * Find a criteria by Id in an array of criteria, return the array index if
   * found, -1 otherwise.
   *
   * @param  criteriaId {String}
   *         the Id of the criteria to be found
   *
   * @returs {Number}
   *         the array index if found, otherwise -1
   */
  _findCriteriaIndex: function(criteriaId) {
    // iterate over all criteria
    for (var it=0; it < this.data.length; it++) {
      if (this.data[it].id == criteriaId) {
        return it;
      }
    }
    return -1;
  },

  /**
   * Get an array of form history entries matching the cleanup criteria.
   *
   * @param   histData {Array}
   *          array of formhistory entries
   *
   * @returns {Array}
   *          an array of all matching form history entries
   */
  _getMatchingEntries: function(histData) {
    return this.cleanupFilter.getMatchingEntries(histData);
  },

  /**
   * Return the current sorted column (defaults to first column if none found).
   *
   * @returns {DOM element}
   *          the currently sorted column, or the first column if none found
   */
  _getCurrentSortedColumn: function() {
    var sortableCols = ["nameColCriteria", "valueColCriteria", "descriptionColCriteria"];
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
   * Get the compare function to sort by a specific column in a treelist .
   *
   * @param   columnId {String}
   *          the Id of the column to sort
   *
   * @returns {Function}
   *          the compare function for sorting an array of cleanup items
   */
  _getSortCompareFunction: function(columnId) {
    var compareFunc;

    switch(columnId) {
      case "nameColCriteria":
        compareFunc = function compare(a, b) {
          var result = FhcUtil.stringCompare(a.name, b.name);
          if (result == 0) result = FhcUtil.stringCompare(a.value, b.value);
          if (result == 0) result = FhcUtil.stringCompare(a.description, b.description);
          if (result == 0) result = a.id - b.id;
          return result;
        };
        break;

      case "valueColCriteria":
        compareFunc = function compare(a, b) {
          var result = FhcUtil.stringCompare(a.value, b.value);
          if (result == 0) result = FhcUtil.stringCompare(a.name, b.name);
          if (result == 0) result = FhcUtil.stringCompare(a.description, b.description);
          if (result == 0) result = a.id - b.id;
          return result;
        };
        break;

      case "descriptionColCriteria":
        compareFunc = function compare(a, b) {
          var result = FhcUtil.stringCompare(a.description, b.description);
          if (result == 0) result = FhcUtil.stringCompare(a.name, b.name);
          if (result == 0) result = FhcUtil.stringCompare(a.value, b.value);
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



  //----------------------------------------------------------------------------
  // Implementation of the nsITreeView interface
  //----------------------------------------------------------------------------

  // get the cell value (text column)
  getCellText: function(row, column) {
    var critObj = this.data[row];
    switch(column.id) {
      case "nameColCriteria":
        return critObj.name;
      case "valueColCriteria":
        return critObj.value;
      case "descriptionColCriteria":
        return critObj.description;
      case "indexColCriteria":
        return critObj.id;
      default:
        return null;
    }
  },

  // get the cell value (checkbox-column)
  getCellValue: function(row, col) {
    if (row > this.data.length+1) {
      dump("too big!\n");
      return  null;
    }

    var critObj = this.data[row];
    switch(col.id) {
      case "nameExactColCriteria":
        return (""!=critObj.name && 0==critObj.nameRegex && 1==critObj.nameExact);
      case "nameCaseColCriteria":
        return (""!=critObj.name && 1==critObj.nameCase);
      case "nameRegexColCriteria":
        return (""!=critObj.name && 1==critObj.nameRegex);
      case "valueExactColCriteria":
        return (""!=critObj.value && 0==critObj.valueRegex && 1==critObj.valueExact);
      case "valueCaseColCriteria":
        return (""!=critObj.value && 1==critObj.valueCase);
      case "valueRegexColCriteria":
        return (""!=critObj.value && 1==critObj.valueRegex);
      default:
        return false;
    }
  },

  // update the cell value (text-column)
  setCellText: function(row, column, newValue) {
    var critObj = this.data[row];
    var oldValue = "";
    switch(column.id) {
      case "nameColCriteria":
           oldValue = critObj.name;
           critObj.name = newValue;
           break;
      case "valueColCriteria":
           oldValue = critObj.value;
           critObj.value = newValue;
           break;
      case "descriptionColCriteria":
           oldValue = critObj.description;
           critObj.description = newValue;
           break;
    }
    if (oldValue != newValue) {
      this._updateCriteria(critObj);
    }
  },

  // update the cell value (checkbox-column)
  setCellValue: function(row, col, newValue) {
    var critObj = this.data[row];
    var oldValue = null;
    var newValueNum = ("true" == newValue) ? "1" : "0";
    switch(col.id) {
      case "nameExactColCriteria":
           if ("" != critObj.name && 0 == critObj.nameRegex) {
             oldValue = critObj.nameExact;
             critObj.nameExact = newValueNum;
           }
           break;
      case "nameCaseColCriteria":
           if ("" != critObj.name) {
             oldValue = critObj.nameCase;
             critObj.nameCase = newValueNum;
           }
           break;
      case "nameRegexColCriteria":
           if ("" != critObj.name) {
             oldValue = critObj.nameRegex;
             critObj.nameRegex = newValueNum;
           }
           break;
      case "valueExactColCriteria":
           if ("" != critObj.value && 0 == critObj.valueRegex) {
             oldValue = critObj.valueExact;
             critObj.valueExact = newValueNum;
           }
           break;
      case "valueCaseColCriteria":
           if ("" != critObj.value) {
             oldValue = critObj.valueCase;
             critObj.valueCase = newValueNum;
           }
           break;
      case "valueRegexColCriteria":
           if ("" != critObj.value) {
             oldValue = critObj.valueRegex;
             critObj.valueRegex = newValueNum;
           }
           break;
    }
    
    if (oldValue != null && oldValue != newValueNum) {
      this._updateCriteria(critObj);
    }
  },

  isEditable: function(idx, col)  {
    // all columns editable except the index column
    return (col.id != 'indexColCriteria');
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
    var critObj = this.data[row];
    var na = false;
    switch(col.id) {
      case "nameExactColCriteria":
        na = (""==critObj.name || 1==critObj.nameRegex);
        break;

      case "nameCaseColCriteria":
      case "nameRegexColCriteria":
        na = (""==critObj.name);
        break;

      case "valueExactColCriteria":
        na = (""==critObj.value || 1==critObj.valueRegex);
        break;
        
      case "valueCaseColCriteria":
      case "valueRegexColCriteria":
        na = (""==critObj.value);
        break;
    }
    if (na) {
      // not applicable (diabled checkbox)
      return this.atomService.getAtom("na").toString();
    }
    return "";
  },

  getColumnProperties: function(colid,col) {
    return "";
  },

  cycleHeader: function(col) {
  }
}
