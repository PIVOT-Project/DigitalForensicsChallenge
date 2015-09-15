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
 * The Original Code is FhcBrowseHistoryDialog.
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
 * Methods for the form history edit dialog.
 * Only used within FhcEntryDialog.xul, thus no danger of namespace conflicts.
 *
 * Dependencies: FhcBrowseHistoryDialog.xul, FhcDbHandler.js,
 *               FhcBundle.js, FhcDateHandler.js, FhcUtil.js
 *
 */
const FhcBrowseHistoryDialog = {
  LOOKUP_COUNT:  10,
  dbHandler:     null,
  bundle:        null,
  dateHandler:   null,
  currentDate:   null,
  lastHistDate:  null,
  firstHistDate: null,

  /**
   * Initialize dialog.
   */
  init: function() {
    //var what = window.arguments[0].what;
    var fieldName  = window.arguments[0].fieldName;
    var fieldValue = window.arguments[0].fieldValue;
    var dateUsed   = window.arguments[0].date;

    this.bundle = new FhcBundle();
    this.dbHandler = new FhcDbHandler();
    this.dateHandler = new FhcDateHandler(this.bundle);

    this.currentDate = dateUsed;
    this.lastHistDate = dateUsed;
    this.firstHistDate = dateUsed;

    // Adjust display according to initial state checkbox buttons
    this.toggleRows(document.getElementById("titleButton"), "title");
    this.toggleRows(document.getElementById("hostButton"), "host");
    this.toggleRows(document.getElementById("urlButton"), "url");

    this.setFieldInfo(fieldName, fieldValue, dateUsed);
    this.getOlder();
    //this.getNewer();

    //this._scrollIntoView("newer");
  },

  /**
   * Dialog closes, cleanup.
   */
  destroy: function() {
    delete this.dateHandler;
    delete this.bundle;
    delete this.dbHandler;
    return true;
  },
  
  /**
   * Toggle display of title, host and url.
   * 
   * @param checkbox {Element}
   * @param what {String} ['title'|'host'|'url']
   */
  toggleRows: function(checkbox, what) {
    var elems = document.getElementsByClassName(what+'row');
    for (var i=0; i<elems.length; i++) {
      elems[i].hidden = !checkbox.hasAttribute("checked");
    }
  },
  
  /**
   * DOES NOT WORK!
   */
  _scrollIntoView: function(elementId) {
    var element = document.getElementById(elementId);
    var scrollbox = document.getElementById('content');
    scrollbox.ensureElementIsVisible(element);
  },

  /**
   * Get additional older history.
   */
  getOlder: function() {
    // get pages visited before the field was submitted
    var places = this.dbHandler.getVisitedPlaces(this.lastHistDate, this.LOOKUP_COUNT);
    if (places.length > 0) {
      var parent = document.getElementById("older");
      for (var ii=0; ii<places.length; ii++) {
        parent.appendChild(this._getPlaceInfo("older", places[ii]));
      }
      this.lastHistDate = places[places.length-1].date;
      //parent.lastChild.scrollIntoView(true);
      
    }
  },

  /**
   * Get additional newer history.
   */
  getNewer: function() {
    // get pages visited after the field was submitted
    var places = this.dbHandler.getVisitedPlacesAfter(this.firstHistDate, this.LOOKUP_COUNT);
    if (places.length > 0) {
      var parent = document.getElementById("newer");
      for (var ii=0; ii<places.length; ii++) {
        parent.insertBefore(
          this._getPlaceInfo("newer", places[ii]),
          parent.firstChild
        );
      }
      this.firstHistDate = places[places.length-1].date;
      //this._scrollIntoView("newer");
    }
  },

  /**
   * Set the formfield info.
   *
   * @param fieldName {String}
   * @param fieldValue {String}
   * @param dateUsed {Integer}
   */
  setFieldInfo: function(fieldName, fieldValue, dateUsed) {
    var datetime = document.getElementById("datetime");
    datetime.setAttribute("value", this.dateHandler.toDateString(dateUsed));

    var fieldname = document.getElementById("fieldname");
    fieldname.setAttribute("value", fieldName);

    var fieldvalue = document.getElementById("fieldvalue");
    fieldvalue.setAttribute("value", fieldValue);
  },

  /**
   * Get the place info inside a div.
   *
   * @param type {String}
   * @param place {Object}
   * 
   * @return {Element} placeinfo
   */
  _getPlaceInfo: function(type, place) {
    var template = document.getElementById("placetemplate");
    var box = template.cloneNode(true);

    var fuzzyage;
    if ("older" == type) {
      fuzzyage = this.dateHandler.getFuzzyAge(this.currentDate, place.date);
    } else {
      fuzzyage = this.dateHandler.getFuzzyAge(place.date, this.currentDate);
    }
    box.getElementsByClassName("fuzzyage")[0].setAttribute("value", "(" + fuzzyage.trimLeft() + ")");
    box.getElementsByClassName("datetime")[0].setAttribute("value", this.dateHandler.toDateString(place.date));

    box.getElementsByClassName("value placehost")[0].setAttribute("value", place.host);
    box.getElementsByClassName("value placetitle")[0].setAttribute("value", place.title);
    box.getElementsByClassName("value placeurl")[0].setAttribute("value", place.url);
    
    box.className = "box " + type;
    box.hidden = false;
    return box;
  }
}