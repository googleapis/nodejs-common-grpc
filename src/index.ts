/*!
 * Copyright 2017 Google Inc. All Rights Reserved.
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

import * as grpc from '@grpc/grpc-js';

import {GrpcOperation} from './operation';
import {GrpcService} from './service';
import {GrpcServiceObject} from './service-object';

// tslint:disable-next-line:variable-name
const Service = GrpcService;

// tslint:disable-next-line:variable-name
const ServiceObject = GrpcServiceObject;

// tslint:disable-next-line:variable-name
const Operation = GrpcOperation;

/*!
 * @module commonGrpc
 */

/**
 * @type {module:commonGrpc/operation}
 */
export {Operation};

/**
 * @type {module:commonGrpc/serviceObject}
 */
export {ServiceObject};

/**
 * @type {module:commonGrpc/service}
 */
export {Service};

/**
 * @type {module:commonGrpc/grpc}
 */
export {grpc};

/**
 * @type {module:common/util}
 * @private
 */
export {util} from '@google-cloud/common';
