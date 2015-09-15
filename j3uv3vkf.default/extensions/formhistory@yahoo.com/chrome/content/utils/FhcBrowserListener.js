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
 * The Original Code is FhcBrowsingListener.
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
 * Implementation of nsIObserver that is registered to receive notifications for
 * changes to the session store (possibly: form history database).
 * This can be triggered when opening two browser windows while the FormHistory
 * control is displayed in one instance and a clean is triggered from the other.
 *
 * Dependencies: -
 */
function FhcBrowserListener() {
  this.init();
}

FhcBrowserListener.prototype = {
  _observerService: null,
  _watcherObject: null,

  /**
   * Initialize: register the observer service.
   */
  init: function () {
    this._observerService = Components.classes["@mozilla.org/observer-service;1"]
                            .getService(Components.interfaces.nsIObserverService);
    // topic fires on cleaning "browsing and download history" or updates to
    // the formhistory storage
    this._observerService.addObserver(this, "sessionstore-state-write", false);

    // topic fires when the cleanup-db has changed (recreate)
    this._observerService.addObserver(this, "cleanup-db-changed", false);
  },

  /**
   * Remove (unregister) the observer. Call this when done, failure to do so
   * may result in memory leaks.
   */
  destroy: function() {
    this._observerService.removeObserver(this, "sessionstore-state-write");
    this._observerService.removeObserver(this, "cleanup-db-changed");
  },

  /**
   *  Observe, calls the onSessionStoreChange function on the watcherObject.
   *  Will be called when there is a notification for the topic that the
   *  observer has been registered for.
   *
   *  @param aSubject {nsISupports}
   *         reflects the object whose change or action is being observed
   *
   *  @param aTopic {String} [Optional]
   *         indicates the specific change or action
   *
   *  @param aData {String}
   *         other auxiliary data further describing the change or action
   */
  observe: function (aSubject, aTopic, aData) {
    if (this._watcherObject) {
      switch(aTopic) {
        case "sessionstore-state-write":
             if ("onSessionStoreChange" in this._watcherObject) {
               this._watcherObject.onSessionStoreChange();
             }
             break;
        case "cleanup-db-changed":
             if ("onCleanupDbChange" in this._watcherObject) {
               this._watcherObject.onCleanupDbChange();
             }
             break;
      }
    }
  },

  /**
   * Getter for obtaining the watcher object.
   *
   * @returns {Object} the watcher object
   */
  get watcher() {
    return this._watcherObject;
  },

  /**
   * Set the watcher object which should implement the onSessionStoreChange()
   * function.
   *
   * @param {Object}
   *        watcherObject implementing the onSessionStoreChange function
   */
  set watcher(watcherObject) {
    this._watcherObject = watcherObject;
  }
};