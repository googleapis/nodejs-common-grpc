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

import {GrpcService} from './service';
import {GrpcServiceObject} from './service-object';

const Service = GrpcService;
const ServiceObject = GrpcServiceObject;

/*!
 * @module commonGrpc
 */

'use strict';

/**
 * @type {module:commonGrpc/operation}
 */
exports.Operation = require('./operation.js');

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
exports.grpc = require('grpc');
