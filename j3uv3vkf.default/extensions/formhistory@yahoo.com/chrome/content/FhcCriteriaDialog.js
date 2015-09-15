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
 * The Original Code is FhcCriteriaDialog.
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
 * Only used within FhcCriteriaDialog.xul, thus no danger of namespace conflicts.
 *
 * Dependencies: FhcCriteriaDialog.xul, FhcUtil.js, FhcDbHandler.js,
 *               FhcBundle.js, FhcPredefinedRegexp.js
 */
const FhcCriteriaDialog = {
  /** Global var to hold callback function (null if not set). */
  checkCriteriaExistsFunction: null,

  /**
   * Initialize dialog for add or edit.
   */
  initFhcCriteriaDialog: function() {
    if (window.arguments[0].inn) {
      var inn = window.arguments[0].inn;
      document.getElementById("description").value  = inn.description;
      document.getElementById("name").value         = inn.name;
      document.getElementById("value").value        = inn.value;

      document.getElementById("nameExact").checked   = (1 == inn.nameExact);
      document.getElementById("nameCase").checked    = (1 == inn.nameCase);
      document.getElementById("nameRegex").checked   = (1 == inn.nameRegex);
      document.getElementById("valueExact").checked  = (1 == inn.valueExact);
      document.getElementById("valueCase").checked   = (1 == inn.valueCase);
      document.getElementById("valueRegex").checked  = (1 == inn.valueRegex);
    }

    this.checkCriteriaExistsFunction = window.arguments[0].criteriaExistCallback;

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

    this._enableOptions();
    this.toggleRegexpCheckbox(document.getElementById("nameRegex"));
    this.toggleRegexpCheckbox(document.getElementById("valueRegex"));
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
  onFhcOK: function() {
    var eDescription = document.getElementById("description").value;
    var eName = document.getElementById("name").value;
    var eValue = document.getElementById("value").value;
    if (eName == "" && eValue == "") {
      document.getElementById("errorMessageBlank").hidden = false;
      return false;
    }

    var criteria = {
      description: eDescription,
      name:        eName,
      value:       eValue,
      nameExact:   document.getElementById("nameExact").checked ? 1 : 0,
      nameCase:    document.getElementById("nameCase").checked ? 1 : 0,
      nameRegex:   document.getElementById("nameRegex").checked ? 1 : 0,
      valueExact:  document.getElementById("valueExact").checked ? 1 : 0,
      valueCase:   document.getElementById("valueCase").checked ? 1 : 0,
      valueRegex:  document.getElementById("valueRegex").checked ? 1 : 0
    };

    // check if entry exists
    if (this.checkCriteriaExistsFunction) {
      if (this.checkCriteriaExistsFunction(criteria)) {
        document.getElementById("errorMessageExist").hidden = false;
        return false;
      }
    }

    window.arguments[0].out = criteria;
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
  onFhcInput: function(curElem) {
    document.getElementById("errorMessageExist").hidden = true;

    var nameElem = document.getElementById("name");
    var valueElem = document.getElementById("value");
    if ((nameElem.value != "" || valueElem.value != "")
      && !document.getElementById("errorMessageBlank").hidden)
    {
      document.getElementById("errorMessageBlank").hidden = true;
    }
    this._enableOptions();
    this.toggleRegexpCheckbox(document.getElementById(curElem.id + "Regex"));
  },

  /**
   * Set the new regexp.
   *
   * @param regexMenuItem {menuitem}
   *        the selected menuitem holding the new regular expression.
   */
  onSelectRegExp: function(regexMenuItem) {
    var parentMenu = FhcUtil.getMenuItemRootPopup(regexMenuItem);
    var destinationId = parentMenu.getAttribute("destinationid");
    var destTextbox = document.getElementById(destinationId);

    // set the regexp
    destTextbox.value = regexMenuItem.value;

    // set the regexp/case checkbox
    document.getElementById(destinationId + "Regex").checked = true;
    document.getElementById(destinationId + "Case").checked =
                        "1" == regexMenuItem.getAttribute("caseSens");

    // if no description given yet, use the regexp description
    var descriptionTextbox = document.getElementById("description");
    if ("" == descriptionTextbox.value) {
      descriptionTextbox.value = regexMenuItem.label;
    }

    this.onFhcInput(destTextbox);
  },

  /**
   * If RegExp checkbox checked then MatchExact should be disabled.
   *
   * @param cbRegExp {DOM element}
   *        the RegExp checkbox element
   */
  toggleRegexpCheckbox: function(cbRegExp) {
    switch(cbRegExp.id) {
      case "nameRegex":
           var nameElem = document.getElementById("name");
           var nameActive = (nameElem.value != "");
           document.getElementById("nameExact").disabled = (!nameActive || cbRegExp.checked);
           this._checkRegExpIfAny(nameElem);
           break;
      case "valueRegex":
           var valueElem = document.getElementById("value");
           var valueActive = (valueElem.value != "");
           document.getElementById("valueExact").disabled = (!valueActive || cbRegExp.checked);
           this._checkRegExpIfAny(valueElem);
           break;
    }
  },

  /**
   * Popup/Hide the regexp menu.
   *
   * @param textboxId {String}
   *        the id of the textbox initiating this method which is used to
   *        determine the regexp-menu to display.
   */
  showRegExpMenu: function(textboxId) {
    var txtBoxElem = document.getElementById(textboxId);
    var regexpMenu;
    switch(textboxId) {
      case "name":
           regexpMenu = document.getElementById("regexp-namelist-menu");
           break;
      case "value":
           regexpMenu = document.getElementById("regexp-list-menu");
           break;
    }
    if ("open" == regexpMenu.state) {
      regexpMenu.hidePopup();

    } else {
      // read the regexp list from the database
      var dbHandler = new FhcDbHandler();
      var bundle = new FhcBundle();

      var regexpData = dbHandler.getAllRegexp();
      if (null == regexpData) {
        // major problem with Cleanup DB!
        dump('\nMajor problem with Cleanup DB! (folder and/or file permissions?)\n');
        regexpData = [];
      }

      // if (initially) empty, populate db with predefined values
      if (0 == regexpData.length) {
        var predefHandler = new FhcPredefinedRegexp(dbHandler, bundle);
        predefHandler.addPredefinedRegexpToDb();
        //delete predefHandler;
        // read again
        regexpData = dbHandler.getAllRegexp();
      }

      // check if regexp menu needs rebuild
      var keyStore = "FhcGlobalRegexpListDirty";
      var ref = Application.storage.get(keyStore, "");
      if ("okay" != ref || regexpMenu.childNodes.length <= 2) {
        // menu never built before ("") or dirty ("dirty"), rebuild both menus
        this._rebuildRegexpMenu(regexpData, "N", document.getElementById("regexp-namelist-menu"));
        this._rebuildRegexpMenu(regexpData, "V", document.getElementById("regexp-list-menu"));

        Application.storage.set(keyStore, "okay");
      }
      //delete regexpData;
      //delete dbHandler;
      //delete bundle;
      
      regexpMenu.openPopup(txtBoxElem, "after_end", 0, 0, false, false);
      regexpMenu.setAttribute("destinationid", textboxId);
    }
  },

  /**
   * Rebuild the regular expressions menu.
   *
   * @param regexpData {regexp Array}
   *        the regexp data to be added to the menu
   *
   * @param useFor {String}
   *        the type of menuitems ("N" for names, "V" for values)
   *
   * @param regexpMenu {Menu Element}
   *        the menu where regexp menuitems should be added to
   *
   */
  _rebuildRegexpMenu: function(regexpData, useFor, regexpMenu) {
    // delete old menu items (items without an id) from the list
    var nodes = regexpMenu.childNodes;
    for (var nn=nodes.length-1; nn>=0; nn--) {
      if (!nodes[nn].id) {
        regexpMenu.removeChild(nodes[nn]);
      }
    }

    // insert at the bottom
    var insertPoint = regexpMenu.childNodes[regexpMenu.childNodes.length];

    // add new menu items to the list
    var menuItem, menus, catMenu;
    for (var it=regexpData.length-1; it>=0; it--) {
      if (useFor == regexpData[it].useFor || "B" == regexpData[it].useFor) {
        menuItem = FhcUtil.createMenuItem(regexpData[it].description, regexpData[it].regexp);
        menuItem.setAttribute("caseSens", regexpData[it].caseSens);
        //menuItem.setAttribute("autocheck", "false");
        //menuItem.setAttribute("type", "checkbox");
        menuItem.addEventListener("command", function(){var _this = this;FhcCriteriaDialog.onSelectRegExp(_this)}, false);

        if ("" != regexpData[it].category) {
          menus = regexpMenu.getElementsByTagName("menu");
          catMenu = null;
          for (var ii=0; ii<menus.length && !catMenu; ii++) {
            if (menus[ii].getAttribute("label") == regexpData[it].category) {
              catMenu = menus[ii];
            }
          }
          if (null == catMenu) {
            catMenu = FhcUtil.createMenu(regexpData[it].category);
            catMenu.setAttribute("class", "menu-iconic fh_submenu");
            regexpMenu.insertBefore(catMenu, insertPoint);
            insertPoint = catMenu;
          }
          catMenu.firstChild.insertBefore(menuItem, catMenu.firstChild.firstChild);
        } else {
          regexpMenu.insertBefore(menuItem, insertPoint);
          insertPoint = menuItem;
        }
      }
    }
  },

  /**
   * Enable the options (checkboxes for exact/case) only for the inputfields that
   * contain data, disable the opions for empty inputfields.
   */
  _enableOptions: function() {
    var nameActive = (document.getElementById("name").value != "");
    document.getElementById("nameExact").disabled = !nameActive;
    document.getElementById("nameCase").disabled = !nameActive;
    document.getElementById("nameRegex").disabled = !nameActive;

    var valueActive = (document.getElementById("value").value != "");
    document.getElementById("valueExact").disabled = !valueActive;
    document.getElementById("valueCase").disabled = !valueActive;
    document.getElementById("valueRegex").disabled = !valueActive;
  },

  /**
   * If the textbox contains a RegEx, check if it is valid.
   * Display a marker with a tooltip if the RegExp can not be evaluated.
   *
   * @param curElem {DOM textbox}
   *        the RegExp textbox element
   *
   */
  _checkRegExpIfAny: function(curElem) {
    var statusMsg;
    switch (curElem.id) {
      case "name":
           if (document.getElementById("nameRegex").checked) {
             statusMsg = this._testRegExp(curElem.value);
             this._setRegexTooltip(curElem, statusMsg);
           } else {
             this._setRegexTooltip(curElem, "");
           }
           break
      case "value":
           if (document.getElementById("valueRegex").checked) {
             statusMsg = this._testRegExp(curElem.value);
             this._setRegexTooltip(curElem, statusMsg);
           } else {
             this._setRegexTooltip(curElem, "");
           }
           break
    }
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