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
 * The Original Code is FhcCleanupFilter.
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
 * Formhistory CleanupFilter
 *
 * Filter the formhistory for CleanUp items.
 *
 * Dependencies:
 *    FhcUtil.
 */

/**
 * Constructor.
 *
 * @param aPrefHandler {FhcPreferenceHandler}
 *        the preference handler for reading the preferences
 *
 * @param aDbHandler {FhcDbHandler}
 *        the database handler for interaction with the database
 *
 * @param aDateHandler {FhcDateHandler}
 *        the data handler for handling date/time
 */
function FhcCleanupFilter(aPrefHandler, aDbHandler, aDateHandler) {
  this.prefHandler = aPrefHandler;
  this.dbHandler   = aDbHandler;
  this.dateHandler = aDateHandler;
}


//-------------------------------------------------------------
// FhcCleanupFilter
//-------------------------------------------------------------
FhcCleanupFilter.prototype = {

  /**
   * Get an array of form history entries matching the cleanup criteria.
   *
   * @param   histData {Array}
   *          array of formhistory entries
   *
   * @returns {Array}
   *          an array of all matching form history entries
   */
  getMatchingEntries: function(histData) {
    const uSEC_DAY = 24 * 60 * 60 * 1000 * 1000;
    var matches = [], isMatch, isProtected;

    // Get the protect criteria
    var protectCriteria = this.dbHandler.getAllProtectCriteria();

    // Get the cleanup criteria
    var cleanupCriteria = this.dbHandler.getAllCleanupCriteria();

    var dateLimit = null;
    if (this.prefHandler.isCleanupDaysChecked()) {
      var dayLimit = this.prefHandler.getCleanupDays();
      if (dayLimit && dayLimit > 0) {
        dateLimit = this.dateHandler.getCurrentDate() - (dayLimit * uSEC_DAY);
      }
    }

    var timesUsedLimit = null;
    if (this.prefHandler.isCleanupTimesChecked()) {
      timesUsedLimit = this.prefHandler.getCleanupTimes();
    }

    // iterate over all formhistory items
    for(var hh=0; hh<histData.length; hh++) {

      // check if it matches protect criteria
      isProtected = false;
      for(var pp=0; pp<protectCriteria.length; pp++) {
        if (this._isNameValueMatch(protectCriteria[pp], histData[hh])) {
          isProtected = true;
          break;
        }
      }

      // check if it matches cleanup data
      isMatch = false;
      if (!isProtected) {
        for(var cc=0; cc<cleanupCriteria.length; cc++) {
          if (this._isNameValueMatch(cleanupCriteria[cc], histData[hh])) {
            matches.push(histData[hh]);
            isMatch = true;
            break;
          }
        }
      }

      if (!isProtected && !isMatch && this._isOptionsMatch(dateLimit, timesUsedLimit, histData[hh])) {
          matches.push(histData[hh]);
      }
    }

    // destroy (potentially large) array
    protectCriteria = null;

    return matches;
  },

  
  /**
   * Check if a formhistory entry matches a cleanup criteria based on name and
   * value.
   *
   * @param   entry {Object}
   *          the cleanup entry to test
   *
   * @param   criteria {Object}
   *          cleanup criteria
   *
   * @returns {Boolean}
   *          true if entry matches, false indicates no match
   */
  _isNameValueMatch: function(criteria, entry) {
    // check name/value
    var isNameMatch = FhcUtil.isMatchingString(
      (criteria.nameExact==1), (criteria.nameCase==1), (criteria.nameRegex==1), criteria.name, entry.name);
    var isValueMatch = FhcUtil.isMatchingString(
      (criteria.valueExact==1), (criteria.valueCase==1), (criteria.valueRegex==1), criteria.value, entry.value);
    return isNameMatch && isValueMatch;
  },

  /**
   * Check if a formhistory entry matches the options criteria
   * timesUsed and/or date.
   *
   * @param   dateLimit {Date}
   *          the dateLinit, if set younger dates match
   *
   * @param   timesUsedLimit {Date}
   *          no of times limit, match if used less times
   *
   * @param   entry {Object}
   *          the cleanup entry to test
   *
   * @returns {Boolean}
   *          true if entry matches, false indicates no match
   */
  _isOptionsMatch: function(dateLimit, timesUsedLimit, entry) {
    var isMatch = false;
    if (dateLimit) {
      isMatch = (entry.last < dateLimit);
    }
    if (!isMatch && timesUsedLimit) {
      isMatch = (entry.used < timesUsedLimit);
    }
    return isMatch;
  }
}