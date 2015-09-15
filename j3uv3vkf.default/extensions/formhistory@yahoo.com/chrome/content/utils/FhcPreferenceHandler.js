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
 * The Original Code is FhcPreferenceHandler.
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
 * Preference handling convenience methods.
 *
 * Dependencies: -
 */
function FhcPreferenceHandler() {
  this.prefService = Components.classes["@mozilla.org/preferences-service;1"]
           .getService(Components.interfaces.nsIPrefService)
           .getBranch("extensions.formhistory.");
}

FhcPreferenceHandler.prototype = {

  isHideLoginmanagedFields: function() {
    return this.prefService.getBoolPref("hideLoginmanagedFields");
  },
  
  isDefaultSearchCurrentPageChecked: function() {
    return this.prefService.getBoolPref("defaultSearchCurrentPageChecked");
  },
  
  isSearchCaseSensitive: function() {
    return this.prefService.getBoolPref("searchCaseSensitive");
  },
  setSearchCaseSensitive: function(newBoolPref) {
    this.prefService.setBoolPref("searchCaseSensitive", newBoolPref);
  },
  
  isWarnOnDeleteOne: function() {
    return this.prefService.getBoolPref("warnOnDeleteOne");
  },
  setWarnOnDeleteOne: function(newBoolPref) {
    this.prefService.setBoolPref("warnOnDeleteOne", newBoolPref);
  },
  
  isWarnOnDeleteMultiple: function() {
    return this.prefService.getBoolPref("warnOnDeleteMultiple");
  },
  setWarnOnDeleteMultiple: function(newBoolPref) {
    this.prefService.setBoolPref("warnOnDeleteMultiple", newBoolPref);
  },

  getExclusions: function() {
    var exclString = this.prefService.getCharPref("exclusions");
    var exclArray = exclString.match(/\b\S+\b/g);
    if (null == exclArray) return [];
    return exclArray;
  },

  getLastUsedExportFilename: function() {
    return this.prefService.getCharPref("lastUsedExportFilename");
  },
  setLastUsedExportFilename: function(newFilename) {
    this.prefService.setCharPref("lastUsedExportFilename", newFilename);
  },

  isISOdateFormat: function() {
    return this.prefService.getBoolPref("exportXML.ISOexportDateFormat");
  },
  setISOdateFormat: function(newBoolPref) {
    return this.prefService.setBoolPref("exportXML.ISOexportDateFormat", newBoolPref);
  },

  getLastUsedCSVExportFilename: function() {
    return this.prefService.getCharPref("lastUsedCSVExportFilename");
  },
  setLastUsedCSVExportFilename: function(newFilename) {
    this.prefService.setCharPref("lastUsedCSVExportFilename", newFilename);
  },

  getLastUsedCleanupExportFilename: function() {
    return this.prefService.getCharPref("lastUsedCleanupExportFilename");
  },
  setLastUsedCleanupExportFilename: function(newFilename) {
    this.prefService.setCharPref("lastUsedCleanupExportFilename", newFilename);
  },

  isCleanupDaysChecked: function() {
    return this.prefService.getBoolPref("cleanupDaysChecked");
  },
  setCleanupDaysChecked: function(newBoolPref) {
    return this.prefService.setBoolPref("cleanupDaysChecked", newBoolPref);
  },

  getCleanupDays: function() {
    return this.prefService.getIntPref("cleanupDays");
  },
  setCleanupDays: function(newIntPref) {
    return this.prefService.setIntPref("cleanupDays", newIntPref);
  },

  isCleanupTimesChecked: function() {
    return this.prefService.getBoolPref("cleanupTimesChecked");
  },
  setCleanupTimesChecked: function(newBoolPref) {
    return this.prefService.setBoolPref("cleanupTimesChecked", newBoolPref);
  },

  getCleanupTimes: function() {
    return this.prefService.getIntPref("cleanupTimes");
  },
  setCleanupTimes: function(newIntPref) {
    return this.prefService.setIntPref("cleanupTimes", newIntPref);
  },

  isCleanupOnShutdown: function() {
    return this.prefService.getBoolPref("cleanupOnShutdown");
  },
  setCleanupOnShutdown: function(newBoolPref) {
    return this.prefService.setBoolPref("cleanupOnShutdown", newBoolPref);
  },

  isCleanupOnTabClose: function() {
    return this.prefService.getBoolPref("cleanupOnTabClose");
  },
  setCleanupOnTabClose: function(newBoolPref) {
    return this.prefService.setBoolPref("cleanupOnTabClose", newBoolPref);
  },

  isUseCustomDateTimeFormat: function() {
    return this.prefService.getBoolPref("useCustomDateTimeFormat");
  },

  getCustomDateTimeFormat: function() {
    return this.prefService.getCharPref("customDateTimeFormat");
  },

  isTaskbarVisible: function() {
    return this.prefService.getBoolPref("showStatusBarIcon");
  },

  isToolsmenuHidden: function() {
    return this.prefService.getBoolPref("hideToolsMenuItem");
  },
  isAppmenuHidden: function() {
    return this.prefService.getBoolPref("hideAppMenuItem");
  },
  isContextmenuHidden: function() {
    return this.prefService.getBoolPref("hideContextMenuItem");
  },

  getCSVSeparator: function() {
    return this.prefService.getCharPref("exportCSV.separator");
  },
  getCSVQuote: function() {
    return this.prefService.getCharPref("exportCSV.quote");
  },
  getCSVEscapePrefix: function() {
    return this.prefService.getCharPref("exportCSV.escape");
  },

  isQuickFillChangeBgColor: function() {
    return this.prefService.getBoolPref("quickfill.changebgcolor");
  },
  isQuickFillChangeBrdrColor: function() {
    return this.prefService.getBoolPref("quickfill.changebordrcolor");
  },
  isQuickFillChangeBrdrThickness: function() {
    return this.prefService.getBoolPref("quickfill.changebordrthickness");
  },

  getQuickFillChangeBgColor: function() {
    return this.prefService.getCharPref("quickfill.bgcolor");
  },
  getQuickFillChangeBrdrColor: function() {
    return this.prefService.getCharPref("quickfill.bordrcolor");
  },
  getQuickFillChangeBrdrThickness: function() {
    return this.prefService.getIntPref("quickfill.bordrthickness");
  },

  isManualsaveEnabled: function() {
    return this.prefService.getBoolPref("manualsave");
  },

  isManageHistoryByFHCEnabled: function() {
    return this.prefService.getBoolPref("manageFormhistoryByFHC");
  },

  setKeybindingValue: function(id, stringData) {
    return this.prefService.setComplexValue(
      "keybinding." + id,
      Components.interfaces.nsISupportsString,
      this._toUnicodeString(stringData)
    );
  },
  getKeybindingValue: function(id) {
    var value;
    try {
      value = this.prefService.getComplexValue(
        "keybinding." + id,
        Components.interfaces.nsIPrefLocalizedString
      )
    } catch(e) {}
    return value;
  },

  getBackgroundTree: function() {
    return this.prefService.getCharPref("backgroundTree");
  },
  setBackgroundTree: function(newSkin) {
     this.prefService.setCharPref("backgroundTree", newSkin);
  },

  getCustomTreeSkin: function() {
    return this.prefService.getCharPref("customTreeSkin");
  },
  setCustomTreeSkin: function(treeElm) {
    var background = this.getBackgroundTree();
    switch (background) {
      case "auto":
        if ("Darwin" == this._getOS()) {
          // System default is okay
          this.prefService.setCharPref("customTreeSkin", "");
        }
        else {
          // choose skin based on color contrast
          var contrast = this._getContrastColor(treeElm);
          this.prefService.setCharPref("customTreeSkin",
                    ("black" == contrast) ? "CustomDark" : "CustomDefault");
        }
        break;
      case "light":
        this.prefService.setCharPref("customTreeSkin", "CustomDefault");
        break;
      case "dark":
        this.prefService.setCharPref("customTreeSkin", "CustomDark");
        break;
      case "none":
        this.prefService.setCharPref("customTreeSkin", "");
        break;
    }
  },

  /* Multiline configuration */
  isMultilineBackupEnabled: function() {
    return this.prefService.getBoolPref("multiline.backupenabled");
  },
  setMultilineBackupEnabled: function (newBoolPref) {
    return this.prefService.setBoolPref("multiline.backupenabled", newBoolPref);
  },
  
  getMultilineSaveNewIfOlder: function() {
    return this.prefService.getCharPref("multiline.saveolder");
  },
  setMultilineSaveNewIfOlder: function(newCharPref) {
     this.prefService.setCharPref("multiline.saveolder", newCharPref);
  },
  
  getMultilineSaveNewIfLength: function() {
    return this.prefService.getCharPref("multiline.savelength");
  },
  setMultilineSaveNewIfLength: function(newCharPref) {
     this.prefService.setCharPref("multiline.savelength", newCharPref);
  },
  
  getMultilineDeleteIfOlder: function() {
    return this.prefService.getCharPref("multiline.deleteolder");
  },
  setMultilineDeleteIfOlder: function(newCharPref) {
     this.prefService.setCharPref("multiline.deleteolder", newCharPref);
  },
  
  getMultilineException: function() {
    return this.prefService.getCharPref("multiline.exception");
  },
  setMultilineException: function(newCharPref) {
     this.prefService.setCharPref("multiline.exception", newCharPref);
  },
  
  isMultilineSaveAlways: function() {
    return this.prefService.getBoolPref("multiline.savealways");
  },
  setMultilineSaveAlways: function (newBoolPref) {
    return this.prefService.setBoolPref("multiline.savealways", newBoolPref);
  },
  
  isMultilineHTMLSanitized: function() {
    return this.prefService.getBoolPref("multiline.sanitizehtmlpreview");
  },
  setMultilineHTMLSanitized: function (newBoolPref) {
    return this.prefService.setBoolPref("multiline.sanitizehtmlpreview", newBoolPref);
  },
  
  isMultilineSaveEncrypted: function() {
    return this.prefService.getBoolPref("multiline.saveencrypted");
  },
  setMultilineSaveEncrypted: function (newBoolPref) {
    return this.prefService.setBoolPref("multiline.saveencrypted", newBoolPref);
  },
  
  /* Manage FHC configuration */
  getManageFhcException: function() {
    return this.prefService.getCharPref("managefhc.exception");
  },
  setManageFhcException: function(newCharPref) {
     this.prefService.setCharPref("managefhc.exception", newCharPref);
  },
  

  //----------------------------------------------------------------------------
  // Global preferences (FireFox's options)
  //----------------------------------------------------------------------------
  isGlobalRememberFormEntriesActive: function() {
    return Components.classes["@mozilla.org/preferences-service;1"]
           .getService(Components.interfaces.nsIPrefBranch)
           .getBoolPref("browser.formfill.enable");
  },
  setGlobalRememberFormEntriesActive: function(newBoolPref) {
    return Components.classes["@mozilla.org/preferences-service;1"]
           .getService(Components.interfaces.nsIPrefBranch)
           .setBoolPref("browser.formfill.enable", newBoolPref);
  },

  getGlobalFormfillExpireDays: function() {
    return Components.classes["@mozilla.org/preferences-service;1"]
           .getService(Components.interfaces.nsIPrefBranch)
           .getIntPref("browser.formfill.expire_days");
  },

  getCurrentLocale: function() {
    return Components.classes["@mozilla.org/preferences-service;1"]
           .getService(Components.interfaces.nsIPrefBranch)
           .getCharPref("general.useragent.locale");
  },

  // Create a Unicode String
  _toUnicodeString: function(stringData) {
    var str = Components.classes['@mozilla.org/supports-string;1']
                .createInstance(Components.interfaces.nsISupportsString);
    // Set the String value:
    str.data = stringData;
    // Return the Unicode String:
    return str;
  },

  /**
   * Determine the OS.
   *
   * @return "WINNT" on Windows Vista, XP, 2000, and NT systems;
   *         "Linux" on GNU/Linux; and "Darwin" on Mac OS X.
   */
  _getOS: function() {
    return Components.classes["@mozilla.org/xre/app-info;1"]
	       .getService(Components.interfaces.nsIXULRuntime).OS;
  },

  /**
   * Determine whether black or white contrasts most with the textcolor of the
   * given element.
   *
   * @param elem {DOM element}
   * @return {String} black or white
   */
  _getContrastColor: function(elem) {
    var textColor = window.getComputedStyle(elem, null).getPropertyValue("color");
    var rgb = textColor.replace(/rgb\(|\)/g, "").split(",");
    var r = parseInt(rgb[0]);
    var g = parseInt(rgb[1]);
    var b = parseInt(rgb[2]);

    //YIQ takes advantage of human color-response characteristics
    var yiq = ((r*299)+(g*587)+(b*114))/1000;
    return ((yiq >= 128) ? "black" : "white");
  }
}