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
 * The Original Code is FhcKeyBindings.
 *
 * The Initial Developer of the Original Code is Stephan Mahieu.
 * Portions created by the Initial Developer are Copyright (C) 2010
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
 * Formhistory KeyBindings
 *
 * Key and mousebindings.
 *
 * Dependencies:
 *    FhcPreferenceHandler.
 *    StringBundle: formhistory.stringbundle.keys
 */

/**
 * Constructor.
 *
 * @param aPrefHandler {FhcPreferenceHandler}
 *        the preference handler for reading the preferences
 *
 */
function FhcKeyBindings(aPrefHandler) {
  this.prefHandler = aPrefHandler;
  this.stringBundle = document.getElementById('formhistory.stringbundle.keys');
}

//-------------------------------------------------------------
// FhcCleanupFilter
//-------------------------------------------------------------
FhcKeyBindings.prototype = {

  /**
   * Get the keybinding from preferences.
   */
  getKeybinding: function(textboxId) {
    var complexValue = this.prefHandler.getKeybindingValue(textboxId);
    if (complexValue) {
      var bindingItems = complexValue.data.split('+');

      if (bindingItems.length > 0) {
        // Last element is the key, remaining items are modifiers
        var key = bindingItems.pop();
        var keycode = '';
        if (key.indexOf('VK') == 0) {
          keycode	= key;
          key = null;
        }
        return this._createBinding(bindingItems, key, keycode);
      }
    }
    return null;
  },

  /**
   * Save keybinding to preferences.
   */
  saveKeybinding: function(textboxId, keybinding) {
    var stringData = '';
    if (keybinding) {
      stringData = keybinding.asString;
    }

    // Save shortcut as String in preferences
    this.prefHandler.setKeybindingValue(textboxId, stringData);
  },

  /**
   * Construct the keybinding from a key-event.
   */
  recognizeKeys: function(event) {
    var modifiers = [];
    var key = '';
    var keycode = '';

    // Get modifiers:
    if (event.altKey) modifiers.push('alt');
    if (event.ctrlKey) modifiers.push('control');
    if (event.metaKey) modifiers.push('meta');
    if (event.shiftKey) modifiers.push('shift');

    // Get the key or keycode:
    if (event.charCode) {
      key = String.fromCharCode(event.charCode).toUpperCase();
    } else {
      // Get keycode from keycodes list
      keycode = this._getKeyCodes()[event.keyCode];
      if (!keycode) {
        return null;
      }
    }

    // Shortcut may not be a single 'VK_TAB' (without modifiers)
    // because this button is used to change focus
    if (modifiers.length > 0 || keycode != 'VK_TAB') {
      return this._createBinding(modifiers, key, keycode);
    }
    return null;
  },

  /**
   * Convert the key-binding to a localized human readable format.
   */
  getFormattedKeybinding: function(keybinding) {
    var formattedKeybinding = '';

    if (!keybinding) {
      return formattedKeybinding;
    }

    // Modifiers
    for (var i=0; i < keybinding.modifiers.length; i++) {
      try {
        formattedKeybinding += '<' + this._getKeyString(keybinding.modifiers[i]) + '> + ';
      } catch(e) {
        return '';
      }
    }

    // Keys
    if (keybinding.key) {
      // Add key
      if(keybinding.key == ' ') {
        formattedKeybinding += '<' + this._getKeyString('VK_SPACE') + '>';
      } else {
        formattedKeybinding += keybinding.key;
      }
    } else if(keybinding.keycode) {
      // Add keycode
      try {
        formattedKeybinding += '<' + this._getKeyString(keybinding.keycode) + '>';
      } catch(e) {
        formattedKeybinding += '<' + keybinding.keycode.replace('VK_', '') + '>';
      }
    }

    return formattedKeybinding;
  },

  /**
   * Update the main keyset with a keybinding.
   */
  updateMainKeyset: function(id, bInvalidateCache) {
    var cmdId;
    switch(id) {
      case "shortcutManager":
        cmdId = "fhc_key_ShowFormHistoryControl";
        break;
      case "shortcutManageThis":
        cmdId = "fhc_key_ManageThisField";
        break;
      case "shortcutDeleteValueThis":
        cmdId = "fhc_key_DeleteValueThisField";
        break;
      case "shortcutDeleteThis":
        cmdId = "fhc_key_DeleteEntriesThisField";
        break;
      case "shortcutFillMostRecent":
        cmdId = "fhc_key_FillFormFieldsRecent";
        break;
      case "shortcutFillMostUsed":
        cmdId = "fhc_key_FillFormFieldsUsed";
        break;
      case "shortcutClearFields":
        cmdId = "fhc_key_ClearFilledFormFields";
        break;
      case "shortcutShowFormFields":
        cmdId = "fhc_key_ShowFormFields";
        break;
      case "shortcutCleanupNow":
        cmdId = "fhc_key_CleanupFormhistoryNow";
        break;
      case "shortcutSaveThisField":
        cmdId = "fhc_key_SaveThisField";
        break;
      case "shortcutSaveThisPage":
        cmdId = "fhc_key_SaveThisPage";
        break;
    }
    if (cmdId) {
      var keyNode = document.getElementById(cmdId);
      var keybinding = this.getKeybinding(id);

      if(keybinding && (keybinding.key || keybinding.keycode)) {
        keyNode.setAttribute('modifiers', keybinding.modifiers);
        if (keybinding.key) {
          keyNode.setAttribute('key', keybinding.key);
          keyNode.removeAttribute('keycode');
        } else {
          keyNode.setAttribute('keycode', keybinding.keycode);
          keyNode.removeAttribute('key');
        }
      } else {
        keyNode.setAttribute('modifiers', '');
        keyNode.setAttribute('key', '');
        keyNode.removeAttribute('keycode');
      }

      // Force browser to activate the new keybinding immediately
      if (bInvalidateCache) {
        var keySet = keyNode.parentNode;
        var updatedKeySet = keySet.cloneNode(true);
        keySet.parentNode.replaceChild(updatedKeySet, keySet);
      }
    }
  },



  _getKeyCodes: function() {
    var keycodes = [];

    // Get keycodes from the KeyEvent object
    for (var property in KeyEvent) {
      keycodes[KeyEvent[property]] = property.replace('DOM_','');
    }
    keycodes[8] = 'VK_BACK'; // VK_BACK_SPACE (index 8) must be VK_BACK

    return keycodes;
  },

  _createBinding: function(modifiers, key, keycode) {
    var binding = {
      modifiers: modifiers ? modifiers : [],
      key      : key,
      keycode  : keycode,
      asString : key + keycode
    };
    if (modifiers.length) {
      binding.asString = modifiers.join('+') + '+' + binding.asString;
    }
    return binding;
  },

  _getKeyString: function(aKey) {
    var value;
    if (this.stringBundle == null) {
      // no stringbundle defined in the xul
      value = "<undefined stringBundle>";
    } else {
      value = this.stringBundle.getString(aKey);
    }
    return value;
  }
}