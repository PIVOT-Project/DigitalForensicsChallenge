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
 * The Original Code is FhcRdfExtensionHandler.
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
 * Read values from the install.rdf of this extension.
 * Handy for incorporating info in the about dialog.
 *
 * Dependencies: -
 */
function FhcRdfExtensionHandler() {
  if (Components.classes["@mozilla.org/extensions/manager;1"]) {
    var xmlFile = Components.classes["@mozilla.org/extensions/manager;1"]
			   .getService(Components.interfaces.nsIExtensionManager)
			   .getInstallLocation("formhistory@yahoo.com")
			   .getItemFile("formhistory@yahoo.com", "install.rdf");
    this.xmlInstall = this._parseXMLFileToDOM(xmlFile);
  }
  else {
    this.xmlInstall = this._getXMLFile();
  }
}


// Class FhcRdfExtensionHandler
FhcRdfExtensionHandler.prototype = {

  /**
   * Return the name of this addon.
   * @return {String}
   */
  getName: function() {
    return this._getByTagname("em:name");
  },

  /**
   * Return the name of this addon.
   * @return {String}
   */
  getDescription: function() {
    return this._getByTagnameLocalized("em:description");
  },

  /**
   * Return the version of this addon.
   * @return {String}
   */
  getVersion: function() {
    return this._getByTagname("em:version");
  },

  /**
   * Return the homepageURL of this addon.
   * @return {String}
   */
  getHomepageURL: function() {
    return this._getByTagname("em:homepageURL");
  },

  /**
   * Return the creator of this addon.
   * @return {String}
   */
  getCreator: function() {
    return this._getByTagname("em:creator");
  },

  /**
   * Get the contributors from the install.rdf. getValues will only read
   * locale dependend info, so the contributors must be present in all locale
   * sections of install.rdf as well :-(
   *
   * @param contributors {Array}
   *        empty array of contributors to be populated by this metod
   *
   * @param translators {Array}
   *        empty array of translators to be populated by this metod
   */
  getContributors: function(contributors, translators) {
    var contrib = this.xmlInstall.getElementsByTagName("em:contributor");
    for(var ii=0; ii<contrib.length; ii++) {
      contributors.push(contrib[ii].textContent);
    }

    var transl  = this.xmlInstall.getElementsByTagName("em:translator");
    for(var jj=0; jj<transl.length; jj++) {
      translators.push(transl[jj].textContent);
    }
  },

  /**
   * Get a single value from the install.rdf directly from the xml.
   * If we would use getValue() we would only get locale dependend info,
   * thus the information (tagname) must be present in all locale sections.
   * For example: tag <em:creator> is not present in all locale sections.
   *
   * @param tagname {String}
   *        the name of the tag of the install.rdf
   * 
   * @return {String}
   *         the textcontent of the tag
   */
  _getByTagname: function(tagname) {
    var elem = this.xmlInstall.getElementsByTagName(tagname);
    return elem[0].textContent;
  },

  /**
   * Get a single value from the install.rdf directly from the xml.
   * Try within <em:localized> tags first, it must contain an <em:locale> tag
   * with the current locale. If nothing found, try to find the tagname from root.
   *
   * @param tagname {String}
   *        the name of the tag of the install.rdf
   * 
   * @return {String}
   *         the textcontent of the tag
   */
  _getByTagnameLocalized: function(tagname) {
    var locale = Components.classes["@mozilla.org/preferences-service;1"]
           .getService(Components.interfaces.nsIPrefBranch)
           .getCharPref("general.useragent.locale");
           
    var tagValue = this._getByTagnameLocale(tagname, locale);
    
    if (tagValue == "" && locale.length > 2) {
      // try 2 letter locale
      tagValue = this._getByTagnameLocale(tagname, locale.substr(0,2));
    }
    
    if (tagValue == "") {
      // no localized tag, try from root, return first match
      tagValue = this._getByTagname(tagname);
    }
    
    return tagValue;
  },


  /**
   * Get a single value from the install.rdf directly from the xml.
   * Try within <em:localized> tags, it must contain an <em:locale> tag
   * with the given locale. If nothing found, return an empty String.
   *
   * @param tagname {String}
   *        the name of the tag of the install.rdf
   * 
   * @param locale {String}
   *        the locale defined for the tagname
   * 
   * @return {String}
   *         the textcontent of the tag
   */
  _getByTagnameLocale: function(tagname, locale) {
    var elemLocalized = this.xmlInstall.getElementsByTagName("em:localized");
    for (var ii=0; ii<elemLocalized.length; ii++) {
      var elmLocale = elemLocalized[ii].getElementsByTagName("em:locale");
      if (elmLocale.length > 0) {
        if (elmLocale[0].textContent == locale) {
          // found a locale match
          var elem = elemLocalized[ii].getElementsByTagName(tagname);
          if (elem.length > 0) {
            return elem[0].textContent;
          }
        }
      }
    }
    return "";
  },

  /**
   * Read the install.rdf file located in the chrome directory.
   *
   * @return {XML DOM}
   *         the XML DOM representation of the XML file
   */
  _getXMLFile: function() {
    var dirServiceProp = Components.classes["@mozilla.org/file/directory_service;1"]
                         .getService(Components.interfaces.nsIProperties);
    var xmlfile = dirServiceProp.get("ProfD", Components.interfaces.nsIFile);
    xmlfile.append("extensions");
    xmlfile.append("formhistory@yahoo.com");
    if (xmlfile.isDirectory()) {
      xmlfile.append("install.rdf");
    }
    else if (xmlfile.isFile()) {
      xmlfile = this._resolveDevelopmentLocation(xmlfile);
    }
    return this._parseXMLFileToDOM(xmlfile);
  },

  /**
   * Parse an XML file into a DOM.
   *
   * @param  xmlfile {nsIFile}
   *         the xml file.
   *
   * @return {DOM}
   *         xmlfile parsed to DOM.
   */
  _parseXMLFileToDOM: function(xmlfile) {
    var xml = null;
    try {
      // open xml file for reading
      var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                       .createInstance(Components.interfaces.nsIFileInputStream);
      var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
                       .createInstance(Components.interfaces.nsIConverterInputStream);
      fstream.init(xmlfile, -1/*(PR_RDONLY)*/, -1/*default permission*/, null);
      cstream.init(fstream, "UTF-8", 0, 0); 

      // parse xml
      try {
        var xmlString = this._readTextFromStream(cstream);
        var parser = new DOMParser();
        xml = parser.parseFromString(xmlString, "text/xml");
      }
      catch(parseEx) {
        dump('Exception parsing xml:' + parseEx + '\n');
      }
      finally {
        cstream.close();
      }
    }
    catch(streamEx) {
      dump('Exception reading xml stream:' + streamEx + '\n');
    }
    return xml;
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
   * Instead of the xpi or directory, a file can be used containing one line
   * of text describing the actual location of the extension (development use).
   * This method reads the first line of the file and returns the location as
   * a new nsIFile object.
   *
   * @param  shortcutFile {nsIFile}
   *         file containing a string describing the actual location.
   *
   * @return {nsIFile}
   *         The actual location.
   */
  _resolveDevelopmentLocation: function(shortcutFile) {
    // reading contents
    var devStreamIn = Components.classes["@mozilla.org/network/file-input-stream;1"]
                      .createInstance(Components.interfaces.nsIFileInputStream);
    devStreamIn.init(shortcutFile, -1/*(PR_RDONLY)*/, -1/*default permission*/, null);

    var developLocation = {};
    try {
      // assume real location is on first line
      devStreamIn.readLine(developLocation);
    } finally {
      devStreamIn.close();
    }

    var xmlfile = "";
    if (developLocation && developLocation.value) {
      // try linked location
      xmlfile = Components.classes["@mozilla.org/file/local;1"]
                      .createInstance(Components.interfaces.nsIFile);
      xmlfile.initWithPath(developLocation.value);
      xmlfile.append("install.rdf");
    }
    return xmlfile;
  }
}