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
 * The Original Code is FhcRegexpDialog.
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
 * Methods for the criteria edit dialog.
 *
 * Dependencies: FhcRegexpDialog.xul
 */
const FhcRegexpDialog = {
  /** Global var to hold callback function (null if not set). */
  checkRegexpExistsFunction: null,

  /**
   * Initialize dialog for add or edit.
   */
  init: function() {
    if (window.arguments[0].inn) {
      var inn = window.arguments[0].inn;
      document.getElementById("description").value  = inn.description;
      document.getElementById("category").value     = inn.category;
      document.getElementById("regexp").value       = inn.regexp;
      document.getElementById("caseSens").checked   = (1 == inn.caseSens);

      var radioGroup = document.getElementById("useforGroup");
      switch (inn.useFor) {
        case "N": radioGroup.selectedItem = document.getElementById("radioName");
                  break;
        case "V": radioGroup.selectedItem = document.getElementById("radioValue");
                  break;
        case "B": radioGroup.selectedItem = document.getElementById("radioBoth");
                  break;
      }
    }

    this.checkRegexpExistsFunction = window.arguments[0].regexpExistCallback;

    // show the description according to the action (add / edit)
    var action = window.arguments[0].action;
    switch(action) {
      case "add":
           document.getElementById("descriptionAdd").style.display = "block";
           break;
      case "edit":
           document.getElementById("descriptionEdit").style.display = "block";
           break;
    }

    // fill the list with available categories
    this._loadCategories();
  },

  /**
   * Fill the list with available categories.
   */
  _loadCategories: function() {
    var listElem = document.getElementById("menuPopupCatList");

    // delete old categories from the list
    while (listElem.hasChildNodes()) {
      listElem.removeChild(listElem.firstChild);
    }

    // add new categories to the list
    var dbHandler = new FhcDbHandler();
    var categories = dbHandler.getRegexpCategories();
    for (var it=0; it<categories.length; it++) {
      if ("" != categories[it].category) {
        listElem.appendChild(this._createMenuItem(categories[it].category));
      }
    }
    //delete dbHandler;
  },

  /**
   * Create a new menuitem.
   * @return {menuitem}
   */
  _createMenuItem: function(aLabel) {
    const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    var item = document.createElementNS(XUL_NS, "menuitem");
    item.setAttribute("label", aLabel);
    return item;
  },


  /**
   * Validate the data entered in the dialog when user activates the okay-button.
   * If validation fails, show error message and do not close the dialog thus
   * preventing the data to be saved.
   * Entered data is returned in window.arguments.
   *
   * @return {Boolean}
   *         true when validation is okay, otherwise false preventing the dialog
   *         from closing
   */
  onOkay: function() {
    var eDescription = document.getElementById("description").value;
    var eRegexp = document.getElementById("regexp").value;
    if (eDescription == "" || eRegexp == "") {
      document.getElementById("errorMessageBlank").hidden = false;
      return false;
    }

    var eUseFor = "V";
    if (document.getElementById("radioName").selected) {
      eUseFor = "N";
    } else if (document.getElementById("radioValue").selected) {
      eUseFor = "V";
    } else if (document.getElementById("radioBoth").selected) {
      eUseFor = "B";
    }

    var regexp = {
      description: eDescription,
      category:    document.getElementById("category").value,
      regexp:      eRegexp,
      caseSens:    document.getElementById("caseSens").checked ? 1 : 0,
      useFor:      eUseFor,
      regexpType:  ""
    };

    // check if entry exists
    if (this.checkRegexpExistsFunction) {
      if (this.checkRegexpExistsFunction(regexp)) {
        document.getElementById("errorMessageExist").hidden = false;
        return false;
      }
    }

    window.arguments[0].out = regexp;
    return true;
  },

  /**
   * Hide errormessage when fields are no longer blank due to user input to
   * indicate that the validation error is corrected.
   * Function is called each time the user enters data.
   *
   * @param curElem {DOM textbox}
   *
   */
  onInput: function(curElem) {
    document.getElementById("errorMessageExist").hidden = true;

    var descriptionElem = document.getElementById("description");
    var regexpElem = document.getElementById("regexp");
    if ((descriptionElem.value != "" && regexpElem.value != "")
      && !document.getElementById("errorMessageBlank").hidden)
    {
      document.getElementById("errorMessageBlank").hidden = true;
    }

    this._checkRegExpIfAny(regexpElem);
  },


  /**
   * If the textbox contains a RegExp, check if it is valid.
   * Display a marker with a tooltip if the RegExp can not be evaluated.
   *
   * @param curElem {DOM textbox}
   *        the RegExp textbox element
   *
   */
  _checkRegExpIfAny: function(curElem) {
     var statusMsg = this._testRegExp(curElem.value);
     this._setRegexTooltip(curElem, statusMsg);
  },

  /**
   * Add or delete a tooltip depending on the message.
   *
   * @param curElem {DOM textbox}
   *        the RegExp textbox element
   *
   * @param msg {String}
   *        the statusmessage to be put inside the tooltip
   *
   */
  _setRegexTooltip: function(curElem, msg) {
    var stateElem = document.getElementById(curElem.id + "-state");
    stateElem.value = (("" == msg) ? "" : "*");
    if ("" != msg) {
      curElem.tooltip = curElem.id + "-tip";
      stateElem.tooltip = curElem.id + "-tip";
      document.getElementById(curElem.id + "-errmsg").value = msg;
    } else {
      curElem.tooltip = "";
      stateElem.tooltip = "";
    }
  },

  /**
   * Test if a Regular Expression can be evaluated.
   *
   * @param  regExp {String}
   *         the Regular Expression to be evaluated
   *
   * @return {String}
   *         exception message if regExp invalid otherwise empty string
   */
  _testRegExp: function(regExp) {
    var errMsg = "";
    if ("" != regExp) {
      try {
        var re = new RegExp(regExp);
        re.test("dummy");
      } catch(e) {
        errMsg = e;
      }
    }
    return errMsg;
  }
}