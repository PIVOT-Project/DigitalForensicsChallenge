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
 * The Original Code is FhcDateTimeDialog.
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
 * Methods for the form history date/time dialog.
 *
 * Dependencies: FhcDateTimeDialog.xul
 */
const FhcDateTimeDialog = {

  /**
   * Initialize dialog for add or edit.
   */
  initFhcDateTimeDialog: function() {
    if (window.arguments[0].inn && window.arguments[0].inn.date) {
      var numberOfMilliseconds = window.arguments[0].inn.date;
      var theDate = new Date(parseInt(numberOfMilliseconds, 10));

      var month = new String(parseInt(theDate.getMonth(),10)+1);
      var dateValue = theDate.getFullYear() + "-" + month + "-" + theDate.getDate();

      document.getElementById("date").value = dateValue;
      document.getElementById("time").hour = theDate.getHours();
      document.getElementById("time").minute = theDate.getMinutes();
      document.getElementById("time").second = theDate.getSeconds();
    }

    //if (window.arguments[0].inn && window.arguments[0].inn.key) {
    //  var keyPressed = window.arguments[0].inn.key;
    //  dump("char pressed=" + keyPressed + "\n");
    //
    //  var element = document.getElementById("date");
    //  element.date = keyPressed;
    //  /*element.setSelectionRange(1, 1); not supported! */
    //  dump("element=" + element.id + "\n");
    //}
  },

  /**
   * Validate the data entered in the dialog when user activates the okay-button.
   * If validation fails, show error message and do not close the dialog thus
   * preventing the data to be saved.
   * Entered data is returned in window.arguments.
   *
   * @returns {Boolean}
   *          true when validation is okay, otherwise false preventing the dialog
   *          from closing
   */
  onFhcOK: function() {
    var aDatePicker = document.getElementById("date");
    var aTimePicker = document.getElementById("time");

    var userDateTime = aDatePicker.dateValue;
    userDateTime.setHours(aTimePicker.hour);
    userDateTime.setMinutes(aTimePicker.minute);
    userDateTime.setSeconds(aTimePicker.second);

    window.arguments[0].out = {
      date: userDateTime.getTime()
    };
    return true;
  },

  /**
   * Set timepickers time to 00:00:00.
   */
  setZeroTime: function() {
    var aTimePicker = document.getElementById("time");
    aTimePicker.hour = 0;
    aTimePicker.minute = 0;
    aTimePicker.second = 0;
  }
}