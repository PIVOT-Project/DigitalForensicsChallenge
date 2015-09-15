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
 * The Original Code is FhcDateHandler.
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
 * Formhistory Date-Time Handler
 *
 * Format a date according to the current locale.
 * Date and time parts are left padded with 0 to align nicely in columns.
 *
 * Dependencies: -
 */
function FhcDateHandler(aBundle) {
  // defaults
  this.dateSeparator = "/";

  // custom date format
  this.customDateFormat = null;

  // create a date in short dateformat and inspect layout (depends on locale)
  this.dateFormatter = Components.classes["@mozilla.org/intl/scriptabledateformat;1"]
                        .getService(Components.interfaces.nsIScriptableDateFormat);

  // try to determine the date-separator by formatting a preset date
  var shortDate = this.dateFormatter.FormatDate(
                        "" /* locale */,
                        this.dateFormatter.dateFormatShort,
                        1999, 2, 1 /* 1 feb 1999 */);
                        
  var dateSeparators = ["/", "-", "."];
  for(var ii=0; ii<dateSeparators.length; ii++) {
    if (3 == shortDate.split(dateSeparators[ii]).length) {
      this.dateSeparator = dateSeparators[ii];
      break;
    }
  }

  // init some date/time related locales
  this.timeLocale = {
    years  : aBundle.getString("timeindicator.years"),
    months : aBundle.getString("timeindicator.months"),
    weeks  : aBundle.getString("timeindicator.weeks"),
    day    : aBundle.getString("timeindicator.day"),
    days   : aBundle.getString("timeindicator.days"),
    hour   : aBundle.getString("timeindicator.hour"),
    hours  : aBundle.getString("timeindicator.hours"),
    minute : aBundle.getString("timeindicator.minute"),
    minutes: aBundle.getString("timeindicator.minutes"),
    second : aBundle.getString("timeindicator.second"),
    seconds: aBundle.getString("timeindicator.seconds")
  };

  this.dayNames = new Array(
    aBundle.getString("datelocale.sunday"),
    aBundle.getString("datelocale.monday"),
    aBundle.getString("datelocale.tuesday"),
    aBundle.getString("datelocale.wednesday"),
    aBundle.getString("datelocale.thursday"),
    aBundle.getString("datelocale.friday"),
    aBundle.getString("datelocale.saturday")
  );

  this.monthNames = new Array(
    aBundle.getString("datelocale.january"),
    aBundle.getString("datelocale.february"),
    aBundle.getString("datelocale.march"),
    aBundle.getString("datelocale.april"),
    aBundle.getString("datelocale.may"),
    aBundle.getString("datelocale.june"),
    aBundle.getString("datelocale.july"),
    aBundle.getString("datelocale.august"),
    aBundle.getString("datelocale.september"),
    aBundle.getString("datelocale.october"),
    aBundle.getString("datelocale.november"),
    aBundle.getString("datelocale.december")
  );
}


/**
 * FhcDateHandler
 */
FhcDateHandler.prototype = {

  /**
   * Set a custom Date/Time Format string for the short date format.
   *
   * @param newFormat {String}
   *        the new Date/Time format.
   */
  setCustomDateFormat: function(newFormat) {
    this.customDateFormat = newFormat;
  },

  /**
   * Convert date in microseconds to string according to current locale, parts
   * are left padded with 0 in order to align nicely when used in columns and
   * fractional seconds are excluded.
   *
   * @param   uSeconds {Number}
   *          the date/time in microseconds (internal firefox representation)
   *
   * @returns {String}
   *          date+time according to current locale (ie 15-07-2009 12:01:59)
   */
  toDateString: function(uSeconds) {
    if (!uSeconds) return "";
    var d = new Date(uSeconds / 1000);
    return this.dateToDateString(d);
  },

  /**
   * Convert date to string according to current locale, parts
   * are left padded with 0 in order to align nicely when used in columns and
   * fractional seconds are excluded.
   *
   * @param  aDate {Date}
   *         the date/time
   *
   * @return {String}
   *         date+time according to current locale (ie 15-07-2009 12:01:59)
   */
  dateToDateString: function(aDate) {
    var result;
    if (this.customDateFormat != null) {
       result = this._getCustomDateTimeString(aDate);
    } else {
      result = this._getShortDateString(aDate);
      result += " " + this._getTimeString(aDate)
    }
    return result;
  },

  /**
   * Get the current system date/time in microseconds.
   *
   * @return {number}
   *         the current system date/time in microseconds
   */
  getCurrentDate: function() {
    var d = new Date();
    return d.getTime() * 1000;
  },

  /**
   * Get current date/time as string, formatted according to the system locale.
   *
   * @return {String}
   *         the date/time formatted according to the system locale.
   */
  getCurrentDateString: function() {
    return this.toDateString(this.getCurrentDate());
  },
  
  /**
   * Get current date/time as ISO formatted string.
   *
   * @return {String}
   *         the date/time ISO formatted.
   */
  getCurrentISOdateString: function() {
    return this.toISOdateString(this.getCurrentDate());
  },
  
  /**
   * Convert a date/time in microseconds to a full date/time string including
   * the fractional seconds.
   *
   * @param  uSeconds {Number}
   *         the date/time in microseconds (internal firefox representation)
   *
   * @return {String}
   *         date+time according to current locale (ie 15-07-2009 12:01:59.123456)
   */
  toFullDateString: function(uSeconds) {
    if (!uSeconds) return "";
    var d = new Date(uSeconds / 1000);
    var uSecondsPart = uSeconds % 1000;
    var timeString = 
      this._getTimeString(d) + "." +
      this._padZero(d.getMilliseconds(), 3) +
      this._padZero(uSecondsPart, 3);
    while ("0" == timeString.charAt(timeString.length-1)) {
      timeString = timeString.substr(0, timeString.length-1);
    }
    return this._getShortDateString(d) + " " + timeString;
  },

  /**
   * Convert a date/time in microseconds to a date string according to
   * the w3 recommendation (http://www.w3.org/TR/xmlschema-2/#dateTime).
   * (closely related to dates and times described in ISO 8601)
   * 
   * Format:
   * '-'? yyyy '-' mm '-' dd 'T' hh ':' mm ':' ss ('.' s+)? (zzzzzz)?
   * 
   * Example: 2009-10-19T13:08:34.000
   *
   * @param  uSeconds {Number}
   *         the date/time in microseconds (internal firefox representation)
   *
   * @return {String}
   *         date formatted according to widely accepted xmlschema standard.
   */
  toISOdateString: function(uSeconds) {
    if (!uSeconds) return "";
    var msec = uSeconds / 1000;
    var d = new Date(msec);
    var msecPart = msec.toString().substr(-3);
    var iso = 
      this._padZero(d.getFullYear(), 4) + "-" +
      this._padZero(d.getMonth()+1, 2) + "-" +
      this._padZero(d.getDate(), 2) + "T" +
      this._getTimeString(d) + "." +  msecPart;
    return iso;
  },

  /**
   * Convert ISO date/time back to microseconds.
   *
   * @param  aDateString {String}
   *         the date/time in ISO format (2009-10-19T13:08:34.000)
   *
   * @return {Number}
   *         date in uSeconds (internal representation)
   */
  fromISOdateString: function(aDateString) {
    var d = new Date(
      parseInt(aDateString.substr(0, 4), 10),   // year
      parseInt(aDateString.substr(5, 2), 10)-1, // month (zero based!)
      parseInt(aDateString.substr(8, 2), 10),   // day
      parseInt(aDateString.substr(11,2), 10),   // hour
      parseInt(aDateString.substr(14,2), 10),   // minute
      parseInt(aDateString.substr(17,2), 10),   // seconds
      parseInt(aDateString.substr(20,3), 10)    // msec
    );
    return d.getTime()*1000; //msec * 1000
  },

  /**
   * Get friendly/fuzzy formatted age (3 days) measured as the time between
   * uSecDate and nowDate (uSecDate presumed before to be before nowDate).
   *
   * @param  nowDate {Number}
   *         the current date/time in microseconds (internal firefox representation)
   *
   * @param  uSecDate {Number}
   *         the date/time in microseconds (internal firefox representation)
   *
   * @return {String}
   *         the timeperiod between nowDate and uSecDate, expressed in a
   *         single unit of time (seconds|minutes|hours|days)
   */
  getFuzzyAge: function(nowDate, uSecDate) {
    var result;
    var space = "  ";
    var noOfSeconds = Math.round((nowDate - uSecDate) / (1000*1000));
    var noOfDays = Math.round(noOfSeconds / (60 * 60 * 24));
    if (noOfDays > 0) {
      var noOfWeeks = Math.floor(noOfDays / 7);
      var noOfMonths = Math.floor(noOfDays / 30);
      if (noOfMonths > 24) {
        result = Math.round(noOfMonths / 12) + " " + this.timeLocale.years;
      }
      else if (noOfMonths > 1) {
        result = noOfMonths + " " + this.timeLocale.months;
        if (noOfMonths > 9) space = "";
      }
      else if (noOfWeeks > 2) {
        result = noOfWeeks + " " + this.timeLocale.weeks;
      }
      else  {
        result = noOfDays + this._getIndDay(noOfDays);
        if (noOfDays > 9) space = "";
      }
    }
    else {
      var noOfHours = Math.round(noOfSeconds / (60*60));
      if (noOfHours > 0) {
        result = noOfHours + this._getIndHour(noOfHours);
        if (noOfHours > 9) space = "";
      }
      else {
        if (noOfSeconds < 60) {
          result = noOfSeconds + this._getIndSecond(noOfSeconds);
          if (noOfSeconds > 9) space = "";
        }
        else {
          var noOfMinutes = Math.round(noOfSeconds / 60);
          result = noOfMinutes + this._getIndMinute(noOfMinutes);
          if (noOfMinutes > 9) space = "";
        }
      }
    }
    return space + result;
  },

// XXX: Unused? (could be much more efficient with RegExp)
//  /**
//   * @param  dateString {String}
//   *         String containing date time formatted as "yyyy-mm-dd hh:mm:ss"
//   *
//   * @return {Date}
//   *         the date representation of the date/time string
//   */
//  toDate: function(dateString) {
//    var result = null;
//    var d, m, y, h, mi, s;
//    if (dateString && 0<dateString.length) {
//      var values = dateString.split(' ');
//      if (values && 2==values.length) {
//        var datePortion = values[0];
//        if (datePortion && 10==datePortion.length) {
//          var dateParts = datePortion.split('-');
//          if (dateParts && 3==dateParts.length) {
//            y = dateParts[0];
//            // month starts at zero!
//            m = new String(parseInt(dateParts[1], 10) - 1);
//            d = dateParts[2];
//          }
//        }
//        var timePortion = values[1];
//        if (timePortion && 8==timePortion.length) {
//          var timeParts = timePortion.split(':');
//          if (timeParts && 3==timeParts.length) {
//            h = timeParts[0];
//            mi = timeParts[1];
//            s = timeParts[2];
//          }
//        }
//      }
//    }
//    if (d && m && y && h && mi && s) {
//      result = new Date(y, m, d, h, mi, s);
//      //dump("toDate() " + dateString + " is " + result.toLocaleString() + "\n");
//    }
//    return result;
//  },

  /**
   * Convert a date in microseconds (internal firefox representation) to
   * a Date object without the fractional seconds.
   * 
   * @param  uSeconds {Number}
   *         a date/time in microseconds (internal firefox representation)
   * 
   * @return {Date}
   *         uSeconds converted to a Date without fractions of seconds
   */
  microsecondsToSimpleDate: function(uSeconds) {
    var theDate = new Date(parseInt(uSeconds, 10) / 1000);
    theDate.setMilliseconds(0);
    return theDate;
  },


  //----------------------------------------------------------------------------
  // Helper methods
  //----------------------------------------------------------------------------

  /**
   * Get short date formatted as string.
   *
   * @param  aDate {Date}
   *         the date to convert
   *
   * @return {String}
   *         date converted to string (15-01-2009)
   */
  _getShortDateString: function(aDate) {
    var dateString = this.dateFormatter.FormatDate(
                       "" /* locale */,
                       this.dateFormatter.dateFormatShort,
                       aDate.getFullYear(), aDate.getMonth()+1, aDate.getDate());

    // align by leftpadding day/month with 0
    var dateParts = dateString.split(this.dateSeparator);
    if (3 == dateParts.length) {
      for(var jj=0; jj<dateParts.length; jj++) {
        if (1 == dateParts[jj].length) {
          dateParts[jj] = "0" + dateParts[jj];
        }
      }
      dateString = dateParts[0] + this.dateSeparator
                 + dateParts[1] + this.dateSeparator
                 + dateParts[2];
    }
    return dateString;
  },

  /**
   * Get time formatted as string in 24hr format.
   *
   * @param  aDate {Date}
   *         the date to convert
   *
   * @return {String}
   *         date converted to time string (13:05:59)
   */
  _getTimeString: function(aDate) {
    var timeString =
      this._padZero(aDate.getHours(), 2)   + ":" +
      this._padZero(aDate.getMinutes(), 2) + ":" +
      this._padZero(aDate.getSeconds(), 2);
    return timeString;
  },

  /**
   * Get short date + time formatted as string according to a custom DateFormat.
   *
   * yy, yyyy          Year                 (96; 1996)
   * M, MM, MMM, MMMM  Month in year        (7; 07; Jul; July)
   * d, dd, ddd, dddd  Day in month         {1; 01; Sun; Sunday)
   * H, HH             Hour in day (0-23)   (6; 06)
   * h, hh             Hour in am/pm (1-12) (9; 08)
   * a, A              am/pm marker         (am; AM)
   * m, mm             Minute in hour       (3; 03)
   * s, ss             Second in minute     (5; 05)
   * SSS               Millisecond          (978)
   *
   * @param  aDate {Date}
   *         the date to convert
   *
   * @return {String}
   *         date converted according a custom date/time formst.
   */
  _getCustomDateTimeString: function(aDate)  {
    var dh = this;
    var dateString = this.customDateFormat.replace(/(yyyy|yy|MMMM|MMM|MM|M|dddd|ddd|dd|d|HH|H|hh|h|mm|m|ss|s|SSS|a|A)/g,
        function($1) {
            var h;
            switch ($1) {
              case 'yyyy':return aDate.getFullYear();
              case 'yy':return dh._padZero(aDate.getFullYear() % 100, 2);
              case 'MMMM':return dh.monthNames[aDate.getMonth()];
              case 'MMM':return dh.monthNames[aDate.getMonth()].substr(0, 3);
              case 'MM':return dh._padZero(aDate.getMonth()+1, 2);
              case 'M':return aDate.getMonth()+1;
              case 'dddd':return dh.dayNames[aDate.getDay()];
              case 'ddd':return dh.dayNames[aDate.getDay()].substr(0, 3);
              case 'dd':return dh._padZero(aDate.getDate(), 2);
              case 'd':return aDate.getDate();
              case 'H':return aDate.getHours();
              case 'HH':return dh._padZero(aDate.getHours(), 2);
              case 'h':return ((h = aDate.getHours() % 12) ? h : 12);
              case 'hh':return dh._padZero(((h = aDate.getHours() % 12) ? h : 12), 2);
              case 'm':return aDate.getMinutes();
              case 'mm':return dh._padZero(aDate.getMinutes(), 2);
              case 's':return aDate.getSeconds();
              case 'ss':return dh._padZero(aDate.getSeconds(), 2);
              case 'SSS':return dh._padZero(aDate.getMilliseconds(), 3);
              case 'a':return aDate.getHours() < 12 ? 'am' : 'pm';
              case 'A':return aDate.getHours() < 12 ? 'AM' : 'PM';
            }
            return "";
        }
    );
    return dateString;
  },

  /**
   * Left pad a value with "0" upto the given maxLength. If aValue >= maxLength
   * then aValue is returned unchanged.
   *
   * @param  aValue {Number|String}
   *         the value to pad
   *
   * @param  maxLength {Number}
   *         left pad upto the maxLength
   *
   * @return {String}
   *         aValue leftpadded with "0"
   */
  _padZero: function(aValue, maxLength) {
    var result = "" + aValue;
    while (result.length < maxLength) {
      result = "0" + result;
    }
    return result;
  },

  /**
   * Append " day(s)" (translation via locale) to time component.
   * @param  n {Number} the time component
   * @return {String} the time component with appended time indicator
   */
  _getIndDay: function(n) {
    return " " + ((n==1) ? this.timeLocale.day : this.timeLocale.days);
  },

  /**
   * Append " hour(s)" (translation via locale) to time component.
   * @param  n {Number} the time component
   * @return {String} the time component with appended time indicator
   */
  _getIndHour: function(n) {
    return " " + ((n==1) ? this.timeLocale.hour : this.timeLocale.hours);
  },

  /**
   * Append " minute(s)" (translation via locale) to time component.
   * @param  n {Number} the time component
   * @return {String} the time component with appended time indicator
   */
  _getIndMinute: function(n) {
    return " " + ((n==1) ? this.timeLocale.minute : this.timeLocale.minutes);
  },

  /**
   * Append " second(s)" (translation via locale) to time component.
   * @param  n {Number} the time component
   * @return {String} the time component with appended time indicator
   */
  _getIndSecond: function(n) {
    return " " + ((n==1) ? this.timeLocale.second : this.timeLocale.seconds);
  }
}