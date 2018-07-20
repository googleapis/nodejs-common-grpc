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

'use strict';

import * as assert from 'assert';
import * as proxyquire from 'proxyquire';
import {util} from '@google-cloud/common';
import { EventEmitter } from 'events';

let decorateErrorOverride_;
class FakeGrpcService {
  static decorateError_() {
    return (decorateErrorOverride_ || util.noop).apply(null, arguments);
  }
}

class FakeGrpcServiceObject extends EventEmitter {
  grpcServiceObjectArguments_: Array<{}>;
  constructor(...args: Array<{}>) {
    super();
    this.grpcServiceObjectArguments_ = args;
  }
}

describe('GrpcOperation', () => {
  const FAKE_SERVICE = {
    Promise,
  };
  const OPERATION_ID = '/a/b/c/d';

  let GrpcOperation;
  let grpcOperation;

  before(() => {
    GrpcOperation = proxyquire('../src/operation', {
      './service-object': {
        GrpcServiceObject: FakeGrpcServiceObject
      },
      './service': {
        GrpcService: FakeGrpcService
      }
    }).GrpcOperation;
  });

  beforeEach(() => {
    decorateErrorOverride_ = null;
    grpcOperation = new GrpcOperation(FAKE_SERVICE, OPERATION_ID);
  });

  describe('instantiation', () => {
    const EXPECTED_CONFIG = {
      parent: FAKE_SERVICE,
      id: OPERATION_ID,
      methods: {
        delete: {
          protoOpts: {
            service: 'Operations',
            method: 'deleteOperation',
          },
          reqOpts: {
            name: OPERATION_ID,
          },
        },
        exists: true,
        get: true,
        getMetadata: {
          protoOpts: {
            service: 'Operations',
            method: 'getOperation',
          },
          reqOpts: {
            name: OPERATION_ID,
          },
        },
      },
    };

    it('should pass GrpcServiceObject the correct config', () => {
      const config = grpcOperation.grpcServiceObjectArguments_![0];
      assert.deepEqual(config, EXPECTED_CONFIG);
    });
  });

  describe('cancel', () => {
    it('should provide the proper request options', done => {
      grpcOperation.id = OPERATION_ID;

      grpcOperation.request = (protoOpts, reqOpts, callback) => {
        assert.deepEqual(protoOpts, {
          service: 'Operations',
          method: 'cancelOperation',
        });

        assert.strictEqual(reqOpts.name, OPERATION_ID);
        callback(); // done()
      };

      grpcOperation.cancel(done);
    });

    it('should use util.noop if callback is omitted', done => {
      grpcOperation.request = (protoOpts, reqOpts, callback) => {
        assert.strictEqual(callback, util.noop);
        done();
      };

      grpcOperation.cancel();
    });
  });

  describe('poll_', () => {
    it('should call getMetdata', done => {
      grpcOperation.getMetadata = () => {
        done();
      };

      grpcOperation.poll_().then(r => {}, assert.ifError);
    });

    describe('could not get metadata', () => {
      it('should callback with an error', done => {
        const error = new Error('Error.');
        grpcOperation.getMetadata = callback => {
          callback(error);
        };
        grpcOperation.poll_().then(r => {}, err => {
          assert.strictEqual(err, error);
          done();
        });
      });

      it('should callback with the operation error', done => {
        const apiResponse = {
          error: {},
        };
        grpcOperation.getMetadata = callback => {
          callback(null, apiResponse, apiResponse);
        };
        const decoratedGrpcStatus = {};

        decorateErrorOverride_ = status => {
          assert.strictEqual(status, apiResponse.error);
          return decoratedGrpcStatus;
        };

        grpcOperation.poll_().then(r => {}, err => {
          assert.strictEqual(err, decoratedGrpcStatus);
          done();
        });
      });
    });
    describe('operation incomplete', () => {
      const apiResponse = {done: false};

      beforeEach(() => {
        grpcOperation.getMetadata = callback => {
          callback(null, apiResponse);
        };
      });

      it('should callback with no arguments', async() => {
        return grpcOperation.poll_().then(resp => {
          assert.strictEqual(resp, undefined);
        }, assert.ifError);
      });
    });

    describe('operation complete', () => {
      const apiResponse = {done: true};

      beforeEach(() => {
        grpcOperation.getMetadata = callback => {
          callback(null, apiResponse);
        };
      });

      it('should emit complete with metadata', async() => {
        return grpcOperation.poll_().then(resp => {
          assert.strictEqual(resp, apiResponse);
        }, assert.ifError);
      });

    });
  });
});
