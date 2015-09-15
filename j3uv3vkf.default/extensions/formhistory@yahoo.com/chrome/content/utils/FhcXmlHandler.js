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
 * The Original Code is FhcXmlHandler.
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
 * FhcXmlHandler
 *
 * Methods for parsing and serializing XML Form History Data
 *
 * Dependencies: FhcDateHandler.js, FhcRdfExtensionHandler.js
 */
function FhcXmlHandler(fhcDatehandler, useISOdates) {
  this.serializer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"]
                              .createInstance(Components.interfaces.nsIDOMSerializer);
  this.dateHandler = fhcDatehandler;
  
  this.useISOdateFormat = useISOdates;
}

FhcXmlHandler.prototype = {

  /**
   * Serialize data (formhistory, config, etc) into a XML string representation.
   *
   * @param  options {Object}
   *         object containing data plus export options
   *
   * @param  prefHandler {FhcPreferenceHandler}
   *         the preferenceHandler providing cleanup preferences.
   *
   * @param  dbHandler {FhcDbHandler}
   *         the database handler
   *         
   * @return {String}
   *         a pretty printed XML string representation of the entries
   */
  dataToXMLString: function(options, prefHandler, dbHandler) {
    // create a DOM tree
    var doc = document.implementation.createDocument("", "", null);
    var rootElem = doc.createElement("formhistory");
    doc.appendChild(rootElem);

    // create a header    
    this._appendHeaderElement(doc, rootElem);
    
    // add formhistory fields
    if (options.entries && 0 < options.entries.length) {
      var entries = options.entries;
      var fieldsElem = doc.createElement("fields");
      rootElem.appendChild(fieldsElem);

      var fieldElem;
      for(var ii=0; ii<entries.length; ii++) {
        fieldElem = this._createFormhistoryElement(doc, entries[ii]);
        fieldsElem.appendChild(fieldElem);
      }
    }
    
    // add multiline editorfields
    if (options.multilines && 0 < options.multilines.length) {
      var multilines = options.multilines;
      var editorfieldsElem = doc.createElement("editorFields");
      rootElem.appendChild(editorfieldsElem);

      var editorfieldElem;
      for(var nn=0; nn<multilines.length; nn++) {
        editorfieldElem = this._createEditorfieldElement(doc, multilines[nn]);
        editorfieldsElem.appendChild(editorfieldElem);
      }
    }
    
    if (options.exportMultiCfg) {
      // multiline configuration
      var multilinecfgElem = doc.createElement("editorFields-configuration");
      rootElem.appendChild(multilinecfgElem);
      
      this._appendMultilineConfig(doc, multilinecfgElem, prefHandler, dbHandler);
    }

    // add custome save configuration
    if (options.exportCustSaveCfg) {
      // custom save configuration
      var custsavecfgElem = doc.createElement("saveFormHistory-configuration");
      rootElem.appendChild(custsavecfgElem);
      
      this._appendCustomSaveCfg(doc, custsavecfgElem, prefHandler, dbHandler);
    }

    // add regular expressions
    if (options.exportRegexp) {
      var regexpsElem = doc.createElement("regularExpressions");
      rootElem.appendChild(regexpsElem);

      var regexpElem;
      var regexpData = dbHandler.getAllRegexp();
      for(var kk=0; kk<regexpData.length; kk++) {
        regexpElem = this._createRegexpElement(doc, regexpData[kk]);
        regexpsElem.appendChild(regexpElem);
      }
      regexpData = null;
    }
    
    // add cleanup configuration
    if (options.exportClean) {
      var cleanupElem = doc.createElement("formhistory-cleanup");
      rootElem.appendChild(cleanupElem);
      
      this._appendCleanupConfig(doc, cleanupElem, prefHandler, dbHandler);
    }
    
    // add keybindings
    if (options.exportKeys) {
      var keyBindingsElem = doc.createElement("keyBindings");
      rootElem.appendChild(keyBindingsElem);
      
      this._appendKeybindings(doc, keyBindingsElem, prefHandler);
    }
    
    // serialize to string (pretty printed)
    //return this.serializer.serializeToString(doc);
	return(this._prettyPrintXML(this.serializer.serializeToString(doc), "\t"));
  },
 
  /**
   * Deserialize a XML inputstream containing formhistory data.
   *
   * @param  streamIn {nsIInputStream}
   *         the inputstream (source) of the XML
   *
   * @return {Array}
   *         an array of formhistory entries
   */
  parseXMLdata: function(streamIn) {
    var parsedEntries = [];
    var parsedEditorfield = [];
    var parsedEditorfieldPrefs = null;
    var parsedCustomSavePrefs = null;
    var parsedCleanupCriteria = [];
    var parsedProtectCriteria = [];
    var parsedCleanupPrefs = null;
    var parsedKeybindings = [];
    var parsedRegexp = [];
    
    var now = this.dateHandler.getCurrentDate();

    var parser = new DOMParser();
    try {
      var xmlString = this._readTextFromStream(streamIn);
      var doc = parser.parseFromString(xmlString, "text/xml");
      
      if ("formhistory" == doc.documentElement.nodeName ||
          "formhistory-cleanup" == doc.documentElement.nodeName) {
        
        // formhistory fields
        var fldElem = doc.getElementsByTagName("field");
        var nameElem, valElem;
        for(var ii=0; ii<fldElem.length; ii++) {
          if (fldElem[ii].hasChildNodes()) {
            nameElem = fldElem[ii].getElementsByTagName("name");
            valElem = fldElem[ii].getElementsByTagName("value");

            if (1 == valElem.length && 0 < valElem[0].textContent.length) {
              parsedEntries.push({
                id:    -1,
                name:  nameElem[0].textContent,
                value: this._decode(valElem[0].textContent),
                used:  this._getElementValue(fldElem[ii], "timesUsed", 0),
                first: this._getElemenDate(  fldElem[ii], "firstUsed", now),
                last:  this._getElemenDate(  fldElem[ii], "lastUsed",  now)
              });
            }
          }
        }
        
        // multiline editor fields
        var editorfieldElem = doc.getElementsByTagName("editorField");
        var edFldElem;
        for(var nn=0; nn<editorfieldElem.length; nn++) {
          if (editorfieldElem[nn].hasChildNodes()) {
            edFldElem = editorfieldElem[nn];
            parsedEditorfield.push({
              id:         this._decode(this._getElementValue(edFldElem, "id", "")),
              name:       this._decode(this._getElementValue(edFldElem, "name", "")),
              type:       this._decode(this._getElementValue(edFldElem, "type", "")),
              formid:     this._decode(this._getElementValue(edFldElem, "formid", "")),
              content:    this._decode(this._getElementValue(edFldElem, "content", "")),
              host:       this._decode(this._getElementValue(edFldElem, "host", "")),
              url:        this._decode(this._getElementValue(edFldElem, "url", "")),
              firstsaved: this._getElemenDate(edFldElem, "firstsaved",  0),
              lastsaved:  this._getElemenDate(edFldElem, "lastsaved",  0)
            });
          }
        }
        
        // multiline preferences
        var mlEditorfieldPrefs = doc.getElementsByTagName("editorFields-configuration");
        if (mlEditorfieldPrefs.length > 0) {
          parsedEditorfieldPrefs = {
            backupEnabled:   this._getTextContentOrNull(doc, "backupEnabled"),
            saveNewIfOlder:  this._getTextContentOrNull(doc, "saveNewIfOlder"),
            saveNewIfLength: this._getTextContentOrNull(doc, "saveNewIfLength"),
            deleteIfOlder:   this._getTextContentOrNull(doc, "deleteIfOlder"),
            exception:       this._getTextContentOrNull(doc, "exceptionEnable"),
            saveAlways:      this._getTextContentOrNull(doc, "saveAlways"),
            saveEncrypted:   this._getTextContentOrNull(doc, "saveEncrypted"),
            exceptionlist:   []
          };
        }
        
        // multiline exception list
        var exceptionElem = doc.getElementsByTagName("exception");
        var hostElem, exception;
        for(var ee=0; ee<exceptionElem.length; ee++) {
          if (exceptionElem[ee].hasChildNodes()) {
            hostElem = exceptionElem[ee].getElementsByTagName("host");
            if (1 == hostElem.length) {
              exception = {
                id:   null,
                host: hostElem[0].textContent
              };
              parsedEditorfieldPrefs.exceptionlist.push(exception);
            }
          }
        }
        
        // custom save preferences
        var customSavePrefs = doc.getElementsByTagName("saveFormHistory-configuration");
        if (customSavePrefs.length > 0) {
          parsedCustomSavePrefs = {
            saveEnabled:   this._getTextContentOrNull(doc, "customSaveEnabled"),
            exceptionlist: []
          }
        }
        
        // custom save exception list
        var csExceptionElem = doc.getElementsByTagName("exception");
        var pageElem, csException;
        for(var cs=0; cs<csExceptionElem.length; cs++) {
          if (csExceptionElem[cs].hasChildNodes()) {
            pageElem = csExceptionElem[cs].getElementsByTagName("pageFilter");
            if (1 == pageElem.length) {
              csException = {
                id:   null,
                url: pageElem[0].textContent
              };
              parsedCustomSavePrefs.exceptionlist.push(csException);
            }
          }
        }        
        
        // cleanup preferences
        parsedCleanupPrefs = {
          cleanupDaysChecked:  this._getAttributeOrNull(doc,   "daysUsedLimit", "active"),
          cleanupDays:         this._getTextContentOrNull(doc, "daysUsedLimit"),
          cleanupTimesChecked: this._getAttributeOrNull(doc,   "timesUsedLimit", "active"),
          cleanupTimes:        this._getTextContentOrNull(doc, "timesUsedLimit"),
          cleanupOnShutdown:   this._getTextContentOrNull(doc, "cleanupOnShutdown"),
          cleanupOnTabClose:   this._getTextContentOrNull(doc, "cleanupOnTabClose")
        };

        // criteria nameValuePairs
        var namevalElem = doc.getElementsByTagName("nameValue");
        var criteria, descrElem, critType;
        for(var jj=0; jj<namevalElem.length; jj++) {
          if (namevalElem[jj].hasChildNodes()) {
            descrElem = namevalElem[jj].getElementsByTagName("description");
            nameElem = namevalElem[jj].getElementsByTagName("name");
            valElem = namevalElem[jj].getElementsByTagName("value");

            if (1 == nameElem.length || 1 == valElem.length) {

              critType = "C";
              if ("protectCriteria" == namevalElem[jj].parentNode.parentNode.tagName) {
                critType = "P";
              }
              criteria = {
                id:          -1,
                name:        (1==nameElem.length)  ? this._decode(nameElem[0].textContent)  : "",
                value:       (1==valElem.length)   ? this._decode(valElem[0].textContent)   : "",
                description: (1==descrElem.length) ? this._decode(descrElem[0].textContent) : "",
                nameExact:   (1==nameElem.length)  ? this._getIntAttr(nameElem[0],"exact")  : 0,
                nameCase:    (1==nameElem.length)  ? this._getIntAttr(nameElem[0],"case")   : 0,
                nameRegex:   (1==nameElem.length)  ? this._getIntAttr(nameElem[0],"regex")  : 0,
                valueExact:  (1==valElem.length)   ? this._getIntAttr(valElem[0], "exact")  : 0,
                valueCase:   (1==valElem.length)   ? this._getIntAttr(valElem[0], "case")   : 0,
                valueRegex:  (1==valElem.length)   ? this._getIntAttr(valElem[0], "regex")  : 0,
                critType:    critType
              };

              if ("C" == criteria.critType) {
                parsedCleanupCriteria.push(criteria);
              } else {
                parsedProtectCriteria.push(criteria);
              }
            }
          }
        }

        // regular expressions
        var regexpElem = doc.getElementsByTagName("regularExpression");
        var catElem, exprElem, useforElem, typeElem;
        for(var mm=0; mm<regexpElem.length; mm++) {
          if (regexpElem[mm].hasChildNodes()) {
            descrElem  = regexpElem[mm].getElementsByTagName("description");
            catElem    = regexpElem[mm].getElementsByTagName("category");
            exprElem   = regexpElem[mm].getElementsByTagName("expression");
            useforElem = regexpElem[mm].getElementsByTagName("useFor");
            typeElem   = regexpElem[mm].getElementsByTagName("type");

            parsedRegexp.push({
              id:          -1,
              description: this._decode(descrElem[0].textContent),
              category:    this._decode(catElem[0].textContent),
              regexp:      this._decode(exprElem[0].textContent),
              useFor:      useforElem[0].textContent,
              caseSens:    this._getIntAttr(exprElem[0],"exact"),
              regexpType:  ("built-in" == typeElem[0].textContent ? "b" : "")
            });
          }
        }

        // keyBindings
        var keyBindingsElem = doc.getElementsByTagName("keyBinding");
        var bindingId, bindingValue;
        for(var kk=0; kk<keyBindingsElem.length; kk++) {
           bindingValue = this._decode(keyBindingsElem[kk].textContent);
           bindingId = keyBindingsElem[kk].getAttribute("id");
           parsedKeybindings.push({
             id:    bindingId,
             value: bindingValue
           });
        }
        
      }
    } catch(ex) {
      alert("XML parser exception: " + ex);
    }
    
    var result = {
      entries:      parsedEntries,
      multiline:    parsedEditorfield,
      multilineCfg: parsedEditorfieldPrefs,
      custSaveCfg:  parsedCustomSavePrefs,
      cleanup:      parsedCleanupCriteria,
      protect:      parsedProtectCriteria,
      cleanupCfg:   parsedCleanupPrefs,
      keys:         parsedKeybindings,
      regexp:       parsedRegexp
    }
    return result;
  },

  /**
   * Read text data from inputstream into a String.
   *
   * @param  streamIn {nsIInputStream}
   *         the inputstream (source)
   *
   * @return {String}
   *         text data
   */
  _readTextFromStream: function(streamIn) {
      var lines = "";
      var str = {};
      while (streamIn.readString(4096, str) != 0) {
        lines += str.value;
      }  
      return lines;
  },

  /**
   * Get the textcontent of the tag with the given tagname.
   */
  _getTextContentOrNull: function(doc, tagname) {
    var elements = doc.getElementsByTagName(tagname);
    return (elements.length > 0) ? elements[0].textContent : null;
  },

  /**
   * Get the requested atribute from the tag with the given tagname.
   */
  _getAttributeOrNull: function(doc, tagname, attributename) {
    var elements = doc.getElementsByTagName(tagname);
    return (elements.length  > 0) ? elements[0].getAttribute(attributename) : null;
  },

  /**
   * Convert the keybindings into a DOM representation.
   *
   * @param doc {DOM Document}
   *        the document object
   *
   * @param parentElem {DOM Element}
   *        the DOM element in which to add the new child elements
   *
   * @param  prefHandler {FhcPreferenceHandler}
   *         the preferenceHandler providing cleanup preferences.
   */
  _appendKeybindings: function(doc, parentElem, prefHandler) {
      var Ids = [
        "shortcutManager",
        "shortcutManageThis",
        "shortcutDeleteValueThis",
        "shortcutDeleteThis",
        "shortcutFillMostRecent",
        "shortcutFillMostUsed",
        "shortcutShowFormFields",
        "shortcutClearFields",
        "shortcutCleanupNow",
        "shortcutSaveThisField",
        "shortcutSaveThisPage"];
      var keyBinding, bindingValueComplex, bindingValue;
      for (var i=0; i<Ids.length; i++) {
        bindingValueComplex = prefHandler.getKeybindingValue(Ids[i]);
        bindingValue = bindingValueComplex ? bindingValueComplex.data : "";
        keyBinding = this._createKeyBindingElement(doc, Ids[i], bindingValue);
        parentElem.appendChild(keyBinding);
      }
  },

  /**
   * Convert the cleanup configuration into a DOM representation.
   *
   * @param doc {DOM Document}
   *        the document object
   *
   * @param parentElem {DOM Element}
   *        the DOM element in which to add the new child elements
   *
   * @param  prefHandler {FhcPreferenceHandler}
   *         the preferenceHandler providing cleanup preferences.
   *        
   * @param  dbHandler {FhcDbHandler}
   *         the database handler
   */
  _appendCleanupConfig: function(doc, parentElem, prefHandler, dbHandler) {
    // criteria
    var criteriaElem = doc.createElement("cleanupCriteria");
    parentElem.appendChild(criteriaElem);

    // general time/usage criteria from preferences
    var generalElem = doc.createElement("general");
    criteriaElem.appendChild(generalElem);
    
    var child;
    child = doc.createElement("daysUsedLimit");
    child.setAttribute("active", prefHandler.isCleanupDaysChecked());
    this._appendElement(generalElem, child, prefHandler.getCleanupDays());

    child = doc.createElement("timesUsedLimit");
    child.setAttribute("active", prefHandler.isCleanupTimesChecked());
    this._appendElement(generalElem, child, prefHandler.getCleanupTimes());

    // general automatic cleanup from preferences
    this._appendElement(generalElem, doc.createElement("cleanupOnShutdown"), prefHandler.isCleanupOnShutdown());
    this._appendElement(generalElem, doc.createElement("cleanupOnTabClose"), prefHandler.isCleanupOnTabClose());

    // name/value pairs
    var namevalPairsElem = doc.createElement("nameValuePairs");
    criteriaElem.appendChild(namevalPairsElem);

    // name/value criteria
    var criteria = dbHandler.getAllCleanupCriteria();
    var namevalElem;
    for(var ii=0; ii<criteria.length; ii++) {
      namevalElem = this._createCleanupNameValueElement(doc, criteria[ii]);
      namevalPairsElem.appendChild(namevalElem);
    }
    criteria = null;

    // protect criteria
    var protectCriteriaElem = doc.createElement("protectCriteria");
    parentElem.appendChild(protectCriteriaElem);

    // name/value pairs
    var namevalPairsProtElem = doc.createElement("nameValuePairs");
    protectCriteriaElem.appendChild(namevalPairsProtElem);

    // name/value protect criteria
    var protectCriteria = dbHandler.getAllProtectCriteria();
    for(var jj=0; jj<protectCriteria.length; jj++) {
      namevalElem = this._createCleanupNameValueElement(doc, protectCriteria[jj]);
      namevalPairsProtElem.appendChild(namevalElem);
    }
    protectCriteria = null;
  },

  /**
   * Convert the editor backup configuration into a DOM representation.
   *
   * @param doc {DOM Document}
   *        the document object
   *
   * @param parentElem {DOM Element}
   *        the DOM element in which to add the new child elements
   *
   * @param  prefHandler {FhcPreferenceHandler}
   *         the preferenceHandler providing cleanup preferences.
   *        
   * @param  dbHandler {FhcDbHandler}
   *         the database handler
   */
  _appendMultilineConfig: function(doc, parentElem, prefHandler, dbHandler) {
    this._appendElement(parentElem, doc.createElement("backupEnabled"), prefHandler.isMultilineBackupEnabled());
    this._appendElement(parentElem, doc.createElement("saveNewIfOlder"), prefHandler.getMultilineSaveNewIfOlder());
    this._appendElement(parentElem, doc.createElement("saveNewIfLength"), prefHandler.getMultilineSaveNewIfLength());
    this._appendElement(parentElem, doc.createElement("deleteIfOlder"), prefHandler.getMultilineDeleteIfOlder());
    this._appendElement(parentElem, doc.createElement("saveAlways"), prefHandler.isMultilineSaveAlways());
    this._appendElement(parentElem, doc.createElement("saveEncrypted"), prefHandler.isMultilineSaveEncrypted());
    this._appendElement(parentElem, doc.createElement("exceptionEnable"), prefHandler.getMultilineException());
    
    // add exception list
    var exceptionsElem = doc.createElement("exceptions");
    parentElem.appendChild(exceptionsElem);
    
    var exceptions = dbHandler.getAllMultilineExceptions();
    var exceptionElem;
    for(var jj=0; jj<exceptions.length; jj++) {
      exceptionElem = this._createMultilineExceptionElement(doc, exceptions[jj]);
      exceptionsElem.appendChild(exceptionElem);
    }
    exceptions = null;
  },

  /**
   * Convert the custom save configuration into a DOM representation.
   *
   * @param doc {DOM Document}
   *        the document object
   *
   * @param parentElem {DOM Element}
   *        the DOM element in which to add the new child elements
   *
   * @param  prefHandler {FhcPreferenceHandler}
   *         the preferenceHandler providing cleanup preferences.
   *        
   * @param  dbHandler {FhcDbHandler}
   *         the database handler
   */
  _appendCustomSaveCfg: function(doc, parentElem, prefHandler, dbHandler) {
    this._appendElement(parentElem, doc.createElement("customSaveEnabled"), prefHandler.getManageFhcException());
    
    // add exception list
    var exceptionsElem = doc.createElement("exceptions");
    parentElem.appendChild(exceptionsElem);
    
    var exceptions = dbHandler.getAllCustomsaveExceptions();
    var exceptionElem;
    for(var jj=0; jj<exceptions.length; jj++) {
      exceptionElem = this._createCustomSaveExceptionElement(doc, exceptions[jj]);
      exceptionsElem.appendChild(exceptionElem);
    }
    exceptions = null;    
  },

  /**
   * Get the integer attribute from the element,
   * return 0 if the element has no such attribute.
   * 
   * @param element {DOM Element}
   *        the DOM element
   * @param attributeName {String}
   *        the name of the attribute
   */
  _getIntAttr: function(element, attributeName) {
    if (element.hasAttribute(attributeName)) {
      return parseInt(element.getAttribute(attributeName));
    }
    return 0;
  },

  /**
   * Encode special characters for use inside an XML document.
   *
   * @param  aString {String}
   *         string which may contain characters which are not allowed inside
   *         a XML document.
   *
   * @return {String}
   *         a string in which all invalid (international) characters are
   *         encoded so they can be safely used inside XML
   */
  _encode: function(aString) {
    // use encodeURIComponent() which can handle all international chars but
    // keep it somewhat readable by converting back some safe (for XML) chars
    return encodeURIComponent(aString)
             .replace(/\%20/g, " ")
             .replace(/^ /g, "%20") /* keep leading space  */
             .replace(/ $/g, "%20") /* keep trailing space */
             .replace(/\%21/g, "!")
             .replace(/\%22/g, '"')
             .replace(/\%23/g, "#")
             .replace(/\%24/g, "$")
             /* do not replace %25 (%) */
             .replace(/\%26/g, "&")
             .replace(/\%2B/g, "+")
             .replace(/\%2C/g, ",")
             .replace(/\%2F/g, "/")
             .replace(/\%3A/g, ":")
             .replace(/\%3B/g, ";")
             .replace(/\%3D/g, "=")
             .replace(/\%3F/g, "?")
             .replace(/\%40/g, "@")
             .replace(/\%5B/g, "[")
             .replace(/\%5C/g, "\\")
             .replace(/\%5D/g, "]")
             .replace(/\%5E/g, "^")
             .replace(/\%60/g, "`")
             .replace(/\%7B/g, "{")
             .replace(/\%7C/g, "|")
             .replace(/\%7D/g, "}")
             .replace(/\%7E/g, "~");
  },
  
  /**
   * Decode characters into their normal representation.
   *
   * @param  aString {String}
   *         string which may contain encoded characters
   *
   * @return {String}
   *         a string in which all encoded characters are decoded into its
   *         normal presentation
   */
  _decode: function(aString) {
    return decodeURIComponent(aString);
  },
  
  /**
   *  Create a DOM element for a date in native format (microseconds) and append
   *  it to the parentElemen. Also add a comment inside the date tag containing
   *  the date in human readable form.
   *
   *  @param  doc {DOM Document}
   *          the document object
   *  
   *  @param  parentElem {DOM Element}
   *          the DOM element in which to add the data child element
   *
   *  @param  dateElem {DOM Element}
   *          the DOM element representing the child date element
   *
   *  @param  uSeconds {Object}
   *          the date in microseconds, the content of this element
   */
  _appendDateElement: function(doc, parentElem, dateElem, uSeconds) {
    if (uSeconds != undefined) {

      if (this.useISOdateFormat) {
        // ISO date format
        dateElem.textContent = this.dateHandler.toISOdateString(uSeconds);
      }
      else {
        // uSeconds format
        var uSecondsElem = doc.createElement("date");
        uSecondsElem.textContent = uSeconds;

        var commentElem = doc.createComment(this.dateHandler.toFullDateString(uSeconds));

        dateElem.appendChild(commentElem);
        dateElem.appendChild(uSecondsElem);
      }
      
      parentElem.appendChild(dateElem);
    }
  },
  
  /**
   *  Create a DOM element holding a string value and append it to the
   *  parentElem.
   *
   *  @param  parentElem {DOM Element}
   *          the DOM element in which to add the data child element
   *
   *  @param  childElem {DOM Element
   *          the DOM element representing the child element
   *
   *  @param  aValue {String}
   *          the text value
   */
  _appendElement: function(parentElem, childElem, aValue) {
    childElem.textContent = aValue;
    parentElem.appendChild(childElem);
  },
  
  /**
   *  Create a Header element inside the given parent containing application and
   *  version info elements.
   *
   *  @param doc {DOM Document}
   *         the document object
   *
   *  @param parentElem {DOM Element}
   *         the DOM element in which to add the new child elements
   */
  _appendHeaderElement: function(doc, parentElem) {
    var extHandler = new FhcRdfExtensionHandler();

    var headerElem = doc.createElement("header");
    parentElem.appendChild(headerElem);
    
    var appinfoElem = doc.createElement("application");
    appinfoElem.textContent = extHandler.getName();
    var versionElem = doc.createElement("version");
    versionElem.textContent = extHandler.getVersion();
    var dateElem = doc.createElement("exportDate");
    if (this.useISOdateFormat) {
      dateElem.textContent = this.dateHandler.getCurrentISOdateString();
    } else {
      dateElem.textContent = this.dateHandler.getCurrentDateString();
    }
    
    headerElem.appendChild(appinfoElem);
    headerElem.appendChild(versionElem);
    headerElem.appendChild(dateElem);
  },
  
  /**
   * Get the textcontent of a DOM Element from a parent by tagname. If no tag
   * is found, the default value is returned.
   * 
   * @param  parentElem {DOM Element}
   *         the DOM element containing the child element(s)
   *
   * @param  tagName {String}
   *         the name of the tag to search for inside the parent
   * 
   * @param  defaultValue {String}
   *         the value to return if no tag is found
   * 
   * @return {String}
   *         the textcontent of the requested child element or the default
   *         value if tag is not found
   */
  _getElementValue: function(parentElem, tagName, defaultValue) {
    var result = defaultValue;
    var childElem = parentElem.getElementsByTagName(tagName);
    if (1 == childElem.length && "" != childElem[0].textContent) {
      result = childElem[0].textContent;
    }
    return result;
  },
  
  /**
   * Get the date content of a DOM Element from a parent by tagname. If no tag
   * is found, the default value is returned.
   *
   * @param  parentElem {DOM Element}
   *         the DOM element containing the child element(s)
   *
   * @param  tagName {String}
   *         the name of the tag to search for inside the parent
   *
   * @param  defaultValue {String}
   *         the value to return if no tag is found
   *
   * @return {String}
   *         the date value of the requested child element or the default
   *         value if tag is not found
   */
  _getElemenDate: function(parentElem, tagName, defaultValue) {
    var result = defaultValue;
    var childElem = parentElem.getElementsByTagName(tagName);
    if (1 == childElem.length) {
      if (childElem[0].firstElementChild != null) {
        // uSeconds format
        result = this._getElementValue(childElem[0], "date");
      }
      else {
        // ISO format
        result = this.dateHandler.fromISOdateString(childElem[0].textContent);
      }
    }
    return result;
  },

  /**
   * Create a NameValue element for a CleanUp criteria.
   * 
   * @param doc {DOM-document}
   *        the document containing DOM-elements
   *
   * @param cleanupCriteria {Object}
   *        the cleanupCriteria object
   *
   * @return {DOM element}
   *         the name-value element
   */
  _createCleanupNameValueElement: function(doc, cleanupCriteria) {
    var namevalElem, child, description;
    namevalElem = doc.createElement("nameValue");
    description = cleanupCriteria.description;
    this._appendElement(namevalElem, doc.createElement("description"), ((description)?this._encode(description):""));
    if (cleanupCriteria.name) {
      child = doc.createElement("name");
      child.setAttribute("case",  cleanupCriteria.nameCase);
      child.setAttribute("exact", cleanupCriteria.nameExact);
      child.setAttribute("regex", cleanupCriteria.nameRegex);
      this._appendElement(namevalElem, child, this._encode(cleanupCriteria.name));
    }
    if (cleanupCriteria.value) {
      child = doc.createElement("value");
      child.setAttribute("case",  cleanupCriteria.valueCase);
      child.setAttribute("exact", cleanupCriteria.valueExact);
      child.setAttribute("regex", cleanupCriteria.valueRegex);
      this._appendElement(namevalElem, child, this._encode(cleanupCriteria.value));
    }
    return namevalElem;
  },

  /**
   * Create an Exception element for a multiline exception list.
   * 
   * @param doc {DOM-document}
   *        the document containing DOM-elements
   *
   * @param exception {Object}
   *        the multiline exception object
   *
   * @return {DOM element}
   *         the exception element
   */
  _createMultilineExceptionElement: function(doc, exception) {
    var exceptionElem;
    exceptionElem = doc.createElement("exception");
    this._appendElement(exceptionElem, doc.createElement("host"), exception.host);
    return exceptionElem;
  },

  /**
   * Create an Exception element for a custom save exception list.
   * 
   * @param doc {DOM-document}
   *        the document containing DOM-elements
   *
   * @param exception {Object}
   *        the custom save exception object
   *
   * @return {DOM element}
   *         the exception element
   */
  _createCustomSaveExceptionElement: function(doc, exception) {
    var exceptionElem;
    exceptionElem = doc.createElement("exception");
    this._appendElement(exceptionElem, doc.createElement("pageFilter"), exception.url);
    return exceptionElem;
  },

  /**
   * Create a regexp element for a regular expression.
   *
   * @param doc {DOM-document}
   *        the document containing DOM-elements
   *
   * @param regExp {Object}
   *        the regExp object
   *
   * @return {DOM element}
   *         the regExp element
   */
  _createRegexpElement: function(doc, regExp) {
    var regExpElem, child;
    regExpElem = doc.createElement("regularExpression");
    this._appendElement(regExpElem, doc.createElement("description"), this._encode(regExp.description));
    this._appendElement(regExpElem, doc.createElement("category"), this._encode(regExp.category));

    child = doc.createElement("expression");
    child.setAttribute("case", regExp.caseSens);
    this._appendElement(regExpElem, child, this._encode(regExp.regexp));

    this._appendElement(regExpElem, doc.createElement("useFor"), regExp.useFor);
    this._appendElement(regExpElem, doc.createElement("type"), ("b" == regExp.regexpType ? "built-in" : "user-defined"));
    return regExpElem;
  },


  /**
   * Create a keybinding element.
   *
   * @param doc {DOM-document}
   *        the document containing DOM-elements
   *
   * @param id {String}
   *        the id of the keybinding
   *
   * @param binding {String}
   *        the actual keybinding
   *
   * @return {DOM element}
   *         the keybinding element
   */
  _createKeyBindingElement: function(doc, id, binding) {
    var bindingElem = doc.createElement("keyBinding");
    bindingElem.textContent = this._encode(binding);
    bindingElem.setAttribute("id", id);
    return bindingElem;
  },
  

  /**
   * Create an formfield element.
   * (cdata for value would be nice but is removed by XML.toXMLString())
   *
   * @param doc {DOM-document}
   *        the document containing DOM-elements
   *
   * @param entry {Object}
   *        the formhistory object
   *
   * @return {DOM element}
   *         the formhistory element
   */
  _createFormhistoryElement: function(doc, entry) {
    var fieldElem = doc.createElement("field");
    
    this._appendElement(fieldElem, doc.createElement("name"), entry.name);
    this._appendElement(fieldElem, doc.createElement("value"), this._encode(entry.value));
    this._appendElement(fieldElem, doc.createElement("timesUsed"), entry.used);
    this._appendDateElement(doc, fieldElem, doc.createElement("firstUsed"), entry.first);
    this._appendDateElement(doc, fieldElem, doc.createElement("lastUsed"),  entry.last);
    
    return fieldElem;
  },
  
  /**
   * Create an editorfield element for a multiline field.
   *
   * @param doc {DOM-document}
   *        the document containing DOM-elements
   *
   * @param editorField {Object}
   *        the multiline object
   *
   * @return {DOM element}
   *         the editorField element
   */
  _createEditorfieldElement: function(doc, editorField) {
    var editorElem = doc.createElement("editorField");
    
    this._appendElement(editorElem, doc.createElement("id"), this._encode(editorField.id));
    this._appendElement(editorElem, doc.createElement("name"), this._encode(editorField.name));
    this._appendElement(editorElem, doc.createElement("type"), this._encode(editorField.type));
    this._appendElement(editorElem, doc.createElement("formid"), this._encode(editorField.formid));
    this._appendElement(editorElem, doc.createElement("host"), this._encode(editorField.host));
    this._appendElement(editorElem, doc.createElement("url"), this._encode(editorField.url));
    this._appendDateElement(doc, editorElem, doc.createElement("firstsaved"), editorField.firstsaved);
    this._appendDateElement(doc, editorElem, doc.createElement("lastsaved"), editorField.lastsaved);
    this._appendElement(editorElem, doc.createElement("content"), this._encode(editorField.content));
    
    return editorElem;
  },
  
  /**
   * Pretty print XML.
   * Adapted from vkBeautify by Vadim Kiryukhin (http://www.eslinstructor.net/vkbeautify/).
   *
   * @param text {String}
   *        the XML text
   *
   * @param indent {String}
   *        the text to use for indentation
   *
   * @return {String}
   *         pretty printed XML
   */
  _prettyPrintXML: function(text, indent) {
    var shift = ['\n'];
    var maxNestingLevel = 6;
    for (var i=0; i<maxNestingLevel; i++) {
      shift.push(shift[i]+indent); 
    }

    var ar = text.replace(/>\s{0,}</g,"><")
                 .replace(/</g,"~::~<")
                 .replace(/\s*xmlns\:/g,"~::~xmlns:")
                 .replace(/\s*xmlns\=/g,"~::~xmlns=")
                 .split('~::~'),
        len = ar.length,
        inComment = false,
        deep = 0,
        str = '',
        i = 0;

    for(i=0;i<len;i++) {
      // start comment or <![CDATA[...]]> or <!DOCTYPE //
      if(ar[i].search(/<!/) > -1) { 
        str += shift[deep]+ar[i];
        inComment = true; 
        // end comment  or <![CDATA[...]]> //
        if(ar[i].search(/-->/) > -1 || ar[i].search(/\]>/) > -1 || ar[i].search(/!DOCTYPE/) > -1 ) { 
          inComment = false; 
        }
      } else 
      // end comment  or <![CDATA[...]]> //
      if(ar[i].search(/-->/) > -1 || ar[i].search(/\]>/) > -1) { 
        str += ar[i];
        inComment = false; 
      } else 
      // <elm></elm> //
      if( /^<\w/.exec(ar[i-1]) && /^<\/\w/.exec(ar[i]) &&
        /^<[\w:\-\.\,]+/.exec(ar[i-1]) == /^<\/[\w:\-\.\,]+/.exec(ar[i])[0].replace('/','')) { 
        str += ar[i];
        if(!inComment) deep--;
      } else
       // <elm> //
      if(ar[i].search(/<\w/) > -1 && ar[i].search(/<\//) == -1 && ar[i].search(/\/>/) == -1 ) {
        str = !inComment ? str += shift[deep++]+ar[i] : str += ar[i];
      } else 
       // <elm>...</elm> //
      if(ar[i].search(/<\w/) > -1 && ar[i].search(/<\//) > -1) {
        str = !inComment ? str += shift[deep]+ar[i] : str += ar[i];
      } else 
      // </elm> //
      if(ar[i].search(/<\//) > -1) { 
        str = !inComment ? str += shift[--deep]+ar[i] : str += ar[i];
      } else 
      // <elm/> //
      if(ar[i].search(/\/>/) > -1 ) { 
        str = !inComment ? str += shift[deep]+ar[i] : str += ar[i];
      } else 
      // <? xml ... ?> //
      if(ar[i].search(/<\?/) > -1) { 
        str += shift[deep]+ar[i];
      } else 
      // xmlns //
      if( ar[i].search(/xmlns\:/) > -1  || ar[i].search(/xmlns\=/) > -1) { 
        str += shift[deep]+ar[i];
      } 
      else {
        str += ar[i];
      }
    }
    return  (str[0] == '\n') ? str.slice(1) : str;
  }  
}