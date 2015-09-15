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
 * The Original Code is AboutFhc.
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
 * About dialog for the Form History Control application.
 *
 * Populate the about dialog with data obtained from the install.rdf
 * using the FhcRdfExtensionHandler.
 *
 * Dependencies: AboutFHC.xul, FhcRdfExtensionHandler.js, FhcBundle.js
 */
const AboutFhcDialog = {

  /**
   * Initialize the About Dialog.
   * Populate the dialog with data extracted from the install.rdf file.
   */
  init: function() {
    var extHandler = new FhcRdfExtensionHandler();
    var bundle = new FhcBundle();
    
    // get attributes from install.rdf
    var name        = extHandler.getName();
    var version     = extHandler.getVersion();
    var description = extHandler.getDescription();
    var homepage    = extHandler.getHomepageURL();
    var creator     = extHandler.getCreator();

    var contributors = [];
    var translators  = [];
    extHandler.getContributors(contributors, translators);

    // set dialog title
    document.title = bundle.getString("aboutwindow.title", [name]);
    
    // set name/version/description attributes
    document.getElementById("extensionName").setAttribute("value", name);
    document.getElementById("extensionVersion").setAttribute("value",
                bundle.getString("aboutwindow.version", [version]));
    document.getElementById("extensionDescription").appendChild(
                document.createTextNode(description));
    document.getElementById("extensionCreator").setAttribute("value", creator);

    // set extensions homepage
    var extensionHomepage = document.getElementById("extensionHomepage");
    if (homepage) {
      extensionHomepage.setAttribute("href", homepage);
      extensionHomepage.setAttribute("tooltiptext", homepage);
    } else {
      extensionHomepage.hidden = true;
    }

    // list the contributors if any (with optional href link)
    if (contributors.length == 0) {
      document.getElementById("extensionContributors").hidden = true;
    } else {
      var contributorRows = document.getElementById("contributorRows");
      this._addInfo(contributorRows, contributors, "contributor");
    }

    // list the translators if any (with optional href link)
    if (translators.length == 0) {
      document.getElementById("extensionTranslators").hidden = true;
    } else {
      var translatorRows = document.getElementById("translatorRows");
      this._addInfo(translatorRows, translators, "translator");
    }

    // change ok-button to close button
    var acceptButton = document.documentElement.getButton("accept");
    acceptButton.label = bundle.getString("aboutwindow.closebutton.label");

    //delete extHandler;
    //delete bundle;
  },
  
  /**
   * About dialog is about to be destroyed, cleanup first.
   */
  destroy: function() {
  },

  /**
   * Fill the containerBox with labels or hboxes with info taken from the
   * infoArray.
   *
   * @param containerBox {hbox}
   *        the container in which to add labels or hboxes
   *
   * @param infoArray {String[]}
   *        the array of strings containing the info to be displayed
   *
   * @param infoClass {String}
   *        the class for the label DOM element
   */
  _addInfo: function(containerBox, infoArray, infoClass) {
    var info;
    for(var ii=0; ii<infoArray.length; ii++) {
      // info may contain a link like "preValue [label][URL] postValue"
      info = infoArray[ii].split("[");
      if (2 < info.length) {
        // create (in hbox): <prevValue label> <href label> <postValue label>
        containerBox.appendChild(this._newLinkRow(info, infoClass));
      }
      else {
        // no link, display as is
        containerBox.appendChild(this._newLabelRow(infoArray[ii], infoClass));
      }
    }
  },

  /**
   * Create a row with one label
   *
   * @param  value {String}
   *         the text to be displayed
   *
   * @param  infoClass {String}
   *         the class for the label DOM element
   *
   * @return {DOM element}
   *         the row containing the label
   */
  _newLabelRow: function(value, infoClass) {
    var row = document.createElement("row");
    row.appendChild(this._newLabel(value, infoClass));
    return row;
  },

 /**
   * Create a row with labels and a href link.
   * Box contains: <prevValue label> <href label> <postValue label>.
   *
   * @param  dataArray {String[]}
   *         array containing "preValue [label][URL] postValue".split("[")
   *
   * @param  infoClass {String}
   *         the class for the label DOM element
   *
   * @return {DOM element}
   *         the row containing multiple labels with contributor info
   */
  _newLinkRow: function(dataArray, infoClass) {
    var row = document.createElement("row");
    var spacer = document.createElement("spacer");
    spacer.setAttribute("flex", 1);

    var preValue = dataArray[0];
    var value = dataArray[1].substring(0, dataArray[1].indexOf("]"));
    var link = dataArray[2].substring(0, dataArray[2].indexOf("]"));
    var postValue = dataArray[2].substring(dataArray[2].indexOf("]") + 1);

    row.appendChild(this._newLabel(preValue, infoClass));
    row.appendChild(this._newLinkLabel(value, link));
    row.appendChild(spacer);
    row.appendChild(this._newLabel(postValue, infoClass));

    return row;
  },

  /**
   * Create a text label.
   *
   * @param  value {String}
   *         the text to be displayed
   *
   * @param  infoClass {String}
   *         the class for the label DOM element
   *
   * @return {DOM element}
   *         the label
   */
  _newLabel: function(value, infoClass) {
    var newLabel = document.createElement("label");
    newLabel.setAttribute("class", infoClass);
    newLabel.setAttribute("value", value);
    return newLabel;
  },

  /**
   * Create a label with a href attribute.
   *
   * @param  value {String}
   *         the name (label) of the link
   *
   * @param  url {String}
   *         the link itself (href)
   *
   * @return {DOM element}
   *         the label containing a href attribute
   */
  _newLinkLabel: function(value, url) {
    var linkLabel = document.createElement("label");
    linkLabel.setAttribute("value", value);
    linkLabel.setAttribute("class", "text-link");
    linkLabel.setAttribute("href", url);
    linkLabel.setAttribute("tooltiptext", url);
    // align bottom with surrounding labels which have 0 borderWidth
    linkLabel.style.borderWidth = "0";
    // link is between labels, no need for margins in between
    linkLabel.style.marginLeft = "0";
    linkLabel.style.marginRight = "0";
    return linkLabel;
  }
}