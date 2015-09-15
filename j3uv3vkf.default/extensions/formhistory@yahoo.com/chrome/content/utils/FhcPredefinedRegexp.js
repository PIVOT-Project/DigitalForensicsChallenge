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
 * The Original Code is FhcPredefinedRegexp.
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
 * FhcPredefinedRegexp
 *
 * Methods for parsing and serializing XML Form History Data
 *
 * Dependencies: FhcDbHandler.js, FhcBundle.js
 */
function FhcPredefinedRegexp(fhcDbHandler, fhcBundle) {
  this.dbHandler = fhcDbHandler;
  this.bundle = fhcBundle;
}

FhcPredefinedRegexp.prototype = {

  /**
   * Add all predefined regexp to the database.
   */
  addPredefinedRegexpToDb: function() {
    var regexp = this.getPredefinedRegexp();
    this.dbHandler.bulkAddRegexp(regexp);
  },

  /**
   * Get the predefine Regexp.
   *
   * @return {Regexp[]}
   *         regexp entries
   */
  getPredefinedRegexp: function() {
    var defArray = [];
    defArray.push(
      {u: "N", d: "regexp.address",          c: "", r: "address"},
      {u: "N", d: "regexp.email",            c: "", r: "email"},
      {u: "N", d: "regexp.login",            c: "", r: "login"},
      {u: "N", d: "regexp.searchbarhistory", c: "", r: "searchbar-history"},
      {u: "N", d: "regexp.username",         c: "", r: "username$"},
      {u: "V", d: "regexp.creditcardnumber", c: "", r: "^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\\d{3})\\d{11})$"},
      {u: "V", d: "regexp.currency",         c: "", r: "[-+]?\\d+(\\.|,)\\d{2}$"},
      {u: "V", d: "regexp.date",             c: "", r: "^\\d{1,2}[\\/-]\\d{1,2}[\\/-]\\d{2,4}$"},
      {u: "V", d: "regexp.domain",           c: "", r: "\\b[a-zA-Z0-9\\-\\.]+\\.[a-zA-Z]{2,}\\b"},
      {u: "V", d: "regexp.emailaddress",     c: "", r: "[\\w-]+(?:\\.[\\w-]+)*@(?:[\\w-]+\\.)+[a-zA-Z]{2,7}"},
      {u: "V", d: "regexp.guid",             c: "", r: "^[A-Za-z0-9]{8}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{12}$"},
      {u: "V", d: "regexp.ipaddress",        c: "", r: "^(([01]?\\d?\\d|2[0-4]\\d|25[0-5])\\.){3}([01]?\\d?\\d|2[0-4]\\d|25[0-5])$"},
      {u: "V", d: "regexp.macaddress",       c: "", r: "^([0-9a-fA-F][0-9a-fA-F]:){5}([0-9a-fA-F][0-9a-fA-F])$"},
      {u: "V", d: "regexp.phonenumber",      c: "", r: "^((\\+\\d{1,3}(-| )?\\(?\\d\\)?(-| )?\\d{1,5})|(\\(?\\d{2,6}\\)?))(-| )?(\\d{3,4})(-| )?(\\d{4})$"},
      {u: "V", d: "regexp.time",             c: "", r: "^((([0]?[1-9]|1[0-2])(:)[0-5][0-9]((:)[0-5][0-9])?( )?(AM|am|aM|Am|PM|pm|pM|Pm))|(([0]?[0-9]|1[0-9]|2[0-3])(:)[0-5][0-9]((:)[0-5][0-9])?))$"},
      {u: "V", d: "regexp.wholenumber",      c: "", r: "^\\s*\\d+\\s*$"},
      {u: "V", d: "regexp.zipcode_be", c: "regexp.zipcodes", r: "^[1-9]{1}[0-9]{3}$"},
      {u: "V", d: "regexp.zipcode_de", c: "regexp.zipcodes", r: "^[A-Z]{1}( |-)?[1-9]{1}[0-9]{3}$"},
      {u: "V", d: "regexp.zipcode_fr", c: "regexp.zipcodes", r: "^(F-)?((2[A|B])|[0-9]{2})[0-9]{3}$"},
      {u: "V", d: "regexp.zipcode_nl", c: "regexp.zipcodes", r: "^[0-9]{4}\\s{0,2}[a-zA-z]{2}$"},
      {u: "V", d: "regexp.zipcode_uk", c: "regexp.zipcodes", r: "^[a-zA-Z]{1,2}[0-9][0-9A-Za-z]{0,1} {0,1}[0-9][A-Za-z]{2}$"},
      {u: "V", d: "regexp.zipcode_us", c: "regexp.zipcodes", r: "^\\d{5}(-\\d{4})?$"}
    );

    var regExpArray = [];
    for (var it=0; it<defArray.length; it++) {
      regExpArray.push({
        id:          -1,
        description: this.bundle.getString(defArray[it].d),
        category:    (("" == defArray[it].c) ? "" : this.bundle.getString(defArray[it].c)),
        regexp:      defArray[it].r,
        useFor:      defArray[it].u,
        caseSens:    0,
        regexpType:  "b"
      });
    }
    defArray = null;
    return regExpArray;
  }
}