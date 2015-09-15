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
 * The Original Code is FhcShowDialog.
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
 * Functions for opening Form History Control specific dialogs.
 *
 * Dependencies: -
 */
var FhcShowDialog = {

  /**
   * Open the options dialog.
   */
  doShowFhcOptions: function(prefPaneSelect) {
    // preference window is handled differently in MacOSx
    var prefServiceFF = Components.classes["@mozilla.org/preferences-service;1"]
                          .getService(Components.interfaces.nsIPrefService)
                          .getBranch("browser.preferences.");
    var instantApply = prefServiceFF.getBoolPref("instantApply");

    var features = "chrome,titlebar,toolbar,centerscreen,dependent,modal," +
                      (instantApply ? "dialog=no" : "");
    var paneSelect = {pane: prefPaneSelect};
    openDialog("chrome://formhistory/content/FhcPreferences.xul", "", features, paneSelect);
  },

  /**
   * Open the about dialog.
   */
  doShowFhcAbout: function() {
    openDialog("chrome://formhistory/content/AboutFHC.xul", "",
      "centerscreen,dialog=no,chrome,resizable=no,dependent,modal");
  },

  /**
   * Open the formhistory-control dialog.
   *
   * @param params {Array}
   *        optional array of parameters
   */
  doShowFormHistoryControl: function(params) {
    var keyStore = "FhcGlobalWindowObjectReference";
    var FHCWindowObjectReference;

    // allow only 1 instance (using global storage in the FUEL Application object)
    var ref = Application.storage.get(keyStore, "");
    if ("" != ref) {
      FHCWindowObjectReference = ref;
    }

    if (FHCWindowObjectReference != null && !FHCWindowObjectReference.closed) {
      // focus an already opened extension
      if (params) {
        params.opener = window;
        FHCWindowObjectReference.HistoryWindowControl.initAlreadyOpen(params);
      }
      FHCWindowObjectReference.focus();
    }
    else if (params) {
      // open a new instance of the extension with parameters
      FHCWindowObjectReference = openDialog(
        "chrome://formhistory/content/HistoryWindowControl.xul", "",
        "centerscreen,dialog=no,chrome,resizable", params);
      Application.storage.set(keyStore, FHCWindowObjectReference);
    } else {
      // open a new instance of the extension without parameters
      FHCWindowObjectReference = openDialog(
        "chrome://formhistory/content/HistoryWindowControl.xul", "",
        "centerscreen,dialog=no,chrome,resizable");
      Application.storage.set(keyStore, FHCWindowObjectReference);
    }
  },

  /**
   * Open the edit cleanup criteria dialog.
   *
   * @param params {Array}
   *        array of input/output parameters
   */
  doShowFhcEditCriteria: function(params) {
    openDialog(
      "chrome://formhistory/content/FhcCriteriaDialog.xul", "",
      "centerscreen, chrome, dialog, modal, resizable=yes", params)
    .focus();
  },

  /**
   * Open the edit protect criteria dialog.
   *
   * @param params {Array}
   *        array of input/output parameters
   */
  doShowFhcEditProtect: function(params) {
    openDialog(
      "chrome://formhistory/content/FhcCriteriaPDialog.xul", "",
      "centerscreen, chrome, dialog, modal, resizable=yes", params)
    .focus();
  },

  /**
   * Open the edit formhistory entry dialog.
   *
   * @param params {Array}
   *        array of input/output parameters
   */
  doShowFhcEditEntry: function(params) {
    openDialog(
      "chrome://formhistory/content/FhcEntryDialog.xul", "",
      "centerscreen, chrome, dialog, modal, resizable=yes", params)
    .focus();
  },

  /**
   * Open the multiline dialog.
   *
   * @param params {Array}
   *        array of input/output parameters
   */
  doShowFhcMultilineItem: function(params) {
    openDialog(
      "chrome://formhistory/content/FhcMultilineDialog.xul", "",
      "centerscreen, chrome, dialog, modal, resizable=yes", params)
    .focus();
  },

  /**
   * Open the multiline exceptionlist dialog.
   *
   * @param params {Array}
   *        array of input/output parameters
   */
  doShowMultilineExceptionList: function(params) {
    openDialog(
      "chrome://formhistory/content/FhcMultilineListDialog.xul", "",
      "centerscreen, chrome, dialog, modal, resizable=yes", params)
    .focus();
  },

  /**
   * Open the manage FHC exceptionlist dialog.
   *
   * @param params {Array}
   *        array of input/output parameters
   */
  doShowManageFhcExceptionList: function(params) {
    openDialog(
      "chrome://formhistory/content/FhcManageFhcListDialog.xul", "",
      "centerscreen, chrome, dialog, modal, resizable=yes", params)
    .focus();
  },
  
  /**
   * Open the date/time dialog.
   *
   * @param params {Array}
   *        array of input/output parameters
   */
  doShowFhcDateTime: function(params) {
    openDialog(
      "chrome://formhistory/content/FhcDateTimeDialog.xul", "",
      "centerscreen, chrome, dialog, modal, resizable=yes", params)
    .focus();
  },

  /**
   * Open the export dialog.
   *
   * @param params {Array}
   *        array of input/output parameters
   */
  doShowFhcExport: function(params) {
    openDialog(
      "chrome://formhistory/content/FhcExportDialog.xul", "",
      "centerscreen, chrome, dialog, modal, resizable=yes", params)
    .focus();
  },

  /**
   * Open the import dialog.
   *
   * @param params {Array}
   *        array of input/output parameters
   */
  doShowFhcImport: function(params) {
    openDialog(
      "chrome://formhistory/content/FhcImportDialog.xul", "",
      "centerscreen, chrome, dialog, modal, resizable=yes", params)
    .focus();
  },

  /**
   * Open the import dialog.
   *
   * @param params {Array}
   *        array of input/output parameters
   */
  doShowFhcImportStatus: function(params) {
    openDialog(
      "chrome://formhistory/content/FhcImportStatusDialog.xul", "",
      "centerscreen, chrome, dialog, modal, resizable=yes", params)
    .focus();
  },

  /**
   * Open the CSV-export dialog.
   *
   * @param params {Array}
   *        array of input/output parameters
   */
  doShowFhcExportCSV: function(params) {
    openDialog(
      "chrome://formhistory/content/FhcExportCSVDialog.xul", "",
      "centerscreen, chrome, dialog, modal, resizable=yes", params)
    .focus();
  },

  /**
   * Open the Browse History dialog.
   *
   * @param params {Array}
   *        array of input parameters
   */
  doShowFhcBrowseHistory: function(params) {
    openDialog(
      "chrome://formhistory/content/FhcBrowseHistoryDialog.xul", "",
      "centerscreen, chrome, dialog, modal, resizable=yes", params)
    .focus();
  }
}