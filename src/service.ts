/*!
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

/*!
 * @module commonGrpc/service
 */

'use strict';

import * as dotProp from 'dot-prop';
import * as duplexify from 'duplexify';
import * as extend from 'extend';
import * as is from 'is';
import * as retryRequest from 'retry-request';
import { Service, util } from '@google-cloud/common';
import * as through from 'through2';
import * as r from 'request';
import * as nodeutil from 'util';

const grpc = require('grpc');

/**
 * @const {object} - A cache of proto objects.
 * @private
 */
const protoObjectCache = {};

/**
 * @const {object} - A map of protobuf codes to HTTP status codes.
 * @private
 */
const GRPC_ERROR_CODE_TO_HTTP = {
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
};

/**
 * The default configuration for all gRPC Service instantions.
 *
 * @resource [All options]{@link https://github.com/grpc/grpc/blob/13e185419cd177b7fb552601665e43820321a96b/include/grpc/impl/codegen/grpc_types.h#L148}
 *
 * @private
 *
 * @type {object}
 */
const GRPC_SERVICE_OPTIONS = {
  // RE: https://github.com/GoogleCloudPlatform/google-cloud-node/issues/1991
  'grpc.max_send_message_length': -1, // unlimited
  'grpc.max_receive_message_length': -1, // unlimited

  // RE: https://github.com/grpc/grpc/issues/8839
  // RE: https://github.com/grpc/grpc/issues/8382
  // RE: https://github.com/GoogleCloudPlatform/google-cloud-node/issues/1991
  'grpc.initial_reconnect_backoff_ms': 5000,
};


export class ObjectToStructConverter {

  seenObjects: Set<{}>;
  removeCircular: boolean;
  stringify?: boolean;
  /**
   * A class that can be used to convert an object to a struct. Optionally this
   * class can be used to erase/throw on circular references during conversion.
   *
   * @private
   *
   * @param {object=} options - Configuration object.
   * @param {boolean} options.removeCircular - Remove circular references in the
   *     object with a placeholder string. (Default: `false`)
   * @param {boolean} options.stringify - Stringify un-recognized types. (Default:
   *     `false`)
   */
  constructor(options?) {
    options = options || {};

    this.seenObjects = new Set();
    this.removeCircular = options.removeCircular === true;
    this.stringify = options.stringify === true;
  }

  /**
   * Begin the conversion process from a JS object to an encoded gRPC Value
   * message.
   *
   * @param {*} value - The input value.
   * @return {object} - The encoded value.
   *
   * @example
   * ObjectToStructConverter.convert({
   *   aString: 'Hi'
   * });
   * // {
   * //   fields: {
   * //     aString: {
   * //       stringValue: 'Hello!'
   * //     }
   * //   }
   * // }
   */
  convert(obj) {
    const convertedObject = {
      fields: {},
    };

    this.seenObjects.add(obj);

    for (const prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        const value = obj[prop];

        if (is.undefined(value)) {
          continue;
        }

        convertedObject.fields[prop] = this.encodeValue_(value);
      }
    }

    this.seenObjects.delete(obj);

    return convertedObject;
  }

  /**
   * Convert a raw value to a type-denoted protobuf message-friendly object.
   *
   * @private
   *
   * @param {*} value - The input value.
   * @return {*} - The encoded value.
   *
   * @example
   * ObjectToStructConverter.encodeValue('Hi');
   * // {
   * //   stringValue: 'Hello!'
   * // }
   */
  encodeValue_(value) {
    let convertedValue;

    if (is.null(value)) {
      convertedValue = {
        nullValue: 0,
      };
    } else if (is.number(value)) {
      convertedValue = {
        numberValue: value,
      };
    } else if (is.string(value)) {
      convertedValue = {
        stringValue: value,
      };
    } else if (is.boolean(value)) {
      convertedValue = {
        boolValue: value,
      };
    } else if (Buffer.isBuffer(value)) {
      convertedValue = {
        blobValue: value,
      };
    } else if (is.object(value)) {
      if (this.seenObjects.has(value)) {
        // Circular reference.
        if (!this.removeCircular) {
          throw new Error(
            [
              'This object contains a circular reference. To automatically',
              'remove it, set the `removeCircular` option to true.',
            ].join(' ')
          );
        }
        convertedValue = {
          stringValue: '[Circular]',
        };
      } else {
        convertedValue = {
          structValue: this.convert(value),
        };
      }
    } else if (is.array(value)) {
      convertedValue = {
        listValue: {
          values: value.map(this.encodeValue_.bind(this)),
        },
      };
    } else {
      if (!this.stringify) {
        throw new Error('Value of type ' + typeof value + ' not recognized.');
      }

      convertedValue = {
        stringValue: String(value),
      };
    }

    return convertedValue;
  }
}

export class GrpcService extends Service {

  grpcCredentials?: {};
  grpcMetadata?: any;
  maxRetries?: number;
  userAgent?: string;
  activeServiceMap_ = new Map();
  protos = {};

  static GRPC_SERVICE_OPTIONS = GRPC_SERVICE_OPTIONS;
  static GRPC_ERROR_CODE_TO_HTTP = GRPC_ERROR_CODE_TO_HTTP;
  static ObjectToStructConverter = ObjectToStructConverter;

  /**
   * Service is a base class, meant to be inherited from by a "service," like
   * BigQuery or Storage.
   *
   * This handles making authenticated requests by exposing a `makeReq_` function.
   *
   * @constructor
   * @alias module:common/grpc-service
   *
   * @param {object} config - Configuration object.
   * @param {string} config.baseUrl - The base URL to make API requests to.
   * @param {object} config.grpcMetadata - Metadata to send with every request.
   * @param {string[]} config.scopes - The scopes required for the request.
   * @param {string} config.protosDir - The root directory where proto files live.
   * @param {object} config.protoServices - Directly provide the required proto
   *     files. This is useful when a single class requires multiple services.
   * @param {object} options - [Configuration object](#/docs/?method=gcloud).
   */
  constructor(config, options) {
    super(config, options);

    if (global['GCLOUD_SANDBOX_ENV']) {
      // gRPC has a tendency to cause our doc unit tests to fail, so we prevent
      // any calls to that library from going through.
      // Reference: https://github.com/GoogleCloudPlatform/google-cloud-node/pull/1137#issuecomment-193315047
      return global['GCLOUD_SANDBOX_ENV'];
    }

    if (config.customEndpoint) {
      this.grpcCredentials = grpc.credentials.createInsecure();
    }

    this.grpcMetadata = new grpc.Metadata();

    this.grpcMetadata.add(
      'x-goog-api-client',
      [
        'gl-node/' + process.versions.node,
        'gccl/' + config.packageJson.version,
        'grpc/' + require('grpc/package.json').version,
      ].join(' ')
    );

    if (config.grpcMetadata) {
      for (const prop in config.grpcMetadata) {
        if (config.grpcMetadata.hasOwnProperty(prop)) {
          this.grpcMetadata.add(prop, config.grpcMetadata[prop]);
        }
      }
    }

    this.maxRetries = options.maxRetries;
    this.userAgent = util.getUserAgentFromPackageJson(config.packageJson);

    this.activeServiceMap_ = new Map();
    this.protos = {};

    const protoServices = config.protoServices;

    const self = this;

    Object.keys(protoServices).forEach(name => {
      const protoConfig = protoServices[name];
      const service = this.loadProtoFile_(protoConfig, config);

      this.protos[name] = service;

      if (protoConfig.baseUrl) {
        service.baseUrl = protoConfig.baseUrl;
      }
    });
  }

  /**
   * Make an authenticated request with gRPC.
   *
   * @param {object} protoOpts - The proto options.
   * @param {string} protoOpts.service - The service name.
   * @param {string} protoOpts.method - The method name.
   * @param {number=} protoOpts.timeout - After how many milliseconds should the
   *     request cancel.
   * @param {object} reqOpts - The request options.
   * @param {function=} callback - The callback function.
   */
  // @ts-ignore
  request(protoOpts, reqOpts, callback) {
    if (global['GCLOUD_SANDBOX_ENV']) {
      return global['GCLOUD_SANDBOX_ENV'];
    }

    const self = this;

    if (!this.grpcCredentials) {
      // We must establish an authClient to give to grpc.
      this.getGrpcCredentials_((err, credentials) => {
        if (err) {
          callback(err);
          return;
        }

        this.grpcCredentials = credentials;
        this.request(protoOpts, reqOpts, callback);
      });

      return;
    }

    const service = this.getService_(protoOpts);
    const metadata = this.grpcMetadata;
    const grpcOpts: any = {};

    if (is.number(protoOpts.timeout)) {
      grpcOpts.deadline = GrpcService.createDeadline_(protoOpts.timeout);
    }

    try {
      reqOpts = this.decorateRequest_(reqOpts);
    } catch (e) {
      callback(e);
      return;
    }

    // Retains a reference to an error from the response. If the final callback is
    // executed with this as the "response", we return it to the user as an error.
    let respError;

    const retryOpts = extend(
      {
        retries: this.maxRetries,
        currentRetryAttempt: 0,
        shouldRetryFn: GrpcService.shouldRetryRequest_,

        // retry-request determines if it should retry from the incoming HTTP
        // response status. gRPC always returns an error proto message. We pass that
        // "error" into retry-request to act as the HTTP response, so it can use the
        // status code to determine if it should retry.
        request (_, onResponse) {
          respError = null;

          return service[protoOpts.method](reqOpts, metadata, grpcOpts, function (
            err,
            resp
          ) {
            if (err) {
              respError = GrpcService.decorateError_(err);

              if (respError) {
                onResponse(null, respError);
                return;
              }

              onResponse(err, resp);
              return;
            }

            onResponse(null, resp);
          });
        },
      },
      protoOpts.retryOpts
    );

    return retryRequest(null!, retryOpts, function (err, resp) {
      if (!err && resp === respError) {
        err = respError;
        resp = null!;
      }

      callback(err, resp);
    });
  }

  /**
   * Make an authenticated streaming request with gRPC.
   *
   * @param {object} protoOpts - The proto options.
   * @param {string} protoOpts.service - The service.
   * @param {string} protoOpts.method - The method name.
   * @param {number=} protoOpts.timeout - After how many milliseconds should the
   *     request cancel.
   * @param {object} reqOpts - The request options.
   */
  // @ts-ignore
  requestStream(protoOpts, reqOpts) {
    if (global['GCLOUD_SANDBOX_ENV']) {
      return through.obj();
    }

    const self = this;

    if (!protoOpts.stream) {
      protoOpts.stream = through.obj();
    }

    const stream = protoOpts.stream;

    if (!this.grpcCredentials) {
      // We must establish an authClient to give to grpc.
      this.getGrpcCredentials_(function (err, credentials) {
        if (err) {
          stream.destroy(err);
          return;
        }

        self.grpcCredentials = credentials;
        self.requestStream(protoOpts, reqOpts);
      });

      return stream;
    }

    const objectMode = !!reqOpts.objectMode;

    const service = this.getService_(protoOpts);
    const grpcMetadata = this.grpcMetadata;
    const grpcOpts: any = {};

    if (is.number(protoOpts.timeout)) {
      grpcOpts.deadline = GrpcService.createDeadline_(protoOpts.timeout);
    }

    try {
      reqOpts = this.decorateRequest_(reqOpts);
    } catch (e) {
      setImmediate(function () {
        stream.destroy(e);
      });
      return stream;
    }

    const retryOpts = extend(
      {
        retries: this.maxRetries,
        currentRetryAttempt: 0,
        objectMode,
        shouldRetryFn: GrpcService.shouldRetryRequest_,

        request () {
          return service[protoOpts.method](reqOpts, grpcMetadata, grpcOpts).on(
            'metadata',
            function () {
              // retry-request requires a server response before it starts emitting
              // data. The closest mechanism grpc provides is a metadata event, but
              // this does not provide any kind of response status. So we're faking
              // it here with code `0` which translates to HTTP 200.
              //
              // https://github.com/GoogleCloudPlatform/google-cloud-node/pull/1444#discussion_r71812636
              const grcpStatus = (GrpcService as any).decorateStatus_({ code: 0 });

              this.emit('response', grcpStatus);
            }
          );
        },
      },
      protoOpts.retryOpts
    );

    return (retryRequest(null!, retryOpts) as any)
      .on('error', err =>{
        const grpcError = GrpcService.decorateError_(err);
        stream.destroy(grpcError || err);
      })
      .on('request', stream.emit.bind(stream, 'request'))
      .pipe(stream);
  }

  /**
   * Make an authenticated writable streaming request with gRPC.
   *
   * @param {object} protoOpts - The proto options.
   * @param {string} protoOpts.service - The service.
   * @param {string} protoOpts.method - The method name.
   * @param {number=} protoOpts.timeout - After how many milliseconds should the
   *     request cancel.
   * @param {object} reqOpts - The request options.
   */
  requestWritableStream(protoOpts, reqOpts) {
    const stream = (protoOpts.stream = protoOpts.stream || (duplexify as any).obj());

    if (global['GCLOUD_SANDBOX_ENV']) {
      return stream;
    }

    const self = this;

    if (!this.grpcCredentials) {
      // We must establish an authClient to give to grpc.
      this.getGrpcCredentials_(function (err, credentials) {
        if (err) {
          stream.destroy(err);
          return;
        }

        self.grpcCredentials = credentials;
        self.requestWritableStream(protoOpts, reqOpts);
      });

      return stream;
    }

    const service = this.getService_(protoOpts);
    const grpcMetadata = this.grpcMetadata;
    const grpcOpts: any = {};

    if (is.number(protoOpts.timeout)) {
      grpcOpts.deadline = GrpcService.createDeadline_(protoOpts.timeout);
    }

    try {
      reqOpts = this.decorateRequest_(reqOpts);
    } catch (e) {
      setImmediate(function () {
        stream.destroy(e);
      });
      return stream;
    }

    const grpcStream = service[protoOpts.method](reqOpts, grpcMetadata, grpcOpts)
      .on('status', function (status) {
        const grcpStatus = GrpcService.decorateStatus_(status);
        stream.emit('response', grcpStatus || status);
      })
      .on('error', function (err) {
        const grpcError = GrpcService.decorateError_(err);
        stream.destroy(grpcError || err);
      });

    stream.setReadable(grpcStream);
    stream.setWritable(grpcStream);

    return stream;
  }

  /**
   * Decode a protobuf Struct's value.
   *
   * @private
   *
   * @param {object} value - A Struct's Field message.
   * @return {*} - The decoded value.
   */
  private static decodeValue_(value) {
    switch (value.kind) {
      case 'structValue': {
        return GrpcService.structToObj_(value.structValue);
      }

      case 'nullValue': {
        return null;
      }

      case 'listValue': {
        return value.listValue.values.map(GrpcService.decodeValue_);
      }

      default: {
        return value[value.kind];
      }
    }
  }

  /**
   * Convert a raw value to a type-denoted protobuf message-friendly object.
   *
   * @private
   *
   * @param {*} value - The input value.
   * @return {*} - The encoded value.
   *
   * @example
   * ObjectToStructConverter.encodeValue('Hi');
   * // {
   * //   stringValue: 'Hello!'
   * // }
   */
  private static encodeValue_(value) {
    return new GrpcService.ObjectToStructConverter().encodeValue_(value);
  }

  /**
   * Creates a deadline.
   *
   * @private
   *
   * @param {number} timeout - Timeout in miliseconds.
   * @return {date} deadline - The deadline in Date object form.
   */
  private static createDeadline_(timeout) {
    return new Date(Date.now() + timeout);
  }

  /**
   * Checks for a grpc status code and extends the error object with additional
   * information.
   *
   * @private
   *
   * @param {error|object} err - The grpc error.
   * @return {error|null}
   */
  private static decorateError_(err) {
    const errorObj = is.error(err) ? err : {};
    return GrpcService.decorateGrpcResponse_(errorObj, err);
  }

  /**
   * Checks for a grpc status code and extends the supplied object with additional
   * information.
   *
   * @private
   *
   * @param {object} obj - The object to be extended.
   * @param {object} response - The grpc response.
   * @return {object|null}
   */
  private static decorateGrpcResponse_(obj, response) {
    if (response && GRPC_ERROR_CODE_TO_HTTP[response.code]) {
      const defaultResponseDetails = GRPC_ERROR_CODE_TO_HTTP[response.code];
      let message = defaultResponseDetails.message;

      if (response.message) {
        // gRPC error messages can be either stringified JSON or strings.
        try {
          message = JSON.parse(response.message).description;
        } catch (e) {
          message = response.message;
        }
      }

      return extend(true, obj, response, {
        code: defaultResponseDetails.code,
        message,
      });
    }

    return null;
  }

  /**
   * Checks for grpc status code and extends the status object with additional
   * information
   *
   * @private
   * @param {object} status - The grpc status.
   * @return {object|null}
   */
  private static decorateStatus_(status) {
    return GrpcService.decorateGrpcResponse_({}, status);
  }

  /**
   * Function to decide whether or not a request retry could occur.
   *
   * @private
   *
   * @param {object} response - The request response.
   * @return {boolean} shouldRetry
   */
  private static shouldRetryRequest_(response) {
    return [429, 500, 502, 503].indexOf(response.code) > -1;
  }

  /**
   * Convert an object to a struct.
   *
   * @private
   *
   * @param {object} obj - An object to convert.
   * @param {object=} options - Configuration object.
   * @param {boolean} options.removeCircular - Remove circular references in the
   *     object with a placeholder string.
   * @param {boolean} options.stringify - Stringify un-recognized types.
   * @return {array} - The converted object.
   *
   * @example
   * GrpcService.objToStruct_({
   *   greeting: 'Hello!',
   *   favNumber: 7,
   *   friendIds: [
   *     1004,
   *     1006
   *   ],
   *   userDetails: {
   *     termsSigned: true
   *   }
   * });
   * // {
   * //   fields: {
   * //     greeting: {
   * //       stringValue: 'Hello!'
   * //     },
   * //     favNumber: {
   * //       numberValue: 7
   * //     },
   * //     friendIds: {
   * //       listValue: [
   * //         {
   * //           numberValue: 1004
   * //         },
   * //         {
   * //           numberValue: 1006
   * //         }
   * //       ]
   * //     },
   * //     userDetails: {
   * //       fields: {
   * //         termsSigned: {
   * //           booleanValue: true
   * //         }
   * //       }
   * //     }
   * //   }
   * // }
   */
  private static objToStruct_(obj, options) {
    return new GrpcService.ObjectToStructConverter(options).convert(obj);
  }

  /**
   * Condense a protobuf Struct into an object of only its values.
   *
   * @private
   *
   * @param {object} struct - A protobuf Struct message.
   * @return {object} - The simplified object.
   *
   * @example
   * GrpcService.structToObj_({
   *   fields: {
   *     name: {
   *       kind: 'stringValue',
   *       stringValue: 'Stephen'
   *     }
   *   }
   * });
   * // {
   * //   name: 'Stephen'
   * // }
   */
  private static structToObj_(struct) {
    const convertedObject = {};

    for (const prop in struct.fields) {
      if (struct.fields.hasOwnProperty(prop)) {
        const value = struct.fields[prop];
        convertedObject[prop] = GrpcService.decodeValue_(value);
      }
    }

    return convertedObject;
  }

  /**
   * Assign a projectId if one is specified to all request options.
   *
   * @param {object} reqOpts - The request options.
   * @return {object} - The decorated request object.
   */
  decorateRequest_(reqOpts) {
    reqOpts = extend({}, reqOpts);

    delete reqOpts.autoPaginate;
    delete reqOpts.autoPaginateVal;
    delete reqOpts.objectMode;

    return util.replaceProjectIdToken(reqOpts, this.projectId);
  }

  /**
   * To authorize requests through gRPC, we must get the raw google-auth-library
   * auth client object.
   *
   * @private
   *
   * @param {function} callback - The callback function.
   * @param {?error} callback.err - An error getting an auth client.
   */
  private getGrpcCredentials_(callback) {
    const self = this;

    this.authClient.getAuthClient(function (err, authClient) {
      if (err) {
        callback(err);
        return;
      }

      const credentials = grpc.credentials.combineChannelCredentials(
        grpc.credentials.createSsl(),
        grpc.credentials.createFromGoogleCredential(authClient)
      );

      if (!self.projectId || self.projectId === '{{projectId}}') {
        self.projectId = self.authClient.projectId;
      }

      callback(null, credentials);
    });
  }

  /**
   * Loads a proto file, useful when handling multiple proto files/services
   * within a single instance of GrpcService.
   *
   * @private
   *
   * @param {object} protoConfig - The proto specific configs for this file.
   * @param {object} config - The base config for the GrpcService.
   * @return {object} protoObject - The loaded proto object.
   */
  private loadProtoFile_(protoConfig, config) {
    const grpcOpts = {
      binaryAsBase64: true,
      convertFieldsToCamelCase: true,
    };

    if (is.string(protoConfig)) {
      protoConfig = {
        path: protoConfig,
      };
    }

    const protoObjectCacheKey = [
      config.protosDir,
      protoConfig.path,
      protoConfig.service,
    ].join('$');

    if (!protoObjectCache[protoObjectCacheKey]) {
      const services = grpc.load(
        {
          root: config.protosDir,
          file: protoConfig.path,
        },
        'proto',
        grpcOpts
      );
      const service = dotProp.get(services.google, protoConfig.service);
      protoObjectCache[protoObjectCacheKey] = service;
    }

    return protoObjectCache[protoObjectCacheKey];
  }

  /**
   * Retrieves the service object used to make the grpc requests.
   *
   * @private
   *
   * @param {object} protoOpts - The proto options.
   * @return {object} service - The proto service.
   */
  private getService_(protoOpts) {
    const proto = this.protos[protoOpts.service];
    let service = this.activeServiceMap_.get(protoOpts.service);

    if (!service) {
      service = new proto[protoOpts.service](
        proto.baseUrl || this.baseUrl,
        this.grpcCredentials,
        extend(
          {
            'grpc.primary_user_agent': this.userAgent,
          },
          GRPC_SERVICE_OPTIONS
        )
      );

      this.activeServiceMap_.set(protoOpts.service, service);
    }

    return service;
  }
}
