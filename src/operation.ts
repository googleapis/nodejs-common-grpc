/*!
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*!
 * @module commonGrpc/operation
 */

import * as common from '@google-cloud/common';
import modelo = require('modelo');

/**
 * @type {module:commonGrpc/serviceObject}
 * @private
 */
import {GrpcServiceObject} from './service-object';

/**
 * @type {module:commonGrpc/service}
 * @private
 */
import {GrpcService} from './service';

// jscs:disable maximumLineLength
/**
 * An Operation object allows you to interact with APIs that take longer to
 * process things.
 *
 * @constructor
 * @alias module:common/grpcOperation
 *
 * @param {module:commonGrpc/service|module:commonGrpc/serviceObject} parent - The
 *     parent object. This should be configured to use the longrunning.operation
 *     service.
 * @param {string} name - The operation name.
 */
// jscs:enable maximumLineLength
function Operation(parent, name) {
  const methods = {
    /**
     * Deletes an operation.
     */
    delete: {
      protoOpts: {
        service: 'Operations',
        method: 'deleteOperation',
      },
      reqOpts: {
        name,
      },
    },

    /**
     * Checks to see if an operation exists.
     */
    exists: true,

    /**
     * Retrieves the operation.
     */
    get: true,

    /**
     * Retrieves metadata for the operation.
     */
    getMetadata: {
      protoOpts: {
        service: 'Operations',
        method: 'getOperation',
      },
      reqOpts: {
        name,
      },
    },
  };

  const config = {
    parent,
    id: name,
    methods,
  };

  common.Operation.call(this, config);
  GrpcServiceObject.call(this, config);
}

modelo.inherits(Operation, GrpcServiceObject, common.Operation);

/**
 * Cancel the operation.
 *
 * @param {function=} callback - The callback function.
 * @param {?error} callback.err - An error returned while making this
 *     request.
 * @param {object} callback.apiResponse - The full API response.
 */
Operation.prototype.cancel = function(callback) {
  const protoOpts = {
    service: 'Operations',
    method: 'cancelOperation',
  };

  const reqOpts = {
    name: this.id,
  };

  this.request(protoOpts, reqOpts, callback || common.util.noop);
};

/**
 * Poll for a status update. Execute the callback:
 *
 *   - callback(err): Operation failed
 *   - callback(): Operation incomplete
 *   - callback(null, metadata): Operation complete
 *
 * @private
 *
 * @param {function} callback
 */
Operation.prototype.poll_ = function(callback) {
  this.getMetadata(function(err, resp) {
    if (err || resp.error) {
      callback(err || GrpcService.decorateError_(resp.error));
      return;
    }

    if (!resp.done) {
      callback();
      return;
    }

    callback(null, resp);
  });
};

module.exports = Operation;
