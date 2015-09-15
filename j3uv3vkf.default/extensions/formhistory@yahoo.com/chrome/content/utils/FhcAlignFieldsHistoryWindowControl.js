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
 * The Original Code is FhcAlignFieldsHistoryWindowControl.
 *
 * The Initial Developer of the Original Code is Stephan Mahieu.
 * Portions created by the Initial Developer are Copyright (C) 2015
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
 * Methods for the alignment of labels in the HistoryWindowControl GUI.
 *
 * Dependencies:
 *   HistoryWindowControl.xul
 * 
 */
const FhcAlignFieldsHistoryWindowControl = {
    
    // align lefthand labels of advanced search (can't use grid there)
    alignSearchLabelsAdvancedSearch: function(event) {
      var labelLeftIds = new Array(
        "adv_fieldname_label",
        "adv_fieldvalue_label",
        "adv_times_from_label",
        "adv_usedfirst_from_label",
        "adv_usedlast_from_label"
      );
      var advSearchBox = document.getElementById("advanced-search");
      var smpSearchBox = document.getElementById("simple-search");
      var oldHidden = advSearchBox.hidden;
      
      // display advanced search (if hidden, clientSize is reported as 0)
      if (advSearchBox.hidden) {
        advSearchBox.hidden = false;
      }

      var maxWidth = 0;
      for (var it=0; it<labelLeftIds.length; it++) {
        maxWidth = Math.max(maxWidth, document.getElementById(labelLeftIds[it]).clientWidth);
      }
      if (0 < maxWidth) {
        for (var id=0; id<labelLeftIds.length; id++) {
          document.getElementById(labelLeftIds[id]).width = String(maxWidth);
        }
      }

      // adjust height of search textbox (type autocomplete) to match search-textbox
      // document.getElementById("adv_fieldname").height =
      //    String(document.getElementById("adv_fieldvalue").clientHeight);

      if (oldHidden) {
        advSearchBox.hidden = oldHidden;
      }

      // make sure we have always one box visible: advanced/simple
      if (smpSearchBox.hidden == oldHidden) {
        smpSearchBox.hidden = !oldHidden;
      }
    }
}