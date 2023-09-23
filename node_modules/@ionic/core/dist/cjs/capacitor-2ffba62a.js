/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
'use strict';

const index = require('./index-306a7476.js');

const getCapacitor = () => {
  if (index.win !== undefined) {
    return index.win.Capacitor;
  }
  return undefined;
};

exports.getCapacitor = getCapacitor;
