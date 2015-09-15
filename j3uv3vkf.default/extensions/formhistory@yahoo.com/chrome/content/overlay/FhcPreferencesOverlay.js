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
 * The Original Code is FhcPreferenceOverlay.
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
 * FhcPreferencesOverlay
 *
 * Handler for the preference overlay (adds a button)
 *
 * Dependencies: -
 */
const FhcPreferencesOverlay = {
  
  // implementation of EventListener Interface for listening to events
  handleEvent: function(aEvent) {
    switch(aEvent.type) {
      // have to use select, load will not fire if privacy tab is not active in preferences dialog
      case "select":
        this._addFormHistoryButton();
        break;
    }
  },

  _onRememberFormsClick: function() {
    this._initControls();
  },

  _onManageFormsClick: function() {
    var manageCheckbox = document.getElementById("preferencesFormHistoryControlCheckboxManage");
    this._setManageHistoryByFHCEnabled(manageCheckbox.checked);
    this._initControls();
  },

  _initControls: function() {
    var rememberFormsCheckbox = document.getElementById("rememberForms");
    var manageCheckbox = document.getElementById("preferencesFormHistoryControlCheckboxManage");
    var settingsButton = document.getElementById("preferencesFormHistoryControlSettingsButton");

    if (!rememberFormsCheckbox.checked) {
      manageCheckbox.checked = false;
    } else {
      manageCheckbox.checked = this._isManageHistoryByFHCEnabled();
    }
    manageCheckbox.disabled = !rememberFormsCheckbox.checked;
    settingsButton.disabled = !rememberFormsCheckbox.checked || !manageCheckbox.checked;
  },
  
  _isManageHistoryByFHCEnabled: function() {
    return Components.classes["@mozilla.org/preferences-service;1"]
           .getService(Components.interfaces.nsIPrefService)
           .getBranch("extensions.formhistory.")
           .getBoolPref("manageFormhistoryByFHC");
  },
  
  _setManageHistoryByFHCEnabled: function(newBoolPref) {
    return Components.classes["@mozilla.org/preferences-service;1"]
           .getService(Components.interfaces.nsIPrefService)
           .getBranch("extensions.formhistory.")
           .setBoolPref("manageFormhistoryByFHC", newBoolPref);
  },

  // Add a button to the privacy pane after the rememberForms checkbox
  _addFormHistoryButton: function() {
    var rememberFormsCheckbox = document.getElementById("rememberForms");
    var newBox = document.getElementById("preferencesFormHistoryControlBox");
    
    // add button once (select may occur multiple times,
    if (rememberFormsCheckbox != null && newBox != null) {

      var historyGroup = rememberFormsCheckbox.parentNode;
      var formhistButton = document.getElementById("preferencesFormHistoryControlButton");
      var innerHbox = document.getElementById("preferencesFormHistoryControlBoxInnerHbox");
      var manageCheckbox = document.getElementById("preferencesFormHistoryControlCheckboxManage");

      // move the box into the desired position and unhide
      newBox.setAttribute("hidden", false);
      newBox.parentNode.removeChild(newBox);
      historyGroup.insertBefore(newBox, rememberFormsCheckbox);

      // move existing checkbox into the new box before the button
      historyGroup.removeChild(rememberFormsCheckbox);
      rememberFormsCheckbox.setAttribute("flex", "1");
      innerHbox.insertBefore(rememberFormsCheckbox, formhistButton);

      // initialize the controls
      this._initControls();

      rememberFormsCheckbox.addEventListener("click",
        function(e){FhcPreferencesOverlay._onRememberFormsClick();},
        false
      );
      manageCheckbox.addEventListener("click",
        function(e){FhcPreferencesOverlay._onManageFormsClick();},
        false
      );

      // eventlistener no longer needed
      removeEventListener("select", FhcPreferencesOverlay, false);
    }
  }
}

// Implement the handleEvent() method for this to work
window.addEventListener("select", FhcPreferencesOverlay, false);