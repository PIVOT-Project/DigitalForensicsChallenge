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
 * The Original Code is FhcImportDialog.
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
 * Methods for the form history import dialog.
 * Only used within FhcImportDialog.xul, thus no danger of namespace conflicts.
 *
 * Dependencies: FhcImportDialog.xul
 */
const FhcImportDialog = {
  
  /**
   * Initialize dialog
   */
  init: function() {
    if (window.arguments[0].inn) {
      var inn = window.arguments[0].inn;
      this._initItem("history", inn.history);
      this._initItem("multiline", inn.multiline);
      this._initItem("multilineprefs", inn.multicfg);
      this._initItem("custsaveprefs", inn.custsavcfg);
      this._initItem("cleanup", inn.cleanup);
      this._initItem("keys", inn.keys);
      this._initItem("regexp", inn.regexp);
    }
  },

  /**
   * Import button activated, return parameter with selected options.
   *
   * @return {Boolean}
   *         true if at least one option is selectd.
   */
  onOkay: function() {
    if (!this._isValidSelection()) {
      document.getElementById("errorMessageNoSelection").hidden = false;
      return false;
    }

    window.arguments[0].out = {
      importHistory  : this._isChecked("history"),
      importMultiline: this._isChecked("multiline"),
      importMulticfg : this._isChecked("multilineprefs"),
      importCustscfg : this._isChecked("custsaveprefs"),
      importCleanup  : this._isChecked("cleanup"),
      importKeys     : this._isChecked("keys"),
      importRegexp   : this._isChecked("regexp")
    };
    return true;
  },
  
  /**
   * Check if at least one import is selected.
   *
   * @return {Boolean}
   *         true if at least one option is selected
   */
  _isValidSelection: function() {
    // any import selected?
    var hist   = this._isChecked("history");
    var multi  = this._isChecked("multiline");
    var mulcfg = this._isChecked("multilineprefs");
    var cuscfg = this._isChecked("custsaveprefs");
    var clean  = this._isChecked("cleanup");
    var keys   = this._isChecked("keys");
    var regex  = this._isChecked("regexp");
    
    return hist || multi || mulcfg || cuscfg || clean || keys || regex;
  },
  
  _initItem: function(elementId, count) {
    document.getElementById(elementId).disabled = !(0 < count);
    document.getElementById(elementId + "Items").value = count;
  },
  
  _isChecked: function(elementId) {
    return !document.getElementById(elementId).disabled && document.getElementById(elementId).checked;
  }
}