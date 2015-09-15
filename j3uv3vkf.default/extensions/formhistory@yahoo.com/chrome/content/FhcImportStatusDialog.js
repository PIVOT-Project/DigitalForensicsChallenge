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
 * The Original Code is FhcImportStatusDialog.
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
 * Methods for the form history import status dialog.
 * Only used within FhcImportStatusDialog.xul, thus no danger of namespace conflicts.
 *
 * Dependencies: FhcImportStatusDialog.xul
 */
const FhcImportStatusDialog = {
  
  /**
   * Initialize dialog
   */
  init: function() {
    if (window.arguments[0]) {
      var status = window.arguments[0];
      this._initItem("history", status.history);
      this._initItem("multiline", status.multiline);
      this._initItem("multilinecfg", status.multicfg);
      this._initItem("multilineexc", status.multiexc);
      this._initItem("customsaveexc", status.custsexc);
      this._initItem("customsavecfg", status.custscfg);
      this._initItem("cleanup", status.cleanup);
      this._initItem("keys", status.keys);
      this._initItem("regexp", status.regexp);
    }
  },

  onOkay: function() {
    return true;
  },
  
  _initItem: function(elementId, status) {
    if (status != null) {
      document.getElementById("total-"   + elementId).value = status.noTotal;
      document.getElementById("import-"  + elementId).value = status.noAdded;
      document.getElementById("skipped-" + elementId).value = status.noSkipped;
      document.getElementById("error-"   + elementId).value = status.noErrors;
      document.getElementById("status-"   + elementId).className = 
        (0 == status.noErrors) ? "okay" : "error";
    }
  }
}