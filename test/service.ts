/**
 * Copyright 2015 Google Inc. All Rights Reserved.
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
import * as duplexify from 'duplexify';
import * as extend from 'extend';
const grpc = require('grpc');
import * as is from 'is';
import * as proxyquire from 'proxyquire';
import * as retryRequest from 'retry-request';
import * as sn from 'sinon';
import * as through from 'through2';
import {util} from '@google-cloud/common';

const sinon = sn.sandbox.create();

const fakeUtil = extend({}, util);

function FakeService() {
  this.calledWith_ = arguments;
}

let retryRequestOverride;
function fakeRetryRequest() {
  return (retryRequestOverride || retryRequest).apply(null, arguments);
}

let GrpcMetadataOverride;
let grpcLoadOverride;
const fakeGrpc = {
  Metadata: function() {
    if (GrpcMetadataOverride) {
      return new GrpcMetadataOverride();
    }
    return new grpc.Metadata();
  },
  load: function() {
    return (grpcLoadOverride || grpc.load).apply(null, arguments);
  },
  credentials: {
    combineChannelCredentials: function() {
      return {
        name: 'combineChannelCredentials',
        args: arguments,
      };
    },
    createSsl: function() {
      return {
        name: 'createSsl',
        args: arguments,
      };
    },
    createFromGoogleCredential: function() {
      return {
        name: 'createFromGoogleCredential',
        args: arguments,
      };
    },
    createInsecure: function() {
      return {
        name: 'createInsecure',
        args: arguments,
      };
    },
  },
};

describe('GrpcService', function() {
  let GrpcServiceCached;
  let GrpcService;
  let grpcService;

  let ObjectToStructConverter;

  const ROOT_DIR = '/root/dir';
  const PROTO_FILE_PATH = 'filepath.proto';
  const SERVICE_PATH = 'service.path';

  const CONFIG: any = {
    proto: {},
    protosDir: ROOT_DIR,
    protoServices: {
      Service: {
        path: PROTO_FILE_PATH,
        service: SERVICE_PATH,
      },
    },
    packageJson: {
      name: '@google-cloud/service',
      version: '0.2.0',
    },
    grpcMetadata: {
      property: 'value',
    },
  };

  const OPTIONS = {
    maxRetries: 3,
  };

  const EXPECTED_API_CLIENT_HEADER = [
    'gl-node/' + process.versions.node,
    'gccl/' + CONFIG.packageJson.version,
    'grpc/' + require('grpc/package.json').version,
  ].join(' ');

  const MOCK_GRPC_API = {
    google: {
      Service: {
        [SERVICE_PATH]: {},
      },
    },
  };

  before(function() {
    GrpcService = proxyquire('../src/service.js', {
      '@google-cloud/common': {
        Service: FakeService,
        util: fakeUtil,
      },
      grpc: fakeGrpc,
      'retry-request': fakeRetryRequest,
    }).GrpcService;
    GrpcServiceCached = extend(true, {}, GrpcService);
    ObjectToStructConverter = GrpcService.ObjectToStructConverter;
  });

  beforeEach(function() {
    GrpcMetadataOverride = null;
    retryRequestOverride = null;

    grpcLoadOverride = function() {
      return MOCK_GRPC_API;
    };

    extend(fakeUtil, util);
    extend(GrpcService, GrpcServiceCached);

    grpcService = new GrpcService(CONFIG, OPTIONS);
  });

  afterEach(function() {
    grpcLoadOverride = null;
    sinon.restore();
  });

  describe('grpc error to http error map', function() {
    it('should export grpc error map', function() {
      assert.deepEqual(GrpcService.GRPC_ERROR_CODE_TO_HTTP, {
        0: {
          code: 200,
          message: 'OK',
        },

        1: {
          code: 499,
          message: 'Client Closed Request',
        },

        2: {
          code: 500,
          message: 'Internal Server Error',
        },

        3: {
          code: 400,
          message: 'Bad Request',
        },

        4: {
          code: 504,
          message: 'Gateway Timeout',
        },

        5: {
          code: 404,
          message: 'Not Found',
        },

        6: {
          code: 409,
          message: 'Conflict',
        },

        7: {
          code: 403,
          message: 'Forbidden',
        },

        8: {
          code: 429,
          message: 'Too Many Requests',
        },

        9: {
          code: 412,
          message: 'Precondition Failed',
        },

        10: {
          code: 409,
          message: 'Conflict',
        },

        11: {
          code: 400,
          message: 'Bad Request',
        },

        12: {
          code: 501,
          message: 'Not Implemented',
        },

        13: {
          code: 500,
          message: 'Internal Server Error',
        },

        14: {
          code: 503,
          message: 'Service Unavailable',
        },

        15: {
          code: 500,
          message: 'Internal Server Error',
        },

        16: {
          code: 401,
          message: 'Unauthorized',
        },
      });
    });
  });

  describe('grpc service options', function() {
    it('should define the correct default options', function() {
      assert.deepEqual(GrpcService.GRPC_SERVICE_OPTIONS, {
        'grpc.max_send_message_length': -1,
        'grpc.max_receive_message_length': -1,
        'grpc.initial_reconnect_backoff_ms': 5000,
      });
    });
  });

  describe('instantiation', function() {
    it('should inherit from Service', function() {
      assert(grpcService instanceof FakeService);

      const calledWith = grpcService.calledWith_;
      assert.strictEqual(calledWith[0], CONFIG);
      assert.strictEqual(calledWith[1], OPTIONS);
    });

    it('should set insecure credentials if using customEndpoint', function() {
      const config = extend({}, CONFIG, {customEndpoint: true});
      const grpcService = new GrpcService(config, OPTIONS);
      assert.strictEqual(grpcService.grpcCredentials.name, 'createInsecure');
    });

    it('should default grpcMetadata to empty metadata', function() {
      const fakeGrpcMetadata = {
        'x-goog-api-client': EXPECTED_API_CLIENT_HEADER,
      };

      GrpcMetadataOverride = function() {};
      GrpcMetadataOverride.prototype.add = function(prop, val) {
        this[prop] = val;
      };

      const config = extend({}, CONFIG);
      delete config.grpcMetadata;

      const grpcService = new GrpcService(config, OPTIONS);
      assert.deepEqual(grpcService.grpcMetadata, fakeGrpcMetadata);
    });

    it('should create and localize grpcMetadata', function() {
      const fakeGrpcMetadata = extend(
        {
          'x-goog-api-client': EXPECTED_API_CLIENT_HEADER,
        },
        CONFIG.grpcMetadata
      );

      GrpcMetadataOverride = function() {};
      GrpcMetadataOverride.prototype.add = function(prop, val) {
        this[prop] = val;
      };

      const grpcService = new GrpcService(CONFIG, OPTIONS);
      assert.deepEqual(grpcService.grpcMetadata, fakeGrpcMetadata);
    });

    it('should localize maxRetries', function() {
      assert.strictEqual(grpcService.maxRetries, OPTIONS.maxRetries);
    });

    it('should set the correct user-agent', function() {
      const userAgent = 'user-agent/0.0.0';

      fakeUtil.getUserAgentFromPackageJson = function(packageJson) {
        assert.strictEqual(packageJson, CONFIG.packageJson);
        return userAgent;
      };

      const grpcService = new GrpcService(CONFIG, OPTIONS);
      assert.strictEqual(grpcService.userAgent, userAgent);
    });

    it('should localize the service', function() {
      assert.strictEqual(grpcService.service, CONFIG.service);
    });

    it('should localize an empty Map of services', function() {
      assert(grpcService.activeServiceMap_ instanceof Map);
      assert.strictEqual(grpcService.activeServiceMap_.size, 0);
    });

    it('should call grpc.load correctly', function() {
      grpcLoadOverride = function(opts, format, grpcOpts) {
        assert.strictEqual(opts.root, ROOT_DIR);
        assert.strictEqual(opts.file, PROTO_FILE_PATH);

        assert.strictEqual(format, 'proto');
        assert.deepEqual(grpcOpts, {
          binaryAsBase64: true,
          convertFieldsToCamelCase: true,
        });

        return MOCK_GRPC_API;
      };

      const grpcService = new GrpcService(CONFIG, OPTIONS);
      assert.strictEqual(
        grpcService.protos[CONFIG.service],
        MOCK_GRPC_API.google[CONFIG.service]
      );
    });

    it('should allow proto file paths to be given', function() {
      grpcLoadOverride = function(opts) {
        assert.strictEqual(opts.root, ROOT_DIR);
        assert.strictEqual(opts.file, '../file/path.proto');

        return MOCK_GRPC_API;
      };

      const config = extend(true, {}, CONFIG, {
        protoServices: {
          Service: '../file/path.proto',
        },
      });

      const grpcService = new GrpcService(config, OPTIONS);
      assert.strictEqual(grpcService.protos.Service, MOCK_GRPC_API.google);
    });

    it('should store the baseUrl properly', function() {
      const fakeBaseUrl = 'a.googleapis.com';

      grpcLoadOverride = function() {
        return MOCK_GRPC_API;
      };

      const config = extend(true, {}, CONFIG, {
        protoServices: {
          CustomServiceName: {
            path: '../file/path.proto',
            baseUrl: fakeBaseUrl,
          },
        },
      });

      const grpcService = new GrpcService(config, OPTIONS);

      assert.strictEqual(
        grpcService.protos.CustomServiceName.baseUrl,
        fakeBaseUrl
      );
    });

    it('should not run in the gcloud sandbox environment', function() {
      (global as any).GCLOUD_SANDBOX_ENV = {};
      const grpcService = new GrpcService();
      assert.strictEqual(grpcService, (global as any).GCLOUD_SANDBOX_ENV);
      delete (global as any).GCLOUD_SANDBOX_ENV;
    });
  });

  describe('decodeValue_', function() {
    it('should decode a struct value', function() {
      const structValue = {
        kind: 'structValue',
        structValue: {},
      };

      const decodedValue = {};

      GrpcService.structToObj_ = function() {
        return decodedValue;
      };

      assert.strictEqual(GrpcService.decodeValue_(structValue), decodedValue);
    });

    it('should decode a null value', function() {
      const nullValue = {
        kind: 'nullValue',
      };

      const decodedValue = null;

      assert.strictEqual(GrpcService.decodeValue_(nullValue), decodedValue);
    });

    it('should decode a list value', function() {
      const listValue = {
        kind: 'listValue',
        listValue: {
          values: [
            {
              kind: 'nullValue',
            },
          ],
        },
      };

      assert.deepEqual(GrpcService.decodeValue_(listValue), [null]);
    });

    it('should return the raw value', function() {
      const numberValue = {
        kind: 'numberValue',
        numberValue: 8,
      };

      assert.strictEqual(GrpcService.decodeValue_(numberValue), 8);
    });
  });

  describe('objToStruct_', function() {
    it('should convert the object using ObjectToStructConverter', function() {
      const options = {};
      const obj = {};

      const convertedObject = {};

      GrpcService.ObjectToStructConverter = function(options_) {
        assert.strictEqual(options_, options);

        return {
          convert: function(obj_) {
            assert.strictEqual(obj_, obj);
            return convertedObject;
          },
        };
      };

      assert.strictEqual(
        GrpcService.objToStruct_(obj, options),
        convertedObject
      );
    });
  });

  describe('structToObj_', function() {
    it('should convert a struct to an object', function() {
      const inputValue = {};
      const decodedValue = {};

      const struct = {
        fields: {
          a: inputValue,
        },
      };

      GrpcService.decodeValue_ = function(value) {
        assert.strictEqual(value, inputValue);
        return decodedValue;
      };

      assert.deepEqual(GrpcService.structToObj_(struct), {
        a: decodedValue,
      });
    });
  });

  describe('request', function() {
    const PROTO_OPTS = {service: 'service', method: 'method', timeout: 3000};
    const REQ_OPTS = {reqOpts: true};
    const GRPC_CREDENTIALS = {};

    function ProtoService() {}
    ProtoService.prototype.method = function() {};

    beforeEach(function() {
      grpcService.grpcCredentials = GRPC_CREDENTIALS;

      grpcService.getService_ = function() {
        return ProtoService;
      };
    });

    it('should not run in the gcloud sandbox environment', function() {
      (global as any).GCLOUD_SANDBOX_ENV = true;
      assert.strictEqual(grpcService.request(), (global as any).GCLOUD_SANDBOX_ENV);
      delete (global as any).GCLOUD_SANDBOX_ENV;
    });

    it('should access the specified service proto object', function(done) {
      retryRequestOverride = util.noop;

      grpcService.getService_ = function(protoOpts) {
        assert.strictEqual(protoOpts, PROTO_OPTS);
        setImmediate(done);
        return ProtoService;
      };

      grpcService.request(PROTO_OPTS, REQ_OPTS, assert.ifError);
    });

    it('should use and return retry-request', function() {
      const retryRequestInstance = {};

      retryRequestOverride = function() {
        return retryRequestInstance;
      };

      const request = grpcService.request(PROTO_OPTS, REQ_OPTS, assert.ifError);
      assert.strictEqual(request, retryRequestInstance);
    });

    describe('getting gRPC credentials', function() {
      beforeEach(function() {
        delete grpcService.grpcCredentials;
      });

      describe('getting credentials error', function() {
        const error = new Error('Error.');

        beforeEach(function() {
          grpcService.getGrpcCredentials_ = function(callback) {
            callback(error);
          };
        });

        it('should execute callback with error', function(done) {
          grpcService.request(PROTO_OPTS, REQ_OPTS, function(err) {
            assert.strictEqual(err, error);
            done();
          });
        });
      });

      describe('getting credentials success', function() {
        const authClient = {};

        beforeEach(function() {
          grpcService.getGrpcCredentials_ = function(callback) {
            callback(null, authClient);
          };
        });

        it('should make the gRPC request again', function(done) {
          grpcService.getService_ = function() {
            assert.strictEqual(grpcService.grpcCredentials, authClient);
            setImmediate(done);
            return new ProtoService();
          };

          grpcService.request(PROTO_OPTS, REQ_OPTS, assert.ifError);
        });
      });
    });

    describe('retry strategy', function() {
      let retryRequestReqOpts;
      let retryRequestOptions;
      let retryRequestCallback;

      beforeEach(function() {
        retryRequestOverride = function(reqOpts, options, callback) {
          retryRequestReqOpts = reqOpts;
          retryRequestOptions = options;
          retryRequestCallback = callback;
        };
      });

      it('should use retry-request', function(done) {
        const error = {};
        const response = {};

        grpcService.request(PROTO_OPTS, REQ_OPTS, function(err, resp) {
          assert.strictEqual(err, error);
          assert.strictEqual(resp, response);
          done();
        });

        assert.strictEqual(retryRequestReqOpts, null);
        assert.strictEqual(retryRequestOptions.retries, grpcService.maxRetries);
        assert.strictEqual(retryRequestOptions.currentRetryAttempt, 0);

        retryRequestCallback(error, response);
      });

      it('should retry on 429, 500, 502, and 503', function() {
        grpcService.request(PROTO_OPTS, REQ_OPTS, assert.ifError);

        const shouldRetryFn = retryRequestOptions.shouldRetryFn;

        const retryErrors = [{code: 429}, {code: 500}, {code: 502}, {code: 503}];

        const nonRetryErrors = [
          {code: 200},
          {code: 401},
          {code: 404},
          {code: 409},
          {code: 412},
        ];

        assert.strictEqual(retryErrors.every(shouldRetryFn), true);
        assert.strictEqual(nonRetryErrors.every(shouldRetryFn), false);
      });

      it('should treat a retriable error as an HTTP response', function(done) {
        const grpcError500 = {code: 2};

        grpcService.getService_ = function() {
          return {
            method: function(reqOpts, metadata, grpcOpts, callback) {
              callback(grpcError500);
            },
          };
        };

        grpcService.request(PROTO_OPTS, REQ_OPTS, assert.ifError);

        function onResponse(err, resp) {
          assert.strictEqual(err, null);
          assert.deepEqual(resp, GrpcService.GRPC_ERROR_CODE_TO_HTTP[2]);

          done();
        }

        retryRequestOptions.request({}, onResponse);
      });

      it('should return grpc request', function() {
        const grpcRequest = {};

        grpcService.getService_ = function() {
          return {
            method: function() {
              return grpcRequest;
            },
          };
        };

        grpcService.request(PROTO_OPTS, REQ_OPTS, assert.ifError);

        const request = retryRequestOptions.request();
        assert.strictEqual(request, grpcRequest);
      });

      it('should exec callback with response error as error', function(done) {
        const grpcError500 = {code: 2};

        grpcService.getService_ = function() {
          return {
            method: function(reqOpts, metadata, grpcOpts, callback) {
              callback(grpcError500);
            },
          };
        };

        grpcService.request(PROTO_OPTS, REQ_OPTS, function(err, resp) {
          assert.deepEqual(err, GrpcService.GRPC_ERROR_CODE_TO_HTTP[2]);
          assert.strictEqual(resp, null);
          done();
        });

        // When the gRPC error is passed to "onResponse", it will just invoke
        // the callback passed to retry-request. We will check if the grpc Error
        retryRequestOptions.request({}, retryRequestCallback);
      });

      it('should exec callback with unknown error', function(done) {
        const unknownError = {a: 'a'};

        grpcService.getService_ = function() {
          return {
            method: function(reqOpts, metadata, grpcOpts, callback) {
              callback(unknownError, null);
            },
          };
        };

        grpcService.request(PROTO_OPTS, REQ_OPTS, function(err, resp) {
          assert.strictEqual(err, unknownError);
          assert.strictEqual(resp, null);
          done();
        });

        // When the gRPC error is passed to "onResponse", it will just invoke
        // the callback passed to retry-request. We will check if the grpc Error
        retryRequestOptions.request({}, retryRequestCallback);
      });
    });

    describe('request option decoration', function() {
      describe('decoration success', function() {
        it('should decorate the request', function(done) {
          const decoratedRequest = {};

          grpcService.decorateRequest_ = function(reqOpts) {
            assert.deepEqual(reqOpts, REQ_OPTS);
            return decoratedRequest;
          };

          grpcService.getService_ = function() {
            return {
              method: function(reqOpts) {
                assert.strictEqual(reqOpts, decoratedRequest);
                done();
              },
            };
          };

          grpcService.request(PROTO_OPTS, REQ_OPTS, assert.ifError);
        });
      });

      describe('decoration error', function() {
        const error = new Error('Error.');

        it('should return a thrown error to the callback', function(done) {
          grpcService.decorateRequest_ = function() {
            throw error;
          };

          grpcService.request(PROTO_OPTS, REQ_OPTS, function(err) {
            assert.strictEqual(err, error);
            done();
          });
        });
      });
    });

    describe('retry request', function() {
      it('should make the correct request on the service', function(done) {
        grpcService.getService_ = function() {
          return {
            method: function(reqOpts) {
              assert.deepEqual(reqOpts, REQ_OPTS);
              done();
            },
          };
        };

        grpcService.request(PROTO_OPTS, REQ_OPTS, assert.ifError);
      });

      it('should pass the grpc metadata with the request', function(done) {
        grpcService.getService_ = function() {
          return {
            method: function(reqOpts, metadata) {
              assert.strictEqual(metadata, grpcService.grpcMetadata);
              done();
            },
          };
        };

        grpcService.request(PROTO_OPTS, REQ_OPTS, assert.ifError);
      });

      it('should set a deadline if a timeout is provided', function(done) {
        const expectedDeadlineRange = [
          Date.now() + PROTO_OPTS.timeout - 250,
          Date.now() + PROTO_OPTS.timeout + 250,
        ];

        grpcService.getService_ = function() {
          return {
            method: function(reqOpts, metadata, grpcOpts) {
              assert(is.date(grpcOpts.deadline));

              assert(grpcOpts.deadline.getTime() > expectedDeadlineRange[0]);
              assert(grpcOpts.deadline.getTime() < expectedDeadlineRange[1]);

              done();
            },
          };
        };

        grpcService.request(PROTO_OPTS, REQ_OPTS, assert.ifError);
      });

      describe('request response error', function() {
        it('should look up the http status from the code', function() {
          /*jshint loopfunc:true */
          for (const grpcErrorCode in GrpcService.GRPC_ERROR_CODE_TO_HTTP) {
            const grpcError = {code: grpcErrorCode};
            const httpError = GrpcService.GRPC_ERROR_CODE_TO_HTTP[grpcErrorCode];

            grpcService.getService_ = function() {
              return {
                method: function(reqOpts, metadata, grpcOpts, callback) {
                  callback(grpcError);
                },
              };
            };

            grpcService.request(PROTO_OPTS, REQ_OPTS, function(err) {
              assert.strictEqual(err.code, httpError.code);
            });
          }
          /*jshint loopfunc:false */
        });
      });

      describe('request response success', function() {
        const RESPONSE = {};

        beforeEach(function() {
          grpcService.getService_ = function() {
            return {
              method: function(reqOpts, metadata, grpcOpts, callback) {
                callback(null, RESPONSE);
              },
            };
          };
        });

        it('should execute callback with response', function(done) {
          grpcService.request(PROTO_OPTS, REQ_OPTS, function(err, resp) {
            assert.ifError(err);
            assert.strictEqual(resp, RESPONSE);
            done();
          });
        });
      });
    });
  });

  describe('requestStream', function() {
    let PROTO_OPTS;
    const REQ_OPTS = {};
    const GRPC_CREDENTIALS = {};
    let fakeStream;

    function ProtoService() {}

    beforeEach(function() {
      PROTO_OPTS = {service: 'service', method: 'method', timeout: 3000};
      ProtoService.prototype.method = function() {};

      grpcService.grpcCredentials = GRPC_CREDENTIALS;
      grpcService.baseUrl = 'http://base-url';
      grpcService.proto = {};
      grpcService.proto.service = ProtoService;

      grpcService.getService_ = function() {
        return new ProtoService();
      };

      fakeStream = through.obj();
      retryRequestOverride = function() {
        return fakeStream;
      };
    });

    afterEach(function() {
      retryRequestOverride = null;
    });

    it('should not run in the gcloud sandbox environment', function() {
      delete grpcService.grpcCredentials;

      grpcService.getGrpcCredentials_ = function() {
        throw new Error('Should not be called.');
      };

      (global as any).GCLOUD_SANDBOX_ENV = true;
      grpcService.requestStream();
      delete (global as any).GCLOUD_SANDBOX_ENV;
    });

    describe('getting gRPC credentials', function() {
      beforeEach(function() {
        delete grpcService.grpcCredentials;
      });

      describe('credentials error', function() {
        const error = new Error('err');

        beforeEach(function() {
          grpcService.getGrpcCredentials_ = function(callback) {
            callback(error);
          };
        });

        it('should execute callback with error', function(done) {
          grpcService
            .requestStream(PROTO_OPTS, REQ_OPTS)
            .on('error', function(err) {
              assert.strictEqual(err, error);
              done();
            });
        });
      });

      describe('credentials success', function() {
        const authClient = {};

        beforeEach(function() {
          grpcService.getGrpcCredentials_ = function(callback) {
            callback(null, authClient);
          };
        });

        it('should make the gRPC request again', function(done) {
          grpcService.getService_ = function() {
            assert.strictEqual(grpcService.grpcCredentials, authClient);
            setImmediate(done);
            return new ProtoService();
          };

          grpcService.requestStream(PROTO_OPTS, REQ_OPTS).on('error', done);
        });
      });
    });

    it('should get the proto service', function(done) {
      grpcService.getService_ = function(protoOpts) {
        assert.strictEqual(protoOpts, PROTO_OPTS);
        setImmediate(done);
        return new ProtoService();
      };

      grpcService.requestStream(PROTO_OPTS, REQ_OPTS, assert.ifError);
    });

    it('should set the deadline', function(done) {
      const createDeadline = GrpcService.createDeadline_;
      const fakeDeadline = createDeadline(PROTO_OPTS.timeout);

      GrpcService.createDeadline_ = function(timeout) {
        assert.strictEqual(timeout, PROTO_OPTS.timeout);
        return fakeDeadline;
      };

      ProtoService.prototype.method = function(reqOpts, metadata, grpcOpts) {
        assert.strictEqual(grpcOpts.deadline, fakeDeadline);

        GrpcService.createDeadline_ = createDeadline;
        setImmediate(done);

        return through.obj();
      };

      retryRequestOverride = function(_, retryOpts) {
        return retryOpts.request();
      };

      grpcService.requestStream(PROTO_OPTS, REQ_OPTS);
    });

    it('should pass the grpc metadata with the request', function(done) {
      ProtoService.prototype.method = function(reqOpts, metadata) {
        assert.strictEqual(metadata, grpcService.grpcMetadata);
        setImmediate(done);
        return through.obj();
      };

      retryRequestOverride = function(_, retryOpts) {
        return retryOpts.request();
      };

      grpcService.requestStream(PROTO_OPTS, REQ_OPTS);
    });

    describe('request option decoration', function() {
      beforeEach(function() {
        ProtoService.prototype.method = function() {
          return through.obj();
        };

        retryRequestOverride = function(reqOpts, options) {
          return options.request();
        };
      });

      describe('requestStream() success', function() {
        it('should decorate the request', function(done) {
          const decoratedRequest = {};

          grpcService.decorateRequest_ = function(reqOpts) {
            assert.strictEqual(reqOpts, REQ_OPTS);
            return decoratedRequest;
          };

          ProtoService.prototype.method = function(reqOpts) {
            assert.strictEqual(reqOpts, decoratedRequest);
            setImmediate(done);
            return through.obj();
          };

          grpcService
            .requestStream(PROTO_OPTS, REQ_OPTS)
            .on('error', assert.ifError);
        });
      });

      describe('requestStream() error', function() {
        it('should end stream with a thrown error', function(done) {
          const error = new Error('Error.');

          grpcService.decorateRequest_ = function() {
            throw error;
          };

          grpcService
            .requestStream(PROTO_OPTS, REQ_OPTS)
            .on('error', function(err) {
              assert.strictEqual(err, error);
              done();
            });
        });
      });
    });

    describe('retry strategy', function() {
      let retryRequestReqOpts;
      let retryRequestOptions;
      let retryStream;

      beforeEach(function() {
        retryRequestReqOpts = retryRequestOptions = null;
        retryStream = through.obj();

        retryRequestOverride = function(reqOpts, options) {
          retryRequestReqOpts = reqOpts;
          retryRequestOptions = options;
          return retryStream;
        };
      });

      afterEach(function() {
        retryRequestOverride = null;
      });

      it('should use retry-request', function() {
        const reqOpts = extend(
          {
            objectMode: true,
          },
          REQ_OPTS
        );

        grpcService.requestStream(PROTO_OPTS, reqOpts);

        assert.strictEqual(retryRequestReqOpts, null);
        assert.strictEqual(retryRequestOptions.retries, grpcService.maxRetries);
        assert.strictEqual(retryRequestOptions.currentRetryAttempt, 0);
        assert.strictEqual(retryRequestOptions.objectMode, true);
        assert.strictEqual(
          retryRequestOptions.shouldRetryFn,
          GrpcService.shouldRetryRequest_
        );
      });

      it('should emit the metadata event as a response event', function(done) {
        const fakeStream = through.obj();

        ProtoService.prototype.method = function() {
          return fakeStream;
        };

        retryRequestOverride = function(reqOpts, options) {
          return options.request();
        };

        fakeStream.on('error', done).on('response', function(resp) {
          assert.deepEqual(resp, GrpcService.GRPC_ERROR_CODE_TO_HTTP[0]);
          done();
        });

        grpcService.requestStream(PROTO_OPTS, REQ_OPTS);
        fakeStream.emit('metadata');
      });

      it('should forward `request` events', function(done) {
        const requestStream = grpcService.requestStream(PROTO_OPTS, REQ_OPTS);

        requestStream.on('request', function() {
          done();
        });

        retryStream.emit('request');
      });

      it('should emit the response error', function(done) {
        const grpcError500 = {code: 2};
        const requestStream = grpcService.requestStream(PROTO_OPTS, REQ_OPTS);

        requestStream.destroy = function(err) {
          assert.deepEqual(err, GrpcService.GRPC_ERROR_CODE_TO_HTTP[2]);
          done();
        };

        retryStream.emit('error', grpcError500);
      });
    });
  });

  describe('requestWritableStream', function() {
    let PROTO_OPTS;
    const REQ_OPTS = {};
    const GRPC_CREDENTIALS = {};

    function ProtoService() {}

    beforeEach(function() {
      PROTO_OPTS = {service: 'service', method: 'method', timeout: 3000};
      ProtoService.prototype.method = function() {};

      grpcService.grpcCredentials = GRPC_CREDENTIALS;
      grpcService.baseUrl = 'http://base-url';
      grpcService.proto = {};
      grpcService.proto.service = ProtoService;

      grpcService.getService_ = function() {
        return new ProtoService();
      };
    });

    it('should not run in the gcloud sandbox environment', function() {
      delete grpcService.grpcCredentials;

      grpcService.getGrpcCredentials_ = function() {
        throw new Error('Should not be called.');
      };

      (global as any).GCLOUD_SANDBOX_ENV = true;
      grpcService.requestWritableStream({});

      delete (global as any).GCLOUD_SANDBOX_ENV;
    });

    it('should get the proto service', function(done) {
      ProtoService.prototype.method = function() {
        return (duplexify as any).obj();
      };
      grpcService.getService_ = function(protoOpts) {
        assert.strictEqual(protoOpts, PROTO_OPTS);
        setImmediate(done);
        return new ProtoService();
      };

      grpcService.requestWritableStream(PROTO_OPTS, REQ_OPTS);
    });

    it('should set the deadline', function(done) {
      const createDeadline = GrpcService.createDeadline_;
      const fakeDeadline = createDeadline(PROTO_OPTS.timeout);

      GrpcService.createDeadline_ = function(timeout) {
        assert.strictEqual(timeout, PROTO_OPTS.timeout);
        return fakeDeadline;
      };

      ProtoService.prototype.method = function(reqOpts, metadata, grpcOpts) {
        assert.strictEqual(grpcOpts.deadline, fakeDeadline);

        GrpcService.createDeadline_ = createDeadline;
        setImmediate(done);

        return through.obj();
      };

      retryRequestOverride = function(_, retryOpts) {
        return retryOpts.request();
      };

      grpcService.requestWritableStream(PROTO_OPTS, REQ_OPTS);
    });

    it('should pass the grpc metadata with the request', function(done) {
      ProtoService.prototype.method = function(reqOpts, metadata) {
        assert.strictEqual(metadata, grpcService.grpcMetadata);
        setImmediate(done);
        return through.obj();
      };

      retryRequestOverride = function(_, retryOpts) {
        return retryOpts.request();
      };

      grpcService.requestWritableStream(PROTO_OPTS, REQ_OPTS);
    });

    describe('getting gRPC credentials', function() {
      beforeEach(function() {
        delete grpcService.grpcCredentials;
      });

      describe('grpcCredentials error', function() {
        const error = new Error('err');

        beforeEach(function() {
          grpcService.getGrpcCredentials_ = function(callback) {
            setImmediate(function() {
              callback(error);
            });
          };
        });

        it('should execute callback with error', function(done) {
          grpcService
            .requestWritableStream(PROTO_OPTS, REQ_OPTS)
            .on('error', function(err) {
              assert.strictEqual(err, error);
              done();
            });
        });
      });

      describe('grpcCredentials success', function() {
        const authClient = {};

        beforeEach(function() {
          grpcService.getGrpcCredentials_ = function(callback) {
            callback(null, authClient);
          };
        });

        it('should make the gRPC request again', function(done) {
          const stream = (duplexify as any).obj();
          ProtoService.prototype.method = function() {
            return stream;
          };
          grpcService.getService_ = function() {
            assert.strictEqual(grpcService.grpcCredentials, authClient);
            setImmediate(done);
            return new ProtoService();
          };

          grpcService.requestWritableStream(PROTO_OPTS, REQ_OPTS);
        });
      });
    });

    describe('request option decoration', function() {
      beforeEach(function() {
        ProtoService.prototype.method = function() {
          return through.obj();
        };

        retryRequestOverride = function(reqOpts, options) {
          return options.request();
        };
      });

      describe('requestWritableStream() success', function() {
        it('should decorate the request', function(done) {
          const decoratedRequest = {};

          grpcService.decorateRequest_ = function(reqOpts) {
            assert.strictEqual(reqOpts, REQ_OPTS);
            return decoratedRequest;
          };

          ProtoService.prototype.method = function(reqOpts) {
            assert.strictEqual(reqOpts, decoratedRequest);
            setImmediate(done);
            return through.obj();
          };

          grpcService.requestWritableStream(PROTO_OPTS, REQ_OPTS);
        });
      });

      describe('requestWritableStream() error', function() {
        const error = new Error('Error.');

        it('should end stream with a thrown error', function(done) {
          grpcService.decorateRequest_ = function() {
            throw error;
          };

          grpcService
            .requestWritableStream(PROTO_OPTS, REQ_OPTS)
            .on('error', function(err) {
              assert.strictEqual(err, error);
              done();
            });
        });
      });
    });

    describe('stream success', function() {
      const authClient = {};

      beforeEach(function() {
        delete grpcService.grpcCredentials;
        grpcService.getGrpcCredentials_ = function(callback) {
          callback(null, authClient);
        };
        sinon.spy(GrpcService, 'decorateStatus_');
      });

      it('should emit response', function(done) {
        const stream = (duplexify as any).obj();
        ProtoService.prototype.method = function() {
          return stream;
        };
        grpcService.getService_ = function() {
          assert.strictEqual(grpcService.grpcCredentials, authClient);
          return new ProtoService();
        };

        grpcService
          .requestWritableStream(PROTO_OPTS, REQ_OPTS)
          .on('response', function(status) {
            assert.equal(status, 'foo');
            assert.equal(GrpcService.decorateStatus_.callCount, 1);
            assert(GrpcService.decorateStatus_.calledWith('foo'));
            GrpcService.decorateStatus_.restore();
            done();
          })
          .on('error', done);

        setImmediate(function() {
          stream.emit('status', 'foo');
        });
      });
    });

    describe('stream error', function() {
      const authClient = {};

      beforeEach(function() {
        delete grpcService.grpcCredentials;
        grpcService.getGrpcCredentials_ = function(callback) {
          callback(null, authClient);
        };
      });

      it('should emit a decorated error', function(done) {
        const grpcStream = (duplexify as any).obj();
        ProtoService.prototype.method = function() {
          return grpcStream;
        };
        grpcService.getService_ = function() {
          assert.strictEqual(grpcService.grpcCredentials, authClient);
          return new ProtoService();
        };

        const error = new Error('Error.');
        const expectedDecoratedError = new Error('Decorated error.');

        sinon.stub(GrpcService, 'decorateError_').callsFake(function() {
          return expectedDecoratedError;
        });

        const stream = grpcService.requestWritableStream(PROTO_OPTS, REQ_OPTS);

        stream.on('error', function(err) {
          assert.strictEqual(err, expectedDecoratedError);
          assert.equal(GrpcService.decorateError_.callCount, 1);
          assert(GrpcService.decorateError_.calledWith(error));
          GrpcService.decorateError_.restore();
          done();
        });

        setImmediate(function() {
          grpcStream.emit('error', error);
        });
      });

      it('should emit the original error', function(done) {
        const grpcStream = (duplexify as any).obj();
        ProtoService.prototype.method = function() {
          return grpcStream;
        };
        grpcService.getService_ = function() {
          assert.strictEqual(grpcService.grpcCredentials, authClient);
          return new ProtoService();
        };

        const error = new Error('Error.');

        sinon.stub(GrpcService, 'decorateError_').callsFake(function() {
          return null;
        });

        const stream = grpcService.requestWritableStream(PROTO_OPTS, REQ_OPTS);

        stream.on('error', function(err) {
          assert.strictEqual(err, error);
          assert.equal(GrpcService.decorateError_.callCount, 1);
          assert(GrpcService.decorateError_.calledWith(error));
          GrpcService.decorateError_.restore();
          done();
        });

        setImmediate(function() {
          grpcStream.emit('error', error);
        });
      });
    });
  });

  describe('encodeValue_', function() {
    it('should encode value using ObjectToStructConverter fn', function() {
      const obj = {};

      const convertedObject = {};

      GrpcService.ObjectToStructConverter = function() {
        return {
          encodeValue_: function(obj_) {
            assert.strictEqual(obj_, obj);
            return convertedObject;
          },
        };
      };

      assert.strictEqual(GrpcService.encodeValue_(obj), convertedObject);
    });
  });

  describe('createDeadline_', function() {
    const nowTimestamp = Date.now();
    let now;

    before(function() {
      now = Date.now;

      Date.now = function() {
        return nowTimestamp;
      };
    });

    after(function() {
      Date.now = now;
    });

    it('should create a deadline', function() {
      const timeout = 3000;
      const deadline = GrpcService.createDeadline_(timeout);

      assert.strictEqual(deadline.getTime(), nowTimestamp + timeout);
    });
  });

  describe('decorateError_', function() {
    const expectedDecoratedError = new Error('err.');

    beforeEach(function() {
      sinon.stub(GrpcService, 'decorateGrpcResponse_').callsFake(function() {
        return expectedDecoratedError;
      });
    });

    it('should decorate an Error object', function() {
      const grpcError = new Error('Hello');
      (grpcError as any).code = 2;

      const decoratedError = GrpcService.decorateError_(grpcError);
      const decorateArgs = GrpcService.decorateGrpcResponse_.getCall(0).args;

      assert.strictEqual(decoratedError, expectedDecoratedError);
      assert.strictEqual(decorateArgs[0] instanceof Error, true);
      assert.strictEqual(decorateArgs[1], grpcError);
    });

    it('should decorate a plain object', function() {
      const grpcMessage = {code: 2};

      const decoratedError = GrpcService.decorateError_(grpcMessage);
      const decorateArgs = GrpcService.decorateGrpcResponse_.getCall(0).args;

      assert.strictEqual(decoratedError, expectedDecoratedError);
      assert.deepEqual(decorateArgs[0], {});
      assert.strictEqual(decorateArgs[0] instanceof Error, false);
      assert.strictEqual(decorateArgs[1], grpcMessage);
    });
  });

  describe('decorateGrpcResponse_', function() {
    it('should retrieve the HTTP code from the gRPC error map', function() {
      const errorMap = GrpcService.GRPC_ERROR_CODE_TO_HTTP;
      const codes = Object.keys(errorMap);

      codes.forEach(function(code) {
        const error = new Error();
        const extended = GrpcService.decorateGrpcResponse_(error, {code: code});

        assert.notStrictEqual(extended, errorMap[code]);
        assert.deepEqual(extended, errorMap[code]);
        assert.strictEqual(error, extended);
      });
    });

    it('should use the message from the error', function() {
      const errorMessage = 'This is an error message.';

      const err = {
        code: 1,
        message: errorMessage,
      };

      const error = new Error();
      const extended = GrpcService.decorateGrpcResponse_(error, err);

      assert.strictEqual(extended.message, errorMessage);
    });

    it('should use a stringified JSON message from the error', function() {
      const errorMessage = 'This is an error message.';

      const err = {
        code: 1,
        message: JSON.stringify({
          description: errorMessage,
        }),
      };

      const error = new Error();
      const extended = GrpcService.decorateGrpcResponse_(error, err);

      assert.strictEqual(extended.message, errorMessage);
    });

    it('should return null for unknown errors', function() {
      const error = new Error();
      const extended = GrpcService.decorateGrpcResponse_(error, {code: 9999});

      assert.strictEqual(extended, null);
    });
  });

  describe('decorateStatus_', function() {
    const fakeStatus = {status: 'a'};

    beforeEach(function() {
      sinon.stub(GrpcService, 'decorateGrpcResponse_').callsFake(function() {
        return fakeStatus;
      });
    });

    it('should call decorateGrpcResponse_ with an object', function() {
      const grpcStatus = {code: 2};

      const status = GrpcService.decorateStatus_(grpcStatus);
      const args = GrpcService.decorateGrpcResponse_.getCall(0).args;

      assert.strictEqual(status, fakeStatus);
      assert.deepEqual(args[0], {});
      assert.strictEqual(args[1], grpcStatus);
    });
  });

  describe('shouldRetryRequest_', function() {
    it('should retry on 429, 500, 502, and 503', function() {
      const shouldRetryFn = GrpcService.shouldRetryRequest_;

      const retryErrors = [{code: 429}, {code: 500}, {code: 502}, {code: 503}];

      const nonRetryErrors = [
        {code: 200},
        {code: 401},
        {code: 404},
        {code: 409},
        {code: 412},
      ];

      assert.strictEqual(retryErrors.every(shouldRetryFn), true);
      assert.strictEqual(nonRetryErrors.every(shouldRetryFn), false);
    });
  });

  describe('decorateRequest_', function() {
    it('should delete custom API values without modifying object', function() {
      const reqOpts = {
        autoPaginate: true,
        autoPaginateVal: true,
        objectMode: true,
      };

      const originalReqOpts = extend({}, reqOpts);

      assert.deepEqual(grpcService.decorateRequest_(reqOpts), {});
      assert.deepEqual(reqOpts, originalReqOpts);
    });

    it('should execute and return replaceProjectIdToken', function() {
      const reqOpts = {
        a: 'b',
        c: 'd',
      };

      const replacedReqOpts = {};

      fakeUtil.replaceProjectIdToken = function(reqOpts_, projectId) {
        assert.deepEqual(reqOpts_, reqOpts);
        assert.strictEqual(projectId, grpcService.projectId);
        return replacedReqOpts;
      };

      assert.strictEqual(
        grpcService.decorateRequest_(reqOpts),
        replacedReqOpts
      );
    });
  });

  describe('getGrpcCredentials_', function() {
    it('should get credentials from the auth client', function(done) {
      grpcService.authClient = {
        getAuthClient: function() {
          done();
        },
      };

      grpcService.getGrpcCredentials_(assert.ifError);
    });

    describe('credential fetching error', function() {
      const error = new Error('Error.');

      beforeEach(function() {
        grpcService.authClient = {
          getAuthClient: function(callback) {
            callback(error);
          },
        };
      });

      it('should execute callback with error', function(done) {
        grpcService.getGrpcCredentials_(function(err) {
          assert.strictEqual(err, error);
          done();
        });
      });
    });

    describe('credential fetching success', function() {
      const AUTH_CLIENT = {
        projectId: 'project-id',
      };

      beforeEach(function() {
        grpcService.authClient = {
          getAuthClient: function(callback) {
            grpcService.authClient = AUTH_CLIENT;
            callback(null, AUTH_CLIENT);
          },
        };
      });

      it('should return grpcCredentials', function(done) {
        grpcService.getGrpcCredentials_(function(err, grpcCredentials) {
          assert.ifError(err);

          assert.strictEqual(grpcCredentials.name, 'combineChannelCredentials');

          const createSslArg = grpcCredentials.args[0];
          assert.strictEqual(createSslArg.name, 'createSsl');
          assert.deepEqual(createSslArg.args.length, 0);

          const createFromGoogleCredentialArg = grpcCredentials.args[1];
          assert.strictEqual(
            createFromGoogleCredentialArg.name,
            'createFromGoogleCredential'
          );
          assert.strictEqual(
            createFromGoogleCredentialArg.args[0],
            AUTH_CLIENT
          );

          done();
        });
      });

      it('should set projectId', function(done) {
        grpcService.getGrpcCredentials_(function(err) {
          assert.ifError(err);
          assert.strictEqual(grpcService.projectId, AUTH_CLIENT.projectId);
          done();
        });
      });

      it('should not change projectId that was already set', function(done) {
        grpcService.projectId = 'project-id';

        grpcService.getGrpcCredentials_(function(err) {
          assert.ifError(err);
          assert.strictEqual(grpcService.projectId, AUTH_CLIENT.projectId);
          done();
        });
      });

      it('should change placeholder projectId', function(done) {
        grpcService.projectId = '{{projectId}}';

        grpcService.getGrpcCredentials_(function(err) {
          assert.ifError(err);
          assert.strictEqual(grpcService.projectId, AUTH_CLIENT.projectId);
          done();
        });
      });

      it('should not update projectId if it was not found', function(done) {
        grpcService.projectId = 'project-id';

        grpcService.authClient = {
          getAuthClient: function(callback) {
            callback(null, {
              projectId: undefined,
            });
          },
        };

        grpcService.getGrpcCredentials_(function(err) {
          assert.ifError(err);
          assert.strictEqual(grpcService.projectId, grpcService.projectId);
          done();
        });
      });
    });
  });

  describe('loadProtoFile_', function() {
    const fakeServices = {
      google: {
        FakeService: {},
      },
    };

    it('should load a proto file', function() {
      const fakeProtoConfig = {
        path: '/root/dir/path',
        service: 'FakeService',
      };

      const fakeMainConfig = {
        protosDir: ROOT_DIR,
      };

      grpcLoadOverride = function(pathOpts, type, grpOpts) {
        assert.strictEqual(pathOpts.root, fakeMainConfig.protosDir);
        assert.strictEqual(pathOpts.file, fakeProtoConfig.path);
        assert.strictEqual(type, 'proto');

        assert.deepEqual(grpOpts, {
          binaryAsBase64: true,
          convertFieldsToCamelCase: true,
        });

        return fakeServices;
      };

      const service = grpcService.loadProtoFile_(fakeProtoConfig, fakeMainConfig);
      assert.strictEqual(service, fakeServices.google.FakeService);
    });

    it('should cache the expensive proto object creation', function() {
      const protoConfig = {
        path: '/root/dir/path',
        service: 'FakeService',
      };

      const mainConfig = {
        service: 'OtherFakeService',
        apiVersion: 'v2',
      };

      let gprcLoadCalled = 0;
      grpcLoadOverride = function() {
        gprcLoadCalled++;
        return fakeServices;
      };

      const service1 = grpcService.loadProtoFile_(protoConfig, mainConfig);
      const service2 = grpcService.loadProtoFile_(protoConfig, mainConfig);
      assert.strictEqual(service1, service2);
      assert.strictEqual(gprcLoadCalled, 1);
    });

    it('should return the services object if invalid version', function() {
      const fakeProtoConfig = {
        path: '/root/dir/path',
        service: 'FakeService',
        apiVersion: null,
      };

      const fakeMainConfig = {
        service: 'OtherFakeService',
        apiVersion: 'v2',
      };

      grpcLoadOverride = function() {
        return fakeServices;
      };

      const service = grpcService.loadProtoFile_(fakeProtoConfig, fakeMainConfig);
      assert.strictEqual(service, fakeServices.google.FakeService);
    });
  });

  describe('getService_', function() {
    it('should get a new service instance', function() {
      const fakeService = {};

      grpcService.protos = {
        Service: {
          Service: function(baseUrl, grpcCredentials, userAgent) {
            assert.strictEqual(baseUrl, grpcService.baseUrl);
            assert.strictEqual(grpcCredentials, grpcService.grpcCredentials);
            assert.deepEqual(
              userAgent,
              extend(
                {
                  'grpc.primary_user_agent': grpcService.userAgent,
                },
                GrpcService.GRPC_SERVICE_OPTIONS
              )
            );

            return fakeService;
          },
        },
      };

      const service = grpcService.getService_({service: 'Service'});
      assert.strictEqual(service, fakeService);

      const cachedService = grpcService.activeServiceMap_.get('Service');
      assert.strictEqual(cachedService, fakeService);
    });

    it('should return the cached version of a service', function() {
      const fakeService = {};

      grpcService.protos = {
        Service: {
          Service: function() {
            throw new Error('should not be called');
          },
        },
      };

      grpcService.activeServiceMap_.set('Service', fakeService);

      const service = grpcService.getService_({service: 'Service'});
      assert.strictEqual(service, fakeService);

      const cachedService = grpcService.activeServiceMap_.get('Service');
      assert.strictEqual(cachedService, fakeService);
    });

    it('should use the baseUrl override if applicable', function() {
      const fakeBaseUrl = 'a.googleapis.com';
      const fakeService = {};

      grpcService.protos = {
        Service: {
          baseUrl: fakeBaseUrl,
          Service: function(baseUrl) {
            assert.strictEqual(baseUrl, fakeBaseUrl);
            return fakeService;
          },
        },
      };

      const service = grpcService.getService_({service: 'Service'});
      assert.strictEqual(service, fakeService);
    });
  });

  describe('ObjectToStructConverter', function() {
    let objectToStructConverter;

    beforeEach(function() {
      objectToStructConverter = new ObjectToStructConverter(OPTIONS);
    });

    describe('instantiation', function() {
      it('should not require an options object', function() {
        assert.doesNotThrow(function() {
          new ObjectToStructConverter();
        });
      });

      it('should localize an empty Set for seenObjects', function() {
        assert(objectToStructConverter.seenObjects instanceof Set);
        assert.strictEqual(objectToStructConverter.seenObjects.size, 0);
      });

      it('should localize options', function() {
        const objectToStructConverter = new ObjectToStructConverter({
          removeCircular: true,
          stringify: true,
        });

        assert.strictEqual(objectToStructConverter.removeCircular, true);
        assert.strictEqual(objectToStructConverter.stringify, true);
      });

      it('should set correct defaults', function() {
        assert.strictEqual(objectToStructConverter.removeCircular, false);
        assert.strictEqual(objectToStructConverter.stringify, false);
      });
    });

    describe('convert', function() {
      it('should encode values in an Object', function() {
        const inputValue = {};
        const convertedValue = {};

        objectToStructConverter.encodeValue_ = function(value) {
          assert.strictEqual(value, inputValue);
          return convertedValue;
        };

        const struct = objectToStructConverter.convert({
          a: inputValue,
        });

        assert.strictEqual(struct.fields.a, convertedValue);
      });

      it('should not include undefined values', function(done) {
        objectToStructConverter.encodeValue_ = function() {
          done(new Error('Should not be called'));
        };

        const struct = objectToStructConverter.convert({
          a: undefined,
        });

        assert.deepEqual(struct.fields, {});

        done();
      });

      it('should add seen objects to set then empty set', function(done) {
        const obj = {};
        let objectAdded;

        objectToStructConverter.seenObjects = {
          add: function(obj) {
            objectAdded = obj;
          },
          delete: function(obj_) {
            assert.strictEqual(obj_, obj);
            assert.strictEqual(objectAdded, obj);
            done();
          },
        };

        objectToStructConverter.convert(obj);
      });
    });

    describe('encodeValue_', function() {
      it('should convert primitive values correctly', function() {
        const buffer = Buffer.from('Value');

        assert.deepEqual(objectToStructConverter.encodeValue_(null), {
          nullValue: 0,
        });

        assert.deepEqual(objectToStructConverter.encodeValue_(1), {
          numberValue: 1,
        });

        assert.deepEqual(objectToStructConverter.encodeValue_('Hi'), {
          stringValue: 'Hi',
        });

        assert.deepEqual(objectToStructConverter.encodeValue_(true), {
          boolValue: true,
        });

        assert.strictEqual(
          objectToStructConverter.encodeValue_(buffer).blobValue.toString(),
          'Value'
        );
      });

      it('should convert arrays', function() {
        const convertedValue = objectToStructConverter.encodeValue_([1, 2, 3]);

        assert.deepEqual(convertedValue.listValue, {
          values: [
            objectToStructConverter.encodeValue_(1),
            objectToStructConverter.encodeValue_(2),
            objectToStructConverter.encodeValue_(3),
          ],
        });
      });

      it('should throw if a type is not recognized', function() {
        assert.throws(function() {
          objectToStructConverter.encodeValue_();
        }, 'Value of type undefined not recognized.');
      });

      describe('objects', function() {
        const VALUE: any = {};
        VALUE.circularReference = VALUE;

        it('should convert objects', function() {
          const convertedValue = {};

          objectToStructConverter.convert = function(value) {
            assert.strictEqual(value, VALUE);
            return convertedValue;
          };

          assert.deepStrictEqual(objectToStructConverter.encodeValue_(VALUE), {
            structValue: convertedValue,
          });
        });

        describe('circular references', function() {
          it('should throw if circular', function() {
            const errorMessage = [
              'This object contains a circular reference. To automatically',
              'remove it, set the `removeCircular` option to true.',
            ].join(' ');

            objectToStructConverter.seenObjects.add(VALUE);

            assert.throws(function() {
              objectToStructConverter.encodeValue_(VALUE);
            }, new RegExp(errorMessage));
          });

          describe('options.removeCircular', function() {
            let objectToStructConverter;

            beforeEach(function() {
              objectToStructConverter = new ObjectToStructConverter({
                removeCircular: true,
              });

              objectToStructConverter.seenObjects.add(VALUE);
            });

            it('should replace circular reference with [Circular]', function() {
              assert.deepStrictEqual(
                objectToStructConverter.encodeValue_(VALUE),
                {stringValue: '[Circular]'}
              );
            });
          });
        });
      });

      describe('options.stringify', function() {
        let objectToStructConverter;

        beforeEach(function() {
          objectToStructConverter = new ObjectToStructConverter({
            stringify: true,
          });
        });

        it('should return a string if the value is not recognized', function() {
          const date = new Date();

          assert.deepEqual(
            objectToStructConverter.encodeValue_(date, OPTIONS),
            {stringValue: String(date)}
          );
        });
      });
    });
  });
});
